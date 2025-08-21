# 🔧 Configurar Callback Real do N8N para Desenvolvimento Local

## 🎯 **Objetivo**
Receber callbacks reais do N8N no ambiente de desenvolvimento local para testar tanto sucessos quanto falhas.

## 📋 **Pré-requisitos**
- Servidor mock rodando: `node mock-automation-server.mjs`
- N8N configurado com nodes de sucesso e falha

## 🚀 **Opção 1: Usando Ngrok (Recomendado)**

### 1. **Instalar Ngrok**
```bash
# Opção 1: Via npm
npm install -g ngrok

# Opção 2: Download direto
# Baixar de: https://ngrok.com/download
```

### 2. **Iniciar Tunnel**
```bash
# Em um terminal separado
ngrok http 3001
```

### 3. **Copiar URL do Ngrok**
```
Session Status    online
Forwarding        https://abc123.ngrok.io -> http://localhost:3001
```

### 4. **Configurar N8N**
No seu workflow do N8N, configure o callback_url como:
```
https://abc123.ngrok.io/automation/webhook/n8n-callback
```

## 🔧 **Opção 2: Usando LocalTunnel**

### 1. **Instalar LocalTunnel**
```bash
npm install -g localtunnel
```

### 2. **Iniciar Tunnel**
```bash
lt --port 3001
```

### 3. **Usar URL Gerada**
```
https://random-subdomain.loca.lt/automation/webhook/n8n-callback
```

## 📊 **Testando os Callbacks**

### **Callback de Sucesso:**
```json
{
  "workflowId": "wf_12345",
  "status": "completed",
  "message": "5 lead(s) processados",
  "leadsProcessed": 5,
  "summary": "Processamento concluído com sucesso"
}
```

### **Callback de Falha:**
```json
{
  "workflowId": "wf_12345", 
  "status": "failed",
  "message": "0 lead(s) processados",
  "leadsProcessed": 0,
  "error": "Erro específico do processamento"
}
```

## 🎯 **Configuração no N8N**

### **Node de Sucesso (Respond to Webhook):**
```json
{
  "workflowId": "Reativação de Leads",
  "status": "completed", 
  "message": "{{$json.processed_leads}} lead(s) processados",
  "leadsProcessed": "{{$json.processed_leads}}",
  "summary": "Processamento concluído com sucesso"
}
```

### **Node de Falha (Respond to Webhook):**
```json
{
  "workflowId": "Reativação de Leads",
  "status": "failed",
  "message": "0 lead(s) processados", 
  "leadsProcessed": 0,
  "error": "{{$json.error_message}}"
}
```

## 🔍 **Como Verificar se Funciona**

1. **Iniciar servidor mock:** `node mock-automation-server.mjs`
2. **Iniciar ngrok:** `ngrok http 3001`
3. **Configurar N8N** com a URL do ngrok
4. **Testar automação** na interface
5. **Verificar logs** no terminal do servidor mock
6. **Conferir interface** - status deve atualizar automaticamente

## 📋 **Status Suportados**

- ✅ **completed/success** - Workflow concluído com sucesso
- ❌ **failed** - Workflow falhou (0 leads processados)
- 🔄 **processing** - Workflow em andamento
- ⏳ **started** - Workflow iniciado, aguardando conclusão

## 🎉 **Resultado**

Agora você terá callbacks reais do N8N mostrando:
- **Sucessos reais** com número de leads processados
- **Falhas reais** quando algo der errado
- **Status em tempo real** sem simulação
- **Dados 100% reais** do Pipedrive
