# 🔧 Troubleshooting do Webhook N8N

## ❌ **Problema Atual: 404 Not Found**

O webhook N8N está retornando **404 Not Found**, indicando que:

```
❌ PIPEDRIVE - Erro HTTP: 404 Not Found
📄 PIPEDRIVE - Conteúdo do erro: {"code":404,"message":"The requested webhook \"diag-ggv-register\" is not registered.","hint":"Click the 'Test workflow' button on the canvas, then try again. (In test mode, the webhook only works for one call after you click this button)"}
```

## 🔍 **Diagnóstico**

### **Causa Raiz:**
O webhook `diag-ggv-register` não está **ativo/registrado** no N8N.

### **Possíveis Motivos:**
1. **Workflow não foi ativado** no N8N
2. **Webhook está em modo de teste** (só funciona uma vez após clicar "Test workflow")
3. **URL do webhook está incorreta**
4. **N8N não está rodando**

## 🛠️ **Soluções**

### **1. Ativar o Workflow no N8N**
```bash
1. Acesse o N8N: https://automation-test.ggvinteligencia.com.br
2. Encontre o workflow com o webhook "diag-ggv-register"
3. Clique no botão "Activate" (switch no canto superior direito)
4. Verifique se o status mudou para "Active"
```

### **2. Verificar Configuração do Webhook**
```bash
1. No workflow do N8N, clique no nó "Webhook"
2. Verifique se o "Webhook Name" é: diag-ggv-register
3. Verifique se o "HTTP Method" é: GET
4. Verifique se "Respond" está configurado adequadamente
```

### **3. Testar o Webhook Manualmente**
```bash
# URL direta (produção)
https://automation-test.ggvinteligencia.com.br/webhook-test/diag-ggv-register?deal_id=569934

# Via proxy local (desenvolvimento)
http://localhost:5173/n8n-api/diag-ggv-register?deal_id=569934
```

### **4. Usar Console para Diagnóstico**
```javascript
// No console do navegador:
testN8nWebhook('569934')
// ou
diagnoseN8nWebhook('569934')
```

## 🎯 **Status Atual da Integração**

### ✅ **O que Está Funcionando:**
- Hook `usePipedriveData` implementado
- Proxy Vite configurado para CORS
- Detecção automática de `deal_id` na URL
- Fallback com dados simulados
- Interface visual com status
- Logs detalhados para debug

### ⚠️ **O que Precisa Ser Configurado:**
- **Webhook N8N deve ser ativado**
- **Workflow N8N deve estar rodando**
- **Endpoint deve responder com dados JSON**

## 🧪 **Dados Simulados (Temporários)**

Enquanto o webhook não estiver ativo, a integração usa dados simulados:

```json
{
  "companyName": "Empresa Simulada 569934",
  "email": "contato@empresa-simulada.com",
  "activityBranch": "Tecnologia",
  "activitySector": "Software",
  "monthlyBilling": "R$ 50.000 - R$ 100.000",
  "salesTeamSize": "5-10",
  "salesChannels": ["Online", "Presencial", "Parceiros"],
  "_simulated": true
}
```

## 📋 **Checklist para Resolver**

- [ ] **Acessar N8N**: `https://automation-test.ggvinteligencia.com.br`
- [ ] **Encontrar workflow** com webhook `diag-ggv-register`
- [ ] **Ativar o workflow** (botão "Activate")
- [ ] **Testar manualmente** a URL do webhook
- [ ] **Verificar se retorna JSON** válido
- [ ] **Testar na aplicação** com `deal_id` real

## 🔄 **Próximos Passos**

1. **Configure o webhook N8N** seguindo as instruções acima
2. **Teste com deal_id real** do Pipedrive
3. **Ajuste o mapeamento** se necessário baseado nos dados reais
4. **Remova dados simulados** quando tudo estiver funcionando

---

**A integração está 90% pronta! Só precisa ativar o webhook N8N.** 🚀
