import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListResourcesRequestSchema,
  ListToolsRequestSchema,
  ReadResourceRequestSchema,
  CallToolResult,
  TextContent,
  ImageContent,
  Tool,
} from "@modelcontextprotocol/sdk/types.js";

// Browser service configuration
interface BrowserServiceConfig {
  browserlessToken?: string;
  scrapingbeeToken?: string;
  service: 'browserless' | 'scrapingbee';
}

// Define the tools adapted for external browser services
const TOOLS: Tool[] = [
  {
    name: "browser_navigate",
    description: "Navigate to a URL using external browser service",
    inputSchema: {
      type: "object",
      properties: {
        url: { type: "string", description: "URL to navigate to" },
        waitFor: { type: "string", description: "CSS selector to wait for before completing" },
        timeout: { type: "number", description: "Timeout in milliseconds (default: 30000)" },
      },
      required: ["url"],
    },
  },
  {
    name: "browser_screenshot",
    description: "Take a screenshot using external browser service",
    inputSchema: {
      type: "object",
      properties: {
        name: { type: "string", description: "Name for the screenshot" },
        url: { type: "string", description: "URL to screenshot (if not already navigated)" },
        selector: { type: "string", description: "CSS selector for element to screenshot" },
        width: { type: "number", description: "Viewport width (default: 1280)" },
        height: { type: "number", description: "Viewport height (default: 720)" },
        fullPage: { type: "boolean", description: "Take full page screenshot (default: false)" },
      },
      required: ["name"],
    },
  },
  {
    name: "browser_click",
    description: "Click an element using external browser service",
    inputSchema: {
      type: "object",
      properties: {
        url: { type: "string", description: "URL to navigate to first" },
        selector: { type: "string", description: "CSS selector for element to click" },
        waitFor: { type: "string", description: "CSS selector to wait for after click" },
      },
      required: ["selector"],
    },
  },
  {
    name: "browser_fill",
    description: "Fill out an input field using external browser service",
    inputSchema: {
      type: "object",
      properties: {
        url: { type: "string", description: "URL to navigate to first" },
        selector: { type: "string", description: "CSS selector for input field" },
        value: { type: "string", description: "Value to fill" },
      },
      required: ["selector", "value"],
    },
  },
  {
    name: "browser_evaluate",
    description: "Execute JavaScript using external browser service",
    inputSchema: {
      type: "object",
      properties: {
        url: { type: "string", description: "URL to navigate to first" },
        script: { type: "string", description: "JavaScript code to execute" },
        waitFor: { type: "string", description: "CSS selector to wait for before execution" },
      },
      required: ["script"],
    },
  },
  {
    name: "browser_extract_content",
    description: "Extract text content from page using external browser service",
    inputSchema: {
      type: "object",
      properties: {
        url: { type: "string", description: "URL to extract content from" },
        selector: { type: "string", description: "CSS selector for content to extract" },
        waitFor: { type: "string", description: "CSS selector to wait for before extraction" },
      },
      required: ["url"],
    },
  },
];

// Global state for Cloudflare Worker
let browserConfig: BrowserServiceConfig;
const consoleLogs: string[] = [];
const screenshots = new Map<string, string>();
let currentUrl: string | null = null;

// Browserless.io API client
class BrowserlessClient {
  private token: string;
  private baseUrl: string;

  constructor(token: string) {
    this.token = token;
    this.baseUrl = 'https://production-sfo.browserless.io';
  }

  async screenshot(options: {
    url?: string;
    selector?: string;
    viewport?: { width: number; height: number };
    fullPage?: boolean;
    html?: string;
  }): Promise<string> {
    const response = await fetch(`${this.baseUrl}/screenshot?token=${this.token}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        url: options.url,
        html: options.html,
        options: {
          selector: options.selector,
          viewport: options.viewport || { width: 1280, height: 720 },
          fullPage: options.fullPage || false,
          type: 'png',
          encoding: 'base64'
        }
      })
    });

    if (!response.ok) {
      throw new Error(`Screenshot failed: ${response.statusText}`);
    }

    return await response.text();
  }

  async execute(options: {
    url?: string;
    code: string;
    waitFor?: string;
  }): Promise<any> {
    const puppeteerScript = this.generatePuppeteerScript(options);
    
    const response = await fetch(`${this.baseUrl}/function?token=${this.token}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/javascript' },
      body: puppeteerScript
    });

