# Puppeteer MCP Server for Cloudflare Workers

An adapted version of the Puppeteer MCP server that runs on Cloudflare Workers using external browser automation services (Browserless.io or ScrapingBee).

## Features

- **Browser Navigation**: Navigate to URLs
- **Screenshots**: Capture full page or element screenshots  
- **Element Interaction**: Click, fill forms, extract content
- **JavaScript Execution**: Run custom scripts in browser context
- **Multiple Browser Services**: Support for Browserless.io and ScrapingBee
- **Resource Management**: Access screenshots and console logs

## Setup

### 1. Install Dependencies

```bash
cd cloudflare-worker
npm install
```

### 2. Configure Browser Service

Choose between Browserless.io or ScrapingBee:

#### Option A: Browserless.io (Recommended)
- Sign up at [browserless.io](https://browserless.io)
- Get your API token
- Set environment variable:

```bash
wrangler secret put BROWSERLESS_TOKEN
# Enter your token when prompted
```

#### Option B: ScrapingBee
- Sign up at [scrapingbee.com](https://scrapingbee.com)  
- Get your API key
- Set environment variable:

```bash
wrangler secret put SCRAPINGBEE_TOKEN
# Enter your token when prompted
```

### 3. Configure Service Type

Edit `wrangler.toml` to set your preferred service:

```toml
[vars]
BROWSER_SERVICE = "browserless"  # or "scrapingbee"
```

### 4. Deploy

```bash
# Development
npm run dev

# Production
npm run deploy
```

## Tools Available

### browser_navigate
Navigate to a URL
```json
{
  "url": "https://example.com",
  "waitFor": ".content",
  "timeout": 30000
}
```

### browser_screenshot  
Capture screenshots
```json
{
  "name": "homepage",
  "url": "https://example.com",
  "selector": ".main-content",
  "width": 1280,
  "height": 720,
  "fullPage": false
}
```

### browser_click
Click elements (Browserless only)
```json
{
  "url": "https://example.com",
  "selector": "button.submit",
  "waitFor": ".success-message"
}
```

### browser_fill
Fill form inputs (Browserless only)
```json
{
  "url": "https://example.com",
  "selector": "input[name='email']",
  "value": "user@example.com"
}
```

### browser_evaluate
Execute JavaScript (Browserless only)
```json
{
  "url": "https://example.com",
  "script": "return document.title;",
  "waitFor": ".loaded"
}
```

### browser_extract_content
Extract text content
```json
{
  "url": "https://example.com",
  "selector": ".article-content",
  "waitFor": ".content-loaded"
}
```

## Service Comparison

| Feature | Browserless.io | ScrapingBee |
|---------|---------------|-------------|
| Screenshots | ✅ | ✅ |
| Element Clicks | ✅ | ❌ |
| Form Filling | ✅ | ❌ |
| JS Execution | ✅ | ❌ |
| Content Extraction | ✅ | ✅ |
| Anti-Bot Detection | ✅ | ✅✅ |
| Pricing | Pay-per-use | Monthly plans |

## Configuration in Claude Desktop

Add to your `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "browser-automation": {
      "command": "curl",
      "args": [
        "-X", "POST",
        "https://puppeteer.techsci.dev",
        "-H", "Content-Type: application/json",
        "-d", "@-"
      ]
    }
  }
}
```

## Environment Variables

- `BROWSERLESS_TOKEN`: Your Browserless.io API token
- `SCRAPINGBEE_TOKEN`: Your ScrapingBee API key  
- `BROWSER_SERVICE`: Service to use ("browserless" or "scrapingbee")

## Development

### Local Development
```bash
# Start development server
npm run dev

# Set secrets
npm run secret:browserless
npm run secret:scrapingbee

# Deploy to production
npm run deploy:prod
```

### GitHub Integration

This project is configured for automatic deployment via GitHub Actions:

**Repository**: `https://github.com/code-craka/puppeteer-mcp`

**Build Configuration**:
- **Build command**: `npm run build`
- **Deploy command**: `npx wrangler deploy`
- **Version command**: `npx wrangler versions upload`
- **Root directory**: `/`

**Automatic Deployment**: 
- Pushes to `main` branch automatically deploy to production
- Pull requests deploy to development environment
- GitHub Actions workflow handles CI/CD pipeline

**Required GitHub Secrets**:
- `CLOUDFLARE_API_TOKEN` - Your Cloudflare API token
- `BROWSERLESS_TOKEN` - Set via Wrangler secrets

**Live URLs**:
- **Production**: `https://puppeteer.techsci.dev`
- **Workers URL**: `https://puppeteer-mcp-worker.sayem-abdullah-rihan.workers.dev`

## Costs

### Browserless.io
- Free tier: 6 hours/month
- Paid: $0.0025 per second of browser time

### ScrapingBee  
- Free tier: 1,000 requests
- Paid: Starting at $29/month

## Limitations

- **ScrapingBee**: Limited to screenshots and content extraction
- **Browserless**: Full functionality but higher complexity
- **Cloudflare Workers**: 10-second execution limit for complex operations

## Support

For issues with:
- **Browser services**: Contact Browserless.io or ScrapingBee support
- **Cloudflare Workers**: Check Cloudflare Workers documentation  
- **MCP integration**: Review Model Context Protocol documentation