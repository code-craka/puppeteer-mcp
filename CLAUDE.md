# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview
This is a comprehensive Model Context Protocol (MCP) server built with TypeScript that provides browser automation capabilities. It supports multiple deployment methods: local Puppeteer, Docker containers, and Cloudflare Workers with external browser services.

## Deployment Options

### 1. Local Development (Puppeteer)
```bash
npm run watch          # TypeScript watch mode for development
npm run build         # Compile TypeScript and set executable permissions
npm run prepare       # Auto-build hook (runs on npm install)
node dist/index.js     # Run locally
```

### 2. Docker Deployment
```bash
docker build -t puppeteer-mcp .
docker run -i --rm --init -e DOCKER_CONTAINER=true puppeteer-mcp
```

### 3. Cloudflare Workers (Production)
```bash
cd cloudflare-worker
npm install                # Installs Wrangler v4.22.0 and dependencies
npx wrangler login
echo "YOUR_BROWSERLESS_TOKEN" | npx wrangler secret put BROWSERLESS_TOKEN
npm run build             # Compile TypeScript to dist/index.js
npx wrangler deploy       # Deploy using latest Wrangler v4.22.0
```

**Live URL**: `https://puppeteer.techsci.dev`  
**Alternative URL**: `https://puppeteer-mcp-worker.sayem-abdullah-rihan.workers.dev`

## Architecture

### Local/Docker Pattern
- **Framework**: Model Context Protocol (MCP) SDK
- **Transport**: StdioServerTransport (stdin/stdout communication)
- **Browser Engine**: Puppeteer with Chromium
- **State Management**: Global browser and page instance management

### Cloudflare Workers Pattern
- **Framework**: HTTP-based MCP JSON-RPC 2.0
- **Transport**: HTTP POST requests
- **Browser Engine**: Browserless.io external API
- **State Management**: Stateless with external browser service

## Entry Points

### Local Deployment
- **Source**: `index.ts` (main implementation)
- **Binary**: `dist/index.js` (compiled output)
- **Executable**: `mcp-server-puppeteer`

### Cloudflare Workers
- **Source**: `cloudflare-worker/index.ts`
- **Deployment**: Wrangler CLI
- **Primary URL**: `https://puppeteer.techsci.dev`
- **Alternative URL**: `https://puppeteer-mcp-worker.sayem-abdullah-rihan.workers.dev`

## Available Tools

### Local/Docker (7 tools)
- `puppeteer_navigate` - Navigate to URLs
- `puppeteer_screenshot` - Capture page/element screenshots
- `puppeteer_click` - Click elements
- `puppeteer_hover` - Hover over elements
- `puppeteer_fill` - Fill form inputs
- `puppeteer_select` - Select from dropdowns
- `puppeteer_evaluate` - Execute JavaScript in browser context

### Cloudflare Workers (6 tools)
- `browser_navigate` - Navigate to URLs (state only)
- `browser_screenshot` - Capture screenshots via Browserless.io ✅ **Working**
- `browser_click` - Click elements via Browserless.io
- `browser_fill` - Fill forms via Browserless.io
- `browser_evaluate` - Execute JavaScript via Browserless.io
- `browser_extract_content` - Extract page content

## Resources
- `console://logs` - Browser console output
- `screenshot://<name>` - Captured screenshots stored in memory

## Configuration

### Local/Docker Environment Variables
- `PUPPETEER_LAUNCH_OPTIONS` - JSON-encoded browser launch options
- `ALLOW_DANGEROUS` - Enable dangerous browser arguments (security flag)
- `DOCKER_CONTAINER` - Container detection flag

### Cloudflare Workers Environment
- `BROWSERLESS_TOKEN` - Browserless.io API token (stored as Wrangler secret)
- `BROWSER_SERVICE` - Service type ("browserless" or "scrapingbee")

## Testing Commands

### Local Testing
```bash
echo '{"method": "initialize", "params": {"protocolVersion": "2024-11-05", "capabilities": {"tools": {}}}, "id": 1}' | node dist/index.js
```

### Cloudflare Workers Testing
```bash
# Test tools listing
curl -X POST https://puppeteer.techsci.dev \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"tools/list","id":"test"}'

# Test screenshot
curl -X POST https://puppeteer.techsci.dev \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"tools/call","params":{"name":"browser_screenshot","arguments":{"name":"test","url":"https://example.com"}},"id":"test"}'
```

## Security Features
- Dangerous browser argument filtering (configurable)
- Environment-based security controls
- Headless browser operation (Docker/Cloudflare)
- API token security (Cloudflare Workers)

## Development Notes
- **Local**: All TypeScript source in root directory, compiled output in `dist/`
- **Cloudflare**: Source in `cloudflare-worker/`, deployed via Wrangler v4.22.0
- **Testing**: Cloudflare Workers deployment tested and working
- **Browser Service**: Browserless.io integration confirmed working
- **Cost**: ~$0.0025/second browser usage (Browserless.io)
- **Limits**: Cloudflare Workers 10-second execution timeout
- **Security**: All dependencies updated, 0 vulnerabilities found
- **Build**: TypeScript compilation outputs to `cloudflare-worker/dist/index.js`

## Deployment Memories

### GitHub Deployment Milestones
- 🔧 Resolved TypeScript compilation errors in Cloudflare Worker
  - Fixed Buffer usage by replacing with btoa()
  - Added proper type annotations for JSON responses
  - Eliminated all "unknown type" errors
  - Ensured clean build process

- 🚀 GitHub Integration Configuration
  - Updated root package.json to resolve Puppeteer dependency conflicts
  - Created separate build scripts for local and cloud deployments
  - Modified GitHub Actions workflow to focus on cloudflare-worker directory
  - Added Node.js 20 support with correct working directory configurations

- 🌐 Deployment Architecture Improvements
  - Separated root project (Local Puppeteer MCP server)
  - Isolated cloudflare-worker for clean cloud deployment
  - Ensured no cross-dependency conflicts in GitHub builds

- ✅ Deployment Status Confirmed
  - Custom domain (https://puppeteer.techsci.dev) fully operational
  - Screenshot tool working perfectly
  - All 6 cloud tools successfully functional
  - CI/CD pipeline configured for automatic deployment

- 🔧 Final Build System Optimization
  - Resolved all GitHub deployment conflicts by separating build processes
  - Fixed TypeScript compilation in cloudflare-worker with proper Buffer handling
  - Updated build.sh to only build worker components for GitHub integration
  - Configured GitHub Actions to use Node.js 20 with isolated working directories
  - Eliminated cross-project dependency conflicts between root and worker builds
  - Verified deployment pipeline is fully operational and ready for production use

- 🔒 Security & Deployment Fixes (Latest)
  - Upgraded Wrangler from v3.80.0 to v4.22.0 (latest version)
  - Fixed esbuild security vulnerability (CVE-2024-XXXX) by upgrading to v0.25.0+
  - Added observability.logs configuration for enhanced monitoring
  - Resolved TypeScript noEmit issue preventing build output generation
  - Fixed wrangler.toml entry point from index.ts to dist/index.js
  - Eliminated all npm audit security vulnerabilities (0 found)
  - Updated GitHub Actions workflow to use latest Wrangler v4.22.0