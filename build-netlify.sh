#!/bin/bash
set -e

echo "🚀 Iniciando build do Netlify..."

# Limpar cache npm
echo "🧹 Limpando cache npm..."
npm cache clean --force

# Instalar dependências
echo "📦 Instalando dependências..."
npm ci

# Verificar se o build vai funcionar
echo "🔍 Verificando se pode fazer build..."
if npm run build:fast; then
    echo "✅ Build concluído com sucesso!"
else
    echo "❌ Build falhou!"
    exit 1
fi
