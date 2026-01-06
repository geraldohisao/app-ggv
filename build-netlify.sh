#!/bin/bash
set -e

echo "🚀 Build Netlify iniciado"
echo "Node version: $(node --version)"
echo "NPM version: $(npm --version)"

# Install dependencies
npm ci --silent

# Run build (sem TypeScript check para deploy rápido)
SKIP_TYPESCRIPT_CHECK=true npm run build:fast

echo "✅ Build concluído"
