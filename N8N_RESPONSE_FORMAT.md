# 📊 Formatos de Resposta do N8N - Reativação de Leads

## 🎯 **Formatos Suportados pela Aplicação**

Nossa aplicação agora suporta **múltiplos formatos** de resposta do N8N para máxima flexibilidade.

### 1. **Formato Padrão Estruturado (Recomendado)**

**Resposta Inicial (POST para webhook):**
```json
{
  "workflowId": "wf_12345",
  "executionId": "exec_67890",
  "status": "started",
  "message": "Workflow iniciado para Andressa - 25 leads",
  "timestamp": "2025-08-20T19:13:32Z"
}
```

**Callback de Progresso/Conclusão:**
```json
{
  "workflowId": "wf_12345",
  "executionId": "exec_67890", 
  "status": "completed",
  "message": "Processamento concluído: 25 leads reativados",
  "leadsProcessed": 25,
  "summary": "25 leads de Andressa processados com sucesso",
  "data": {
    "totalContacts": 25,
    "emailsSent": 25,
    "callsScheduled": 5,
    "responses": 3
  },
  "timestamp": "2025-08-20T19:13:32Z"
}
```

### 2. **Formato com Dados do Pipedrive (Suportado)**

Se o N8N enviar dados do Pipedrive diretamente:

```json
{
  "workflowId": "wf_12345",
  "status": "completed",
  "person_id": 47942,
  "org_id": null,
  "lead_id": null,
  "project_id": null,
  "content": "Link para o negócio perdido <a href='https://grupoggv.pipedrive.com/deal/58396'...",
  "add_time": "2025-08-20 19:13:32",
  "update_time": "2025-08-20 19:13:32",
  "organization": {
    "name": "Metalforce"
  },
  "person": {
    "name": "Fernando Franzini"
  },
  "deal": {
    "title": "Metalforce"
  },
  "user": {
    "email": "inovacao@grupoggv.com",
    "name": "Inovação"
  }
}
```

### 3. **Formato Misto (Melhor dos Dois Mundos)**

**Formato ideal que combina estrutura + dados do Pipedrive:**

```json
{
  "workflowId": "wf_12345",
  "executionId": "exec_67890",
  "status": "completed",
  "message": "25 leads processados com sucesso",
  "leadsProcessed": 25,
  "summary": "Reativação finalizada para Andressa",
  "deals": [
    {
      "person_id": 47942,
      "organization": { "name": "Metalforce" },
      "person": { "name": "Fernando Franzini" },
      "deal": { "title": "Metalforce" },
      "status": "contacted"
    }
  ],
  "data": {
    "totalContacts": 25,
    "emailsSent": 25,
    "responses": 3
  },
  "timestamp": "2025-08-20T19:13:32Z"
}
```

## 🔧 **Como a Aplicação Processa**

### ✅ **Detecção Automática**
A aplicação detecta automaticamente o formato e adapta o processamento:

```javascript
// Detecção de dados do Pipedrive
const isPipedriveData = body.person_id || body.org_id || body.deal;

// Extração segura de dados
const leadsProcessed = body.leadsProcessed || (body.deals ? body.deals.length : 0);
```

### 📊 **Interface Adaptativa**
A interface mostra diferentes informações baseada no que está disponível:

- **Status básico**: ✅ Workflow executado com sucesso
- **Contadores**: 📊 25 leads processados  
- **Resumo**: Resumo: 25 leads de Andressa processados com sucesso
- **Dados do Pipedrive**: 
  - 👤 Pessoa: Fernando Franzini
  - 🏢 Empresa: Metalforce
  - 💼 Deal: Metalforce

## 🛠️ **Configuração Recomendada no N8N**

### **Resposta do Webhook (Node: Respond to Webhook)**

```json
{
  "workflowId": "{{ $('Webhook').item.json.workflowId }}",
  "executionId": "{{ $workflow.id }}",
  "status": "started",
  "message": "Workflow iniciado para {{ $('Webhook').item.json.proprietario }} - {{ $('Webhook').item.json.numero_negocio }} leads",
  "timestamp": "{{ $now }}"
}
```

### **Callback de Conclusão (HTTP Request para nossa API)**

**URL**: `https://app.grupoggv.com/.netlify/functions/n8n-callback`

**Body**:
```json
{
  "workflowId": "{{ $workflow.id }}",
  "executionId": "{{ $workflow.id }}",
  "status": "completed",
  "message": "Processamento concluído: {{ $('Process Leads').item.json.processed_count }} leads reativados",
  "leadsProcessed": "{{ $('Process Leads').item.json.processed_count }}",
  "summary": "{{ $('Process Leads').item.json.processed_count }} leads de {{ $('Webhook').item.json.proprietario }} processados com sucesso",
  "deals": "{{ $('Pipedrive Operations').item.json }}",
  "data": {
    "totalContacts": "{{ $('Process Leads').item.json.total }}",
    "emailsSent": "{{ $('Send Emails').item.json.sent_count }}",
    "responses": "{{ $('Check Responses').item.json.response_count }}"
  },
  "timestamp": "{{ $now }}"
}
```

## 🎯 **Status Suportados**

| Status | Descrição | Interface |
|--------|-----------|-----------|
| `started` | Workflow iniciado | 🚀 Iniciando |
| `connecting` | Conectando com APIs | 🔌 Conectando |
| `fetching` | Buscando dados | 🔍 Buscando |
| `processing` | Processando leads | ⚙️ Processando |
| `finalizing` | Finalizando | 📝 Finalizando |
| `completed` | Concluído com sucesso | ✅ Concluído |
| `success` | Sucesso | ✅ Sucesso |
| `failed` | Falhou | ❌ Erro |
| `error` | Erro | ❌ Erro |

## 🔍 **Debugging e Logs**

### **No Console da Aplicação**:
```
📊 N8N CALLBACK - Dados do Pipedrive detectados: { person_id: 47942, org_id: null, deal_title: "Metalforce" }
✅ N8N CALLBACK - Processando: { workflowId: "wf_12345", status: "completed", message: "25 leads processados" }
```

### **Na Interface**:
- Progresso em tempo real com barras visuais
- Detalhes expandíveis com dados técnicos
- Cards com informações do Pipedrive quando disponível

---

**✅ A aplicação está preparada para receber qualquer um desses formatos!**
