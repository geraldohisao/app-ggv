#!/bin/bash

# Script para iniciar o mock server das funções Netlify
# Execute: chmod +x start-mock-server.sh && ./start-mock-server.sh

echo "🚀 Iniciando Mock Netlify Functions Server..."
echo ""
echo "Este servidor simula as funções Netlify localmente para desenvolvimento."
echo "Porta: 8080"
echo ""

# Verificar se o Node.js está instalado
if ! command -v node &> /dev/null; then
    echo "❌ Node.js não encontrado. Instale o Node.js primeiro."
    exit 1
fi

# Verificar se o arquivo existe
if [ ! -f "mock-netlify-functions-server.js" ]; then
    echo "❌ Arquivo mock-netlify-functions-server.js não encontrado."
    exit 1
fi

# Iniciar o servidor
echo "▶️  Executando: node mock-netlify-functions-server.js"
echo ""

node mock-netlify-functions-server.js
