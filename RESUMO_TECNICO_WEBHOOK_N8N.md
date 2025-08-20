# 📋 Resumo Técnico - Webhook N8N para Área Técnica

## 🎯 **Objetivo**
Implementar comunicação bidirecional entre o frontend da aplicação e o N8N para automação de reativação de leads, com feedback de status em tempo real.

## 🏗️ **Arquitetura Implementada**

### **1. Fluxo de Comunicação**
```
Frontend → N8N (Trigger) → N8N (Callback) → Backend → Frontend (Update)
```

### **2. Componentes Técnicos**

#### **A. Frontend (React/TypeScript)**
- **Arquivo:** `services/automationService.ts`
- **Função:** `triggerReativacao()`
- **Endpoint N8N:** `https://automation-test.ggvinteligencia.com.br/webhook/reativacao-leads`
- **Timeout:** 45 segundos
- **Método:** POST com AbortController

#### **B. Webhook de Callback (Netlify Functions)**
- **Arquivo:** `netlify/functions/n8n-callback.js`
- **URL:** `https://app.grupoggv.com/.netlify/functions/n8n-callback`
- **Método:** POST
- **Função:** Receber callbacks do N8N e atualizar status no banco

#### **C. Armazenamento (Servidor Local + Supabase)**
- **Local:** `mock-automation-server.mjs` (desenvolvimento)
- **Produção:** Supabase (tabela `automation_history`)
- **Fallback:** Sistema híbrido com 3 camadas

## 📊 **Estrutura de Dados**

### **Payload Enviado ao N8N:**
```json
{
  "filtro": "Lista de reativação - Topo de funil",
  "proprietario": "Nome do SDR",
  "cadencia": "Reativação - Sem Retorno", 
  "numero_negocio": 30,
  "callback_url": "https://app.grupoggv.com/.netlify/functions/n8n-callback",
  "timestamp": "2025-08-20T13:42:21.698Z"
}
```

### **Callback Esperado do N8N:**
```json
{
  "workflowId": "wf_1234567890",
  "executionId": "exec_1234567890",
  "status": "completed",
  "message": "Workflow completed successfully",
  "data": {
    "leadsProcessed": 30,
    "totalLeads": 30,
    "errors": []
  },
  "timestamp": "2025-08-20T14:00:00.000Z"
}
```

### **Registro no Banco:**
```json
{
  "id": "real_1755697341706_yp0yq9row",
  "userId": "current-user",
  "userEmail": "usuario@grupoggv.com",
  "automationType": "reativacao_leads",
  "filtro": "Lista de reativação - Topo de funil",
  "proprietario": "Nome do SDR",
  "cadencia": "Reativação - Sem Retorno",
  "numeroNegocio": 30,
  "status": "started|completed|failed",
  "n8nResponse": {...},
  "createdAt": "2025-08-20T13:42:21.708Z",
  "updatedAt": "2025-08-20T13:42:21.708Z"
}
```

## 🔧 **Estados do Sistema**

### **Status Possíveis:**
- `started` - Automação iniciada, aguardando conclusão
- `completed` - Automação concluída com sucesso
- `failed` - Automação falhou
- `timeout_started` - Iniciado mas N8N demorou para responder

### **Fluxo de Estados:**
1. **Usuário aciona** → Status: `started`
2. **N8N processa** → (em background)
3. **N8N envia callback** → Status: `completed`
4. **Frontend atualiza** → Interface mostra "Concluído"

## ⚙️ **Configuração Necessária**

### **1. Variáveis de Ambiente (Netlify)**
```bash
VITE_SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ...
```

### **2. Configuração N8N**
- **Webhook Trigger:** `https://automation-test.ggvinteligencia.com.br/webhook/reativacao-leads`
- **Callback URL:** `https://app.grupoggv.com/.netlify/functions/n8n-callback`
- **Método:** POST para ambos

### **3. Headers HTTP**
```javascript
{
  "Content-Type": "application/json",
  "User-Agent": "GGV-Platform/1.0",
  "X-Source": "ggv-reativacao"
}
```

## 🚨 **Problemas Identificados**

### **1. Status "Pendente" (CRÍTICO)**
- **Causa:** Webhook callback não configurado/funcionando
- **Sintoma:** Status permanece "started" mesmo após N8N concluir
- **Solução:** Configurar variáveis de ambiente no Netlify

### **2. Timeout N8N**
- **Causa:** N8N demora mais de 45s para responder
- **Sintoma:** Erro "signal is aborted without reason"
- **Solução:** Sistema de fallback implementado

### **3. Resposta N8N Inconsistente**
- **Recebido:** `"Workflow foi executado"` (texto simples)
- **Esperado:** JSON estruturado
- **Solução:** Parser flexível implementado

## 🔍 **Monitoramento e Debug**

### **Logs Disponíveis:**
- **Frontend:** Console do navegador
- **N8N:** Logs internos do workflow
- **Webhook:** Logs da função Netlify
- **Banco:** Registros na tabela `automation_history`

### **Endpoints de Teste:**
```bash
# Testar webhook
curl -X POST https://app.grupoggv.com/.netlify/functions/n8n-callback \
  -H "Content-Type: application/json" \
  -d '{"workflowId":"test123","status":"completed"}'

# Consultar histórico
curl http://localhost:3001/automation/history
```

## 📈 **Métricas de Performance**

### **Tempos Esperados:**
- **Trigger N8N:** < 45s
- **Callback:** < 5s
- **Update Interface:** Instantâneo

### **Taxa de Sucesso:**
- **Desenvolvimento:** 100% (servidor local)
- **Produção:** Depende da configuração do webhook

## 🚀 **Próximos Passos**

### **Para Funcionamento Completo:**
1. **Configurar variáveis de ambiente** no Netlify
2. **Testar webhook** em produção
3. **Configurar callback** no workflow N8N
4. **Monitorar logs** para debugging

### **Melhorias Futuras:**
- Retry automático em caso de falha
- Notificações em tempo real via WebSocket
- Dashboard de monitoramento
- Métricas de performance

## 🔒 **Segurança**

### **Medidas Implementadas:**
- CORS configurado
- Validação de payload
- Service Role Key para Supabase
- Headers de identificação

### **Recomendações:**
- Validar origem dos callbacks
- Implementar rate limiting
- Logs de auditoria
- Monitoramento de falhas

---

**Status Atual:** ⚠️ **Parcialmente Funcional** - Necessária configuração das variáveis de ambiente no Netlify para funcionamento completo em produção.
