# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview
This is a Model Context Protocol (MCP) server built with TypeScript that provides browser automation capabilities using Puppeteer. It enables Large Language Models to interact with web pages, take screenshots, and execute JavaScript in a real browser environment.

## Key Commands

### Development
```bash
npm run watch          # TypeScript watch mode for development
npm run build         # Compile TypeScript and set executable permissions
npm run prepare       # Auto-build hook (runs on npm install)
```

### Usage
```bash
npx -y @modelcontextprotocol/server-puppeteer
# or with Docker
docker run -i --rm --init -e DOCKER_CONTAINER=true mcp/puppeteer
```

## Architecture

### Core Pattern
- **Framework**: Model Context Protocol (MCP) SDK
- **Transport**: StdioServerTransport (stdin/stdout communication)
- **Browser Engine**: Puppeteer with Chromium
- **State Management**: Global browser and page instance management

### Entry Points
- **Source**: `index.ts` (main implementation)
- **Binary**: `dist/index.js` (compiled output)
- **Executable**: `mcp-server-puppeteer`

### Available Tools (7)
- `puppeteer_navigate` - Navigate to URLs
- `puppeteer_screenshot` - Capture page/element screenshots
- `puppeteer_click` - Click elements
- `puppeteer_hover` - Hover over elements
- `puppeteer_fill` - Fill form inputs
- `puppeteer_select` - Select from dropdowns
- `puppeteer_evaluate` - Execute JavaScript in browser context

### Resources (2 types)
- `console://logs` - Browser console output
- `screenshot://<name>` - Captured screenshots stored in memory

## Configuration

### Environment Variables
- `PUPPETEER_LAUNCH_OPTIONS` - JSON-encoded browser launch options
- `ALLOW_DANGEROUS` - Enable dangerous browser arguments (security flag)
- `DOCKER_CONTAINER` - Container detection flag

### Security Features
- Dangerous browser argument filtering (configurable)
- Environment-based security controls
- Headless browser operation

## Development Notes
- All TypeScript source in root directory
- Compiled output goes to `dist/`
- No testing framework currently configured
- Docker support with ARM64 compatibility
- Global state manages browser lifecycle and screenshot storage