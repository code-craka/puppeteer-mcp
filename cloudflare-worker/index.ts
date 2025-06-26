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

// Browserless.io API client using REST endpoints
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
    const requestBody: any = {
      url: options.url,
      options: {
        fullPage: options.fullPage || false,
        type: 'png'
      }
    };

    // Add selector wait
    if (options.selector) {
      requestBody.waitForSelector = options.selector;
    }

    const response = await fetch(`${this.baseUrl}/screenshot?token=${this.token}`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Screenshot failed: ${response.status} ${response.statusText} - ${errorText}`);
    }

    // Return base64 encoded image
    const buffer = await response.arrayBuffer();
    const base64 = btoa(String.fromCharCode(...new Uint8Array(buffer)));
    return base64;
  }

  async execute(options: {
    url?: string;
    code: string;
    waitFor?: string;
  }): Promise<any> {
    const functionCode = `
      module.exports = async ({ page, context }) => {
        try {
          ${options.url ? `await page.goto('${options.url}', { waitUntil: 'networkidle0' });` : ''}
          ${options.waitFor ? `await page.waitForSelector('${options.waitFor}', { timeout: 30000 });` : ''}
          
          const result = await page.evaluate(() => {
            ${options.code}
          });
          
          return result;
        } catch (error) {
          return { error: error.message };
        }
      };
    `;
    
    const response = await fetch(`${this.baseUrl}/function?token=${this.token}`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/javascript',
        'Cache-Control': 'no-cache'
      },
      body: functionCode
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Execution failed: ${response.status} ${response.statusText} - ${errorText}`);
    }

    return await response.json();
  }

  async click(options: {
    url?: string;
    selector: string;
    waitFor?: string;
  }): Promise<void> {
    await this.execute({
      url: options.url,
      waitFor: options.waitFor,
      code: `
        const element = document.querySelector('${options.selector}');
        if (element) {
          element.click();
          return 'clicked';
        } else {
          throw new Error('Element not found: ${options.selector}');
        }
      `
    });
  }

  async fill(options: {
    url?: string;
    selector: string;
    value: string;
  }): Promise<void> {
    await this.execute({
      url: options.url,
      code: `
        const element = document.querySelector('${options.selector}');
        if (element) {
          element.value = '${options.value.replace(/'/g, "\\'")}';
          element.dispatchEvent(new Event('input', { bubbles: true }));
          element.dispatchEvent(new Event('change', { bubbles: true }));
          return 'filled';
        } else {
          throw new Error('Element not found: ${options.selector}');
        }
      `
    });
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
        ? `
          const element = document.querySelector('${options.selector}');
          return element ? element.innerText : 'Element not found';
        `
        : `return document.body.innerText;`
    });

    return typeof result === 'string' ? result : JSON.stringify(result);
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

    // Handle CORS
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    };

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    if (request.method === 'GET') {
      return new Response('Cloudflare Browser MCP Server - Ready', {
        headers: { 'Content-Type': 'text/plain', ...corsHeaders }
      });
    }

    if (request.method === 'POST') {
      try {
        const body = await request.json();
        
        // Handle MCP protocol requests
        if (body.method === 'tools/list') {
          return new Response(JSON.stringify({
            jsonrpc: "2.0",
            id: body.id,
            result: { tools: TOOLS }
          }), {
            headers: { 'Content-Type': 'application/json', ...corsHeaders }
          });
        }

        if (body.method === 'tools/call') {
          const result = await handleToolCall(
            body.params.name, 
            body.params.arguments || {}
          );
          
          return new Response(JSON.stringify({
            jsonrpc: "2.0",
            id: body.id,
            result: result
          }), {
            headers: { 'Content-Type': 'application/json', ...corsHeaders }
          });
        }

        if (body.method === 'resources/list') {
          return new Response(JSON.stringify({
            jsonrpc: "2.0",
            id: body.id,
            result: {
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
              ]
            }
          }), {
            headers: { 'Content-Type': 'application/json', ...corsHeaders }
          });
        }

        if (body.method === 'resources/read') {
          const uri = body.params.uri;
          
          if (uri === "console://logs") {
            return new Response(JSON.stringify({
              jsonrpc: "2.0",
              id: body.id,
              result: {
                contents: [{
                  uri,
                  mimeType: "text/plain",
                  text: consoleLogs.join("\n"),
                }]
              }
            }), {
              headers: { 'Content-Type': 'application/json', ...corsHeaders }
            });
          }

          if (uri.startsWith("screenshot://")) {
            const name = uri.split("://")[1];
            const screenshot = screenshots.get(name);
            if (screenshot) {
              return new Response(JSON.stringify({
                jsonrpc: "2.0",
                id: body.id,
                result: {
                  contents: [{
                    uri,
                    mimeType: "image/png",
                    blob: screenshot,
                  }]
                }
              }), {
                headers: { 'Content-Type': 'application/json', ...corsHeaders }
              });
            }
          }

          return new Response(JSON.stringify({
            jsonrpc: "2.0",
            id: body.id,
            error: { code: -1, message: `Resource not found: ${uri}` }
          }), {
            headers: { 'Content-Type': 'application/json', ...corsHeaders }
          });
        }

        // Default response for unknown methods
        return new Response(JSON.stringify({
          jsonrpc: "2.0",
          id: body.id,
          error: { code: -1, message: `Unknown method: ${body.method}` }
        }), {
          headers: { 'Content-Type': 'application/json', ...corsHeaders }
        });

      } catch (error) {
        return new Response(JSON.stringify({
          jsonrpc: "2.0",
          id: null,
          error: { code: -1, message: `Server error: ${(error as Error).message}` }
        }), {
          status: 500,
          headers: { 'Content-Type': 'application/json', ...corsHeaders }
        });
      }
    }

    return new Response('Method not allowed', { 
      status: 405,
      headers: corsHeaders
    });
  },
};