#!/bin/bash
set -e

echo "🚀 Starting Cloudflare Workers deployment..."

# Navigate to cloudflare-worker directory
cd cloudflare-worker

echo "📦 Installing dependencies..."
npm ci

echo "🔨 Building project..."
npm run build

echo "🚢 Deploying to Cloudflare Workers..."
npx wrangler deploy

echo "✅ Deployment completed successfully!"