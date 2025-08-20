# 🚀 Webhook N8N - Setup Completo via Netlify Functions

## ✅ Status: IMPLEMENTADO E FUNCIONANDO

### 📡 **Endpoint Ativo**
```
URL: https://app.grupoggv.com/.netlify/functions/n8n-callback
Method: POST
Content-Type: application/json
```

## 🔧 **Configuração Necessária**

### **1. Variáveis de Ambiente no Netlify**

Acesse: [Netlify Dashboard](https://app.netlify.com/) → Seu Site → Site Settings → Environment Variables

Adicione:
```
VITE_SUPABASE_URL = sua_url_supabase_aqui
SUPABASE_SERVICE_ROLE_KEY = sua_service_role_key_aqui
```

### **2. Configuração N8N Webhook**

No final do seu workflow N8N, adicione um nó HTTP Request:

**Configurações:**
- **Method:** POST
- **URL:** `https://app.grupoggv.com/.netlify/functions/n8n-callback`
- **Headers:** `Content-Type: application/json`

**Body (JSON):**
```json
{
  "workflowId": "{{ $workflow.id }}",
  "executionId": "{{ $execution.id }}",
  "status": "completed",
  "message": "Workflow executado com sucesso",
  "data": {
    "leadsProcessed": "{{ $('node_name').itemMatching(0).$('count') }}",
    "totalLeads": "{{ $input.all().length }}",
    "errors": []
  },
  "timestamp": "{{ $now }}"
}
```

### **3. Estados Suportados**

O webhook aceita os seguintes status:
- `started` - Workflow iniciado
- `processing` - Em processamento
- `completed` - Concluído com sucesso
- `failed` - Falha na execução

### **4. Formato de Resposta**

**Sucesso (200):**
```json
{
  "success": true,
  "message": "Callback processed successfully",
  "workflowId": "wf_123456",
  "status": "completed",
  "updatedRecord": {
    "id": "real_123456789_abc123",
    "status": "completed",
    "updated_at": "2025-08-20T12:00:00Z"
  }
}
```

**Erro (400/500):**
```json
{
  "error": "Missing workflowId or status",
  "details": "Detalhes do erro",
  "workflowId": "wf_123456"
}
```

## 🧪 **Teste Manual**

Para testar o webhook:

```bash
curl -X POST https://app.grupoggv.com/.netlify/functions/n8n-callback \
  -H "Content-Type: application/json" \
  -d '{
    "workflowId": "test123",
    "status": "completed",
    "message": "Test webhook",
    "timestamp": "'$(date -u +%Y-%m-%dT%H:%M:%SZ)'"
  }'
```

## 📊 **Monitoramento**

- **Logs Netlify:** Acesse Functions → n8n-callback → View function logs
- **Banco Supabase:** Verifique a tabela `automation_history`
- **Frontend:** O status deve mudar de "pendente" para "concluído"

## 🔄 **Fluxo Completo**

1. **Frontend** → Aciona reativação
2. **N8N** → Recebe webhook e executa workflow
3. **N8N** → Ao terminar, chama callback
4. **Netlify Function** → Recebe callback e atualiza Supabase
5. **Frontend** → Mostra status atualizado

## ⚠️ **Importante**

- Configure as variáveis de ambiente no Netlify ANTES de testar
- O N8N deve chamar o webhook APENAS quando o workflow terminar
- Verifique os logs do Netlify em caso de problemas

## 🎯 **Resultado Esperado**

Após a configuração, o histórico de automações deve mostrar:
- Status "started" → quando a automação é acionada
- Status "completed" → quando o N8N termina e chama o webhook

**Fim do problema de status pendente!** ✅
