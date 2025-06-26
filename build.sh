#!/bin/bash
# Build script for GitHub integration
# This script only builds the Cloudflare Worker, not the root project

set -e

echo "🚀 Building Cloudflare Worker only..."

# Navigate to cloudflare-worker directory
cd cloudflare-worker

# Install dependencies
echo "📦 Installing dependencies..."
npm ci

# Build TypeScript
echo "🔨 Building TypeScript..."
npm run build

echo "✅ Build completed successfully!"
echo "📁 Built files are ready in cloudflare-worker/dist/"