    if (!response.ok) {
      throw new Error(`Execution failed: ${response.statusText}`);
    }

    return await response.json();
  }

  private generatePuppeteerScript(options: {
    url?: string;
    code: string;
    waitFor?: string;
  }): string {
    return `
      module.exports = async ({ page, context }) => {
        ${options.url ? `await page.goto('${options.url}');` : ''}
        ${options.waitFor ? `await page.waitForSelector('${options.waitFor}');` : ''}
        
        const result = await page.evaluate(() => {
          ${options.code}
        });
        
        return result;
      };
    `;
  }

  async click(options: {
    url?: string;
    selector: string;
    waitFor?: string;
  }): Promise<void> {
    const script = this.generatePuppeteerScript({
      url: options.url,
      waitFor: options.waitFor,
      code: `document.querySelector('${options.selector}').click();`
    });

    await this.execute({ code: script });
  }

  async fill(options: {
    url?: string;
    selector: string;
    value: string;
  }): Promise<void> {
    const script = this.generatePuppeteerScript({
      url: options.url,
      code: `
        const element = document.querySelector('${options.selector}');
        element.value = '${options.value}';
        element.dispatchEvent(new Event('input', { bubbles: true }));
      `
    });

    await this.execute({ code: script });
  }

  async extractContent(options: {
    url: string;
    selector?: string;
    waitFor?: string;
  }): Promise<string> {
    const result = await this.execute({
      url: options.url,
      waitFor: options.waitFor,
      code: options.selector 
        ? `document.querySelector('${options.selector}').innerText`
        : `document.body.innerText`
    });

    return result;
  }
}

// ScrapingBee API client
class ScrapingBeeClient {
  private token: string;
  private baseUrl: string;

  constructor(token: string) {
    this.token = token;
    this.baseUrl = 'https://app.scrapingbee.com/api/v1';
  }

  async screenshot(options: {
    url: string;
    selector?: string;
    viewport?: { width: number; height: number };
  }): Promise<string> {
    const params = new URLSearchParams({
      api_key: this.token,
      url: options.url,
      screenshot: 'true',
      screenshot_selector: options.selector || '',
      window_width: (options.viewport?.width || 1280).toString(),
      window_height: (options.viewport?.height || 720).toString(),
    });

    const response = await fetch(`${this.baseUrl}?${params}`);
    
    if (!response.ok) {
      throw new Error(`Screenshot failed: ${response.statusText}`);
    }

    const buffer = await response.arrayBuffer();
    return Buffer.from(buffer).toString('base64');
  }

  async extractContent(options: {
    url: string;
    selector?: string;
  }): Promise<string> {
    const params = new URLSearchParams({
      api_key: this.token,
      url: options.url,
      extract_rules: JSON.stringify({
        content: options.selector || 'body'
      })
    });

    const response = await fetch(`${this.baseUrl}?${params}`);
    
    if (!response.ok) {
      throw new Error(`Content extraction failed: ${response.statusText}`);
    }

    const result = await response.json();
    return result.content || '';
  }
}

// Initialize browser service client
function getBrowserClient(): BrowserlessClient | ScrapingBeeClient {
  if (browserConfig.service === 'browserless' && browserConfig.browserlessToken) {
    return new BrowserlessClient(browserConfig.browserlessToken);
  } else if (browserConfig.service === 'scrapingbee' && browserConfig.scrapingbeeToken) {
    return new ScrapingBeeClient(browserConfig.scrapingbeeToken);
  }
  throw new Error('Browser service not configured properly');
}

