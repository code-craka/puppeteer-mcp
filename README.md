# Puppeteer MCP Server

A comprehensive Model Context Protocol (MCP) server that provides browser automation capabilities using Puppeteer. This server enables Large Language Models (LLMs) to interact with web pages, take screenshots, and execute JavaScript in both local and cloud environments.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.6+-blue.svg)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-22+-green.svg)](https://nodejs.org/)
[![Docker](https://img.shields.io/badge/Docker-Supported-blue.svg)](https://www.docker.com/)
[![Cloudflare Workers](https://img.shields.io/badge/Cloudflare-Workers-orange.svg)](https://workers.cloudflare.com/)

## 🚀 Features

### Core Capabilities
- **Browser Automation**: Navigate, click, fill forms, and interact with web pages
- **Screenshot Capture**: Take full-page or element-specific screenshots
- **JavaScript Execution**: Run custom scripts in browser context
- **Console Monitoring**: Capture and access browser console logs
- **Resource Management**: Store and retrieve screenshots and logs
- **Security Controls**: Configurable dangerous argument filtering

### Deployment Options
- **Local Development**: Direct Puppeteer integration with Chromium
- **Docker Container**: Containerized deployment with ARM64 support
- **Cloudflare Workers**: Cloud deployment using external browser services

## 📦 Installation & Usage

### Option 1: NPX (Recommended for Local Development)

```bash
npx -y @modelcontextprotocol/server-puppeteer
```

### Option 2: Docker

```bash
docker run -i --rm --init -e DOCKER_CONTAINER=true puppeteer-mcp
```

### Option 3: Build from Source

```bash
git clone https://github.com/code-craka/puppeteer-mcp.git
cd puppeteer-mcp
npm install
npm run build
node dist/index.js
```

## 🛠️ Available Tools

### Navigation & Interaction
- **`puppeteer_navigate`** - Navigate to URLs with optional launch options
- **`puppeteer_click`** - Click elements using CSS selectors
- **`puppeteer_hover`** - Hover over elements
- **`puppeteer_fill`** - Fill input fields and forms
- **`puppeteer_select`** - Select dropdown options

### Content & Automation
- **`puppeteer_screenshot`** - Capture page or element screenshots
- **`puppeteer_evaluate`** - Execute JavaScript in browser context

### Resources
- **`console://logs`** - Access browser console output
- **`screenshot://<name>`** - Retrieve captured screenshots

## 🔧 Configuration

### Claude Desktop Configuration

Add to your `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "puppeteer": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-puppeteer"]
    }
  }
}
```

### Docker Configuration

```json
{
  "mcpServers": {
    "puppeteer": {
      "command": "docker",
      "args": ["run", "-i", "--rm", "--init", "-e", "DOCKER_CONTAINER=true", "puppeteer-mcp"]
    }
  }
}
```

### Environment Variables

- **`PUPPETEER_LAUNCH_OPTIONS`** - JSON-encoded browser launch options
- **`ALLOW_DANGEROUS`** - Enable dangerous browser arguments (default: false)
- **`DOCKER_CONTAINER`** - Container detection flag

### Browser Launch Options

```json
{
  "mcpServers": {
    "puppeteer": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-puppeteer"],
      "env": {
        "PUPPETEER_LAUNCH_OPTIONS": "{\"headless\": false, \"args\": [\"--no-sandbox\"]}",
        "ALLOW_DANGEROUS": "true"
      }
    }
  }
}
```

## 🏗️ Development

### Local Development

```bash
# Clone the repository
git clone https://github.com/code-craka/puppeteer-mcp.git
cd puppeteer-mcp

# Install dependencies
npm install

# Development with watch mode
npm run watch

# Build for production
npm run build
```

### Docker Development

```bash
# Build Docker image
docker build -t puppeteer-mcp .

# Run with environment variables
docker run -i --rm --init \
  -e DOCKER_CONTAINER=true \
  -e PUPPETEER_LAUNCH_OPTIONS='{"headless":true}' \
  puppeteer-mcp
```

## ☁️ Cloudflare Workers Deployment

### **🚀 Live Production Deployment**

**Live URL**: `https://puppeteer.techsci.dev`

Our Puppeteer MCP server is successfully deployed on Cloudflare Workers with Browserless.io integration.

### **✅ Deployment Status**
- **Status**: Live and operational
- **Browser Service**: Browserless.io connected
- **API Calls**: Screenshots working ✅
- **Tools Available**: 6 browser automation tools
- **Response Time**: ~1-2 seconds average

### **🛠️ Deploy Your Own**

```bash
cd cloudflare-worker
npm install
npx wrangler login
echo "YOUR_BROWSERLESS_TOKEN" | npx wrangler secret put BROWSERLESS_TOKEN
npm run deploy
```

### **🧪 Test the Live Deployment**

```bash
# Test tools listing
curl -X POST https://puppeteer.techsci.dev \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"tools/list","id":"test"}'

# Test screenshot capture
curl -X POST https://puppeteer.techsci.dev \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"tools/call","params":{"name":"browser_screenshot","arguments":{"name":"test","url":"https://example.com"}},"id":"test"}'
```

### **💰 Production Costs**
- **Cloudflare Workers**: 100,000 requests/day free
- **Browserless.io**: ~$0.0025 per second of browser usage
- **Monthly estimate**: $10-50 for moderate usage

See [Cloudflare Worker README](./cloudflare-worker/README.md) for detailed setup instructions.

## 🔐 Security

### Default Security Measures
- Dangerous browser arguments are filtered by default
- Configurable security levels via environment variables
- Headless mode in Docker containers
- Scoped permissions for different deployment environments

### Dangerous Arguments (Filtered by Default)
- `--no-sandbox`
- `--disable-setuid-sandbox`
- `--single-process`
- `--disable-web-security`
- `--ignore-certificate-errors`

Override with `ALLOW_DANGEROUS=true` environment variable.

## 📋 Examples

### Basic Screenshot
```json
{
  "name": "puppeteer_screenshot",
  "arguments": {
    "name": "example-page",
    "width": 1280,
    "height": 720
  }
}
```

### Navigate and Interact
```json
{
  "name": "puppeteer_navigate",
  "arguments": {
    "url": "https://example.com",
    "launchOptions": {
      "headless": false
    }
  }
}
```

### Execute JavaScript
```json
{
  "name": "puppeteer_evaluate",
  "arguments": {
    "script": "return document.title;"
  }
}
```

## 📊 Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   MCP Client    │    │  Puppeteer MCP   │    │   Browser       │
│  (Claude, etc.) │◄──►│     Server       │◄──►│  (Chromium)     │
└─────────────────┘    └──────────────────┘    └─────────────────┘
                                │
                                ▼
                       ┌──────────────────┐
                       │  Cloud Services  │
                       │ (Browserless.io) │
                       └──────────────────┘
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit your changes: `git commit -m 'Add amazing feature'`
4. Push to the branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [Model Context Protocol](https://modelcontextprotocol.io) - The protocol that makes this possible
- [Puppeteer](https://pptr.dev/) - Headless Chrome Node.js API
- [Anthropic](https://anthropic.com) - Original MCP server implementation
- [Browserless.io](https://browserless.io) - Cloud browser automation service

## 🔗 Related Projects

- [MCP SDK](https://github.com/modelcontextprotocol/sdk) - Model Context Protocol SDK
- [Claude Desktop](https://claude.ai) - AI assistant with MCP support
- [Puppeteer](https://github.com/puppeteer/puppeteer) - Browser automation library

## 📞 Support

- Create an [issue](https://github.com/code-craka/puppeteer-mcp/issues) for bug reports
- Join discussions in [GitHub Discussions](https://github.com/code-craka/puppeteer-mcp/discussions)
- Check the [CLAUDE.md](CLAUDE.md) for development guidance

## 🏷️ Version History

- **v1.0.0** - Initial release with local Puppeteer support
- **v1.1.0** - Added Docker support and ARM64 compatibility
- **v1.2.0** - Cloudflare Workers adaptation with external browser services
- **v1.3.0** - ✅ **Live Production Deployment** - Successfully deployed on Cloudflare Workers with Browserless.io integration, tested and confirmed working

---

**Author**: [Sayem Abdullah Rihan](https://github.com/code-craka)  
**License**: MIT  
**Repository**: [github.com/code-craka/puppeteer-mcp](https://github.com/code-craka/puppeteer-mcp)