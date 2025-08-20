#!/bin/bash

# Script para deploy do webhook N8N
# Executa todas as etapas necessárias para implementar o webhook

echo "🚀 Deploy do Webhook N8N - GGV Plataforma"
echo "========================================"

# Verificar se Supabase CLI está instalado
if ! command -v supabase &> /dev/null; then
    echo "❌ Supabase CLI não encontrado. Instale com:"
    echo "   npm install -g supabase"
    exit 1
fi

echo "✅ Supabase CLI encontrado"

# Verificar se está logado no Supabase
if ! supabase projects list &> /dev/null; then
    echo "❌ Não está logado no Supabase. Execute:"
    echo "   supabase login"
    exit 1
fi

echo "✅ Autenticado no Supabase"

# 1. Deploy da Edge Function
echo ""
echo "📡 1. Fazendo deploy da Edge Function..."
if supabase functions deploy n8n-callback --project-ref mwlekwyxbfbxfxskywgx; then
    echo "✅ Edge Function deployada com sucesso"
else
    echo "❌ Erro ao fazer deploy da Edge Function"
    exit 1
fi

# 2. Executar SQL para criar tabela
echo ""
echo "🗄️ 2. Criando tabela automation_history..."
if supabase db push --project-ref mwlekwyxbfbxfxskywgx; then
    echo "✅ Schema do banco atualizado"
else
    echo "⚠️ Erro ao atualizar schema. Execute manualmente:"
    echo "   Copie o conteúdo de supabase/sql/21_automation_history.sql"
    echo "   Cole no SQL Editor do Supabase Dashboard"
fi

# 3. Testar Edge Function
echo ""
echo "🧪 3. Testando Edge Function..."
SUPABASE_URL="https://mwlekwyxbfbxfxskywgx.supabase.co"
ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im13bGVrd3l4YmZieGZ4c2t5d2d4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTAxMTIzMjEsImV4cCI6MjA2NTY4ODMyMX0.rFX9H2pcGLNX7n3vKLYGi72JKwjUw6oG38IZGjO90HE"

TEST_PAYLOAD='{
  "workflowId": "test_deploy_'$(date +%s)'",
  "status": "completed",
  "message": "Test deploy callback",
  "data": {
    "leadsProcessed": 1,
    "totalLeads": 1
  },
  "timestamp": "'$(date -u +%Y-%m-%dT%H:%M:%S.%3NZ)'"
}'

if curl -s -X POST "$SUPABASE_URL/functions/v1/n8n-callback" \
     -H "Authorization: Bearer $ANON_KEY" \
     -H "Content-Type: application/json" \
     -d "$TEST_PAYLOAD" | grep -q "success"; then
    echo "✅ Edge Function funcionando corretamente"
else
    echo "❌ Erro ao testar Edge Function"
fi

# 4. Verificar URLs
echo ""
echo "🔗 4. URLs Importantes:"
echo "   Webhook URL: $SUPABASE_URL/functions/v1/n8n-callback"
echo "   Dashboard: https://supabase.com/dashboard/project/mwlekwyxbfbxfxskywgx"
echo "   Logs: https://supabase.com/dashboard/project/mwlekwyxbfbxfxskywgx/functions"

# 5. Instruções finais
echo ""
echo "📋 5. Próximos Passos:"
echo "   1. Configure o N8N para usar a URL:"
echo "      $SUPABASE_URL/functions/v1/n8n-callback"
echo ""
echo "   2. Adicione HTTP Request node no final do workflow N8N:"
echo "      - Method: POST"
echo "      - URL: $SUPABASE_URL/functions/v1/n8n-callback"
echo "      - Body: Ver WEBHOOK_N8N_DOCUMENTATION.md"
echo ""
echo "   3. Teste uma automação real e verifique se o status atualiza"
echo ""
echo "✅ Deploy concluído! Webhook pronto para uso."

# Opcional: Abrir documentação
if command -v open &> /dev/null; then
    echo ""
    read -p "Abrir documentação? (y/n): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        open WEBHOOK_N8N_DOCUMENTATION.md
    fi
fi