async function handleToolCall(name: string, args: any): Promise<CallToolResult> {
  const client = getBrowserClient();

  try {
    switch (name) {
      case "browser_navigate":
        currentUrl = args.url;
        // For navigation, we'll just store the URL for subsequent operations
        return {
          content: [{
            type: "text",
            text: `Ready to navigate to ${args.url}`,
          }],
          isError: false,
        };

      case "browser_screenshot": {
        const screenshot = await client.screenshot({
          url: args.url || currentUrl,
          selector: args.selector,
          viewport: { width: args.width || 1280, height: args.height || 720 },
          fullPage: args.fullPage
        });

        screenshots.set(args.name, screenshot);

        return {
          content: [
            {
              type: "text",
              text: `Screenshot '${args.name}' captured`,
            } as TextContent,
            {
              type: "image",
              data: screenshot,
              mimeType: "image/png",
            } as ImageContent,
          ],
          isError: false,
        };
      }

      case "browser_click":
        if (client instanceof BrowserlessClient) {
          await client.click({
            url: args.url || currentUrl,
            selector: args.selector,
            waitFor: args.waitFor
          });
        } else {
          throw new Error('Click operation not supported with ScrapingBee');
        }
        
        return {
          content: [{
            type: "text",
            text: `Clicked: ${args.selector}`,
          }],
          isError: false,
        };

      case "browser_fill":
        if (client instanceof BrowserlessClient) {
          await client.fill({
            url: args.url || currentUrl,
            selector: args.selector,
            value: args.value
          });
        } else {
          throw new Error('Fill operation not supported with ScrapingBee');
        }

        return {
          content: [{
            type: "text",
            text: `Filled ${args.selector} with: ${args.value}`,
          }],
          isError: false,
        };

      case "browser_evaluate":
        if (client instanceof BrowserlessClient) {
          const result = await client.execute({
            url: args.url || currentUrl,
            code: args.script,
            waitFor: args.waitFor
          });

          return {
            content: [{
              type: "text",
              text: `Execution result:\n${JSON.stringify(result, null, 2)}`,
            }],
            isError: false,
          };
        } else {
          throw new Error('JavaScript execution not supported with ScrapingBee');
        }

      case "browser_extract_content":
        const content = await client.extractContent({
          url: args.url,
          selector: args.selector,
          waitFor: args.waitFor
        });

        return {
          content: [{
            type: "text",
            text: `Extracted content:\n${content}`,
          }],
          isError: false,
        };

      default:
        return {
          content: [{
            type: "text",
            text: `Unknown tool: ${name}`,
          }],
          isError: true,
        };
    }
  } catch (error) {
    return {
      content: [{
        type: "text",
        text: `Error: ${(error as Error).message}`,
      }],
      isError: true,
    };
  }
}

// Initialize the server
export default {
  async fetch(request: Request, env: any): Promise<Response> {
    // Initialize browser configuration from environment
    browserConfig = {
      browserlessToken: env.BROWSERLESS_TOKEN,
      scrapingbeeToken: env.SCRAPINGBEE_TOKEN,
      service: env.BROWSER_SERVICE || 'browserless'
    };

    const server = new Server(
      {
        name: "cloudflare-browser-mcp",
        version: "1.0.0",
      },
      {
        capabilities: {
          resources: {},
          tools: {},
        },
      },
    );

    // Setup request handlers
    server.setRequestHandler(ListResourcesRequestSchema, async () => ({
      resources: [
        {
          uri: "console://logs",
          mimeType: "text/plain",
          name: "Browser console logs",
        },
        ...Array.from(screenshots.keys()).map(name => ({
          uri: `screenshot://${name}`,
          mimeType: "image/png",
          name: `Screenshot: ${name}`,
        })),
      ],
    }));

    server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
      const uri = request.params.uri.toString();

      if (uri === "console://logs") {
        return {
          contents: [{
            uri,
            mimeType: "text/plain",
            text: consoleLogs.join("\n"),
          }],
        };
      }

      if (uri.startsWith("screenshot://")) {
        const name = uri.split("://")[1];
        const screenshot = screenshots.get(name);
        if (screenshot) {
          return {
            contents: [{
              uri,
              mimeType: "image/png",
              blob: screenshot,
            }],
          };
        }
      }

      throw new Error(`Resource not found: ${uri}`);
    });

    server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: TOOLS,
    }));

    server.setRequestHandler(CallToolRequestSchema, async (request) =>
      handleToolCall(request.params.name, request.params.arguments ?? {})
    );

    // Handle HTTP requests (for Cloudflare Workers)
    if (request.method === 'POST') {
      const body = await request.json();
      // Process MCP request and return response
      // This is a simplified example - you'd need proper MCP protocol handling
      return new Response(JSON.stringify({ message: 'MCP request processed' }), {
        headers: { 'Content-Type': 'application/json' }
      });
    }

    return new Response('Cloudflare Browser MCP Server', {
      headers: { 'Content-Type': 'text/plain' }
    });
  },
};