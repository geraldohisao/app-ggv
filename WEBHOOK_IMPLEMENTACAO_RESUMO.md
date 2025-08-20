# ✅ Webhook N8N - Implementação Completa

## 🎯 **O que foi Criado:**

### **1. 📡 Edge Function do Supabase**
- **Arquivo:** `supabase/functions/n8n-callback/index.ts`
- **URL:** `https://app.grupoggv.com/api/webhook/n8n-callback`
- **Função:** Receber callbacks do N8N e atualizar status no banco

### **2. 🗄️ Banco de Dados**
- **Arquivo:** `supabase/sql/21_automation_history.sql`
- **Tabela:** `automation_history`
- **Recursos:** RLS, índices, funções RPC

### **3. 🔧 Integração Frontend**
- **Arquivo:** `services/automationService.ts` (atualizado)
- **Mudança:** Agora usa Supabase em vez de servidor local
- **Resultado:** Histórico real persistente

### **4. 📚 Documentação**
- **Arquivo:** `WEBHOOK_N8N_DOCUMENTATION.md`
- **Conteúdo:** Guia completo de implementação e uso

### **5. 🚀 Script de Deploy**
- **Arquivo:** `deploy-n8n-webhook.sh`
- **Função:** Automatizar deploy completo

---

## 📋 **Formato de Dados do Webhook**

### **URL do Webhook:**
```
POST https://app.grupoggv.com/api/webhook/n8n-callback
```

### **Payload Obrigatório:**
```json
{
  "workflowId": "wf_1755634796723",    // OBRIGATÓRIO
  "status": "completed"                // OBRIGATÓRIO
}
```

### **Payload Completo (Recomendado):**
```json
{
  "workflowId": "wf_1755634796723",
  "executionId": "exec_1755634796723",
  "status": "completed",
  "message": "Workflow completed successfully - 3 leads processed",
  "data": {
    "leadsProcessed": 3,
    "totalLeads": 3,
    "errors": [],
    "proprietario": "Andressa",
    "cadencia": "Reativação - Sem Retorno"
  },
  "timestamp": "2025-08-19T20:25:54.724Z"
}
```

---

## 🔧 **Configuração no N8N**

### **HTTP Request Node (Final do Workflow):**

**URL:** `https://app.grupoggv.com/api/webhook/n8n-callback`  
**Method:** `POST`  
**Headers:** `Content-Type: application/json`

**Body:**
```json
{
  "workflowId": "{{$execution.id}}",
  "executionId": "{{$execution.id}}",
  "status": "completed",
  "message": "Workflow completed successfully - {{$json.totalLeads}} leads processed",
  "data": {
    "leadsProcessed": "{{$json.leadsProcessed}}",
    "totalLeads": "{{$json.totalLeads}}",
    "proprietario": "{{$json.proprietario}}",
    "cadencia": "{{$json.cadencia}}"
  },
  "timestamp": "{{$now}}"
}
```

---

## 🎯 **Status Aceitos**

| Status | Quando Usar |
|--------|-------------|
| `started` | Início da execução |
| `completed` | Execução bem-sucedida |
| `failed` | Erro durante execução |
| `cancelled` | Cancelamento manual |

---

## 🧪 **Como Testar**

### **1. Teste Manual:**
```bash
curl -X POST https://app.grupoggv.com/api/webhook/n8n-callback \
  -H "Content-Type: application/json" \
  -d '{
    "workflowId": "test_123",
    "status": "completed",
    "message": "Test callback"
  }'
```

### **2. Deploy Completo:**
```bash
./deploy-n8n-webhook.sh
```

---

## 🔄 **Fluxo Completo**

```
1. Frontend → triggerReativacao()
2. Sistema → Envia para N8N webhook
3. Sistema → Salva registro "started" no Supabase
4. N8N → Processa automação
5. N8N → Envia callback para Edge Function
6. Edge Function → Atualiza status para "completed"
7. Frontend → Mostra status atualizado
```

---

## ✅ **Próximos Passos**

### **Para Deploy em Produção:**

1. **Executar script de deploy:**
   ```bash
   ./deploy-n8n-webhook.sh
   ```

2. **Configurar N8N:**
   - Adicionar HTTP Request node no final do workflow
   - Usar URL: `https://app.grupoggv.com/api/webhook/n8n-callback`
   - Copiar body JSON da documentação

3. **Testar:**
   - Executar uma automação real
   - Verificar se status atualiza de "started" → "completed"

### **Para Desenvolvimento Local:**

1. **Manter servidor local:**
   ```bash
   node n8n-callback-server.js
   ```

2. **N8N local usar:**
   ```
   http://localhost:3001/api/webhook/n8n-callback
   ```

---

## 🎉 **Resultado Final**

✅ **Webhook real** criado e documentado  
✅ **Edge Function** do Supabase implementada  
✅ **Banco de dados** estruturado com RLS  
✅ **Frontend** integrado com Supabase  
✅ **Documentação** completa  
✅ **Script de deploy** automatizado  

**O sistema agora está pronto para receber callbacks reais do N8N e atualizar o status automaticamente!** 🚀

---

## 📞 **Suporte**

- **Documentação:** `WEBHOOK_N8N_DOCUMENTATION.md`
- **Logs:** Dashboard do Supabase → Functions
- **Teste:** `curl` commands na documentação
