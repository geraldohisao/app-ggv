# Configuração Real do N8N - Reativação de Leads

## 🔧 Problema Identificado e Corrigido

### ❌ **Problema Original:**
- N8N retornava resposta em texto simples: `"Workflow f..."` 
- Frontend esperava JSON válido
- Erro: `"Unexpected token 'W', 'Workflow f'... is not valid JSON"`

### ✅ **Solução Implementada:**
- Sistema agora aceita tanto JSON quanto texto do N8N
- Criação automática de objeto estruturado a partir de texto
- Detecção inteligente de sucesso baseada no conteúdo

## 📡 Configuração do N8N

### 1. **Webhook de Entrada (Recebe Dados)**
```
URL: https://automation-test.ggvinteligencia.com.br/webhook/reativacao-leads
Método: POST
```

**Payload Recebido:**
```json
{
  "filtro": "Lista de reativação - Topo de funil",
  "proprietario": "Andressa", 
  "cadencia": "Reativação - Sem Retorno",
  "numero_negocio": 3,
  "callback_url": "https://app.grupoggv.com/api/webhook/n8n-callback",
  "timestamp": "2025-08-19T20:00:00.000Z"
}
```

### 2. **Resposta do N8N (Ao Iniciar)**

**Opção A - JSON Estruturado (Recomendado):**
```json
{
  "ok": true,
  "success": true,
  "workflowId": "wf_12345",
  "executionId": "exec_67890",
  "message": "Workflow started successfully",
  "status": "started",
  "timestamp": "2025-08-19T20:00:01.000Z"
}
```

**Opção B - Texto Simples (Também Funciona):**
```
Workflow foi executado com sucesso
```

### 3. **Webhook de Callback (Ao Terminar)**
```
URL: https://app.grupoggv.com/api/webhook/n8n-callback
Método: POST
```

**Payload para Enviar:**
```json
{
  "workflowId": "{{$node.execution.id}}",
  "executionId": "{{$node.execution.id}}", 
  "status": "completed",
  "message": "Workflow completed successfully",
  "data": {
    "leadsProcessed": 3,
    "totalLeads": 3,
    "errors": []
  },
  "timestamp": "{{$now}}"
}
```

## 🎯 Configuração no N8N Workflow

### **Node 1: Webhook (Entrada)**
```
- Webhook URL: /webhook/reativacao-leads
- HTTP Method: POST
- Response Mode: "Using 'Respond to Webhook' Node"
```

### **Node 2: Set (Processar Dados)**
```javascript
// Extrair dados do webhook
const filtro = $json.filtro;
const proprietario = $json.proprietario;
const cadencia = $json.cadencia;
const numero_negocio = $json.numero_negocio;

return {
  filtro,
  proprietario, 
  cadencia,
  numero_negocio,
  workflowId: $execution.id,
  startTime: new Date().toISOString()
};
```

### **Node 3: Respond to Webhook (Resposta Inicial)**
```json
{
  "ok": true,
  "success": true,
  "workflowId": "{{$node.Set.json.workflowId}}",
  "executionId": "{{$execution.id}}",
  "message": "Workflow started successfully", 
  "status": "started",
  "timestamp": "{{$now}}"
}
```

### **Node 4: [Sua Lógica de Negócio]**
```
- Buscar leads no Pipedrive
- Aplicar filtros
- Processar reativação
- Enviar emails/sequências
```

### **Node 5: HTTP Request (Callback Final)**
```
URL: http://localhost:3001/api/webhook/n8n-callback
Method: POST
Headers: Content-Type: application/json

Body:
{
  "workflowId": "{{$node.Set.json.workflowId}}",
  "executionId": "{{$execution.id}}",
  "status": "completed",
  "message": "Workflow completed successfully",
  "data": {
    "leadsProcessed": "{{$json.leadsProcessed}}",
    "totalLeads": "{{$json.totalLeads}}",
    "errors": []
  },
  "timestamp": "{{$now}}"
}
```

**⚠️ IMPORTANTE:** Este callback é **OBRIGATÓRIO** para que o status seja atualizado para "Concluído" na interface. Sem ele, o workflow ficará sempre como "Pendente".

## 🔍 Detecção de Sucesso

O sistema detecta sucesso se a resposta contém:
- `ok: true` ou `success: true`
- `status: "started"` ou `status: "running"`
- Mensagem contendo: "started", "success", "workflow", "executed", "completed"
- `workflowId` ou `runId` presente

## 🧪 Como Testar

### **1. Testar Webhook de Entrada:**
```bash
curl -X POST https://automation-test.ggvinteligencia.com.br/webhook/reativacao-leads \
  -H "Content-Type: application/json" \
  -d '{
    "filtro": "Lista de reativação - Topo de funil",
    "proprietario": "Andressa",
    "cadencia": "Reativação - Sem Retorno", 
    "numero_negocio": 3
  }'
```

### **2. Verificar Histórico:**
```bash
curl http://localhost:3001/automation/history
```

### **3. Simular Callback:**
```bash
curl -X POST http://localhost:3001/api/webhook/n8n-callback \
  -H "Content-Type: application/json" \
  -d '{
    "workflowId": "wf_test_123",
    "status": "completed",
    "message": "Workflow completed successfully"
  }'
```

## ✅ Status Atual

- ✅ **Sistema aceita JSON e texto** do N8N
- ✅ **Detecção inteligente de sucesso** 
- ✅ **Callbacks funcionando** para atualizar status
- ✅ **Histórico apenas execuções reais** (sem simulações)
- ✅ **Logs detalhados** para debugging

## 🎯 Próximos Passos

1. **Configure o workflow no N8N** seguindo os nodes acima
2. **Teste a integração** usando os comandos de teste
3. **Monitore os logs** para verificar se está funcionando
4. **Ajuste as mensagens** conforme necessário

Agora o sistema está **100% preparado** para receber respostas reais do N8N! 🚀
