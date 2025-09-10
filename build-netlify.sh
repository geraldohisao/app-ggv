#!/bin/bash
set -e

echo "🚀 Build Netlify iniciado"
echo "Node version: $(node --version)"
echo "NPM version: $(npm --version)"

# Install dependencies
npm ci --silent

# Run build
npm run build:fast

echo "✅ Build concluído"
