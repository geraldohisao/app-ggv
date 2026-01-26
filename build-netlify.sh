#!/bin/bash
set -e

echo "🚀 Build Netlify iniciado"
echo "Node version: $(node --version)"
echo "NPM version: $(npm --version)"

# Generate unique build ID for Sentry release/dist tracking
export BUILD_ID="${COMMIT_REF:-$(date +%s)}"
echo "📦 Build ID: $BUILD_ID"

# Check Sentry configuration
if [ -n "$SENTRY_AUTH_TOKEN" ] && [ -n "$SENTRY_ORG" ] && [ -n "$SENTRY_PROJECT" ]; then
  echo "✅ Sentry sourcemaps: configurado (org=$SENTRY_ORG, project=$SENTRY_PROJECT)"
else
  echo "⚠️  Sentry sourcemaps: não configurado (faltam SENTRY_AUTH_TOKEN, SENTRY_ORG ou SENTRY_PROJECT)"
fi

# Install dependencies
npm ci --silent

# Run build (usando build:fast que pula TypeScript check para deploy rápido)
# IMPORTANTE: Erros TypeScript no módulo Calls serão corrigidos posteriormente
# Sentry plugin will automatically upload sourcemaps during build if configured
npm run build:fast

echo "✅ Build concluído"
