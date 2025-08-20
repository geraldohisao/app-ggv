# 🔧 Troubleshooting - Reativação de Leads N8N

## 🎯 **Problemas Mais Comuns**

### **1. ❌ "N8N Webhook não encontrado"**

**Causa:** Workflow não está ativo no N8N ou URL incorreta

**Soluções:**
1. **Verificar se workflow está ATIVO no N8N**
   - Acessar N8N: `https://api-test.ggvinteligencia.com.br`
   - Encontrar workflow "Reativação de Leads"
   - Verificar se toggle está ATIVO (verde)

2. **Verificar URL do webhook**
   - URL atual: `https://api-test.ggvinteligencia.com.br/webhook/reativacao-leads`
   - Se mudou, atualizar em `services/automationService.ts`

3. **Testar webhook manualmente**
   ```bash
   curl -X POST https://api-test.ggvinteligencia.com.br/webhook/reativacao-leads \
     -H "Content-Type: application/json" \
     -d '{"test": true}'
   ```

### **2. ⏰ "Timeout" mas workflow executou**

**Causa:** N8N demorou mais que 45s para responder

**Comportamento:** 
- ✅ **Normal** - Workflow continua rodando no N8N
- ✅ **Status será atualizado** quando N8N enviar callback

**Não é erro!** Sistema projetado para isso.

### **3. 🔄 "Status fica 'started' para sempre"**

**Causa:** Callback do N8N não está chegando

**Soluções:**

#### **Em Desenvolvimento Local:**
- Sistema usa **polling** - aguardar 45s para simular conclusão
- Ou usar botão "✅ Marcar Concluído" manualmente

#### **Em Produção:**
- Verificar se N8N está configurado para enviar callback para:
  `https://app.grupoggv.com/.netlify/functions/n8n-callback`

### **4. 🚫 "Falha ao conectar com N8N: N8N retornou erro"**

**Causa:** Resposta do N8N foi interpretada como erro

**Debug:**
1. **Verificar logs no console do browser**
2. **Verificar resposta real do N8N:**
   ```bash
   # Testar webhook
   curl -v -X POST https://api-test.ggvinteligencia.com.br/webhook/reativacao-leads \
     -H "Content-Type: application/json" \
     -d '{
       "filtro": "Lista de reativação - Topo de funil - NO SHOW",
       "proprietario": "Lô-Ruama Oliveira", 
       "cadencia": "Reativação - Sem Retorno",
       "numero_negocio": 1
     }'
   ```

## 🛠️ **Como Debugar**

### **1. Verificar Logs no Browser**
```javascript
// No console do browser
window.debugLog = (category, level, tag, data) => {
  console.log(`[${tag}] ${category}:`, data);
};
```

### **2. Verificar Status do Servidor Mock**
```bash
# Verificar se está rodando
curl http://localhost:3001/automation/history

# Verificar logs
ps aux | grep mock-automation
```

### **3. Testar Callback Manual**
```bash
# Simular callback do N8N
curl -X POST http://localhost:3001/automation/webhook/n8n-callback \
  -H "Content-Type: application/json" \
  -d '{
    "workflowId": "SEU_WORKFLOW_ID",
    "status": "completed",
    "message": "Teste manual",
    "leadsProcessed": 1
  }'
```

## 📋 **Checklist de Verificação**

### **Antes de Testar:**
- [ ] Servidor mock rodando (`node mock-automation-server.mjs`)
- [ ] Workflow N8N ativo
- [ ] URL correta no código
- [ ] Console do browser aberto para logs

### **Durante o Teste:**
- [ ] Mensagem inicial aparece ("Automação REAL iniciada")
- [ ] Logs no console mostram requisição para N8N
- [ ] Resposta do N8N é logada
- [ ] Status no histórico é atualizado

### **Após 45 segundos:**
- [ ] Status muda para "completed" ou "failed"
- [ ] Detalhes técnicos mostram resultado
- [ ] Botão "Marcar Concluído" some

## 🎯 **Status Esperados**

| Status | Descrição | Ação |
|--------|-----------|------|
| `started` | Workflow iniciado no N8N | ✅ Normal - aguardar |
| `processing` | N8N processando dados | ✅ Normal - aguardar |
| `completed` | Sucesso total | ✅ Concluído |
| `failed` | Falha no workflow | ❌ Verificar logs N8N |
| `error` | Erro de comunicação | 🔧 Verificar conectividade |

## 🚀 **Próximos Passos**

Se problema persistir:
1. **Verificar workflow no N8N diretamente**
2. **Testar com dados mínimos**
3. **Verificar logs do servidor N8N**
4. **Contatar administrador do N8N**
