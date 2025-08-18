# Teste de Integração N8N

## 🧪 Como Testar

### 1. Teste Manual via Browser
1. Acesse: `https://app.grupoggv.com/diagnostico?deal_id=569934`
2. Preencha o diagnóstico
3. Verifique se os dados chegam no Pipedrive

### 2. Teste Direto do Webhook
```javascript
// No console do browser
copy(fetch('https://app.grupoggv.com/api/webhook/diag-ggv-register?deal_id=569934'))
```

### 3. Teste via cURL
```bash
curl -X GET "https://app.grupoggv.com/api/webhook/diag-ggv-register?deal_id=569934"
```

## 📊 Verificação dos Dados

### No Pipedrive:
1. Acesse o deal ID 569934
2. Verifique se os campos foram preenchidos:
   - Diagnóstico Comercial
   - Score Total
   - Link do Resultado

### No N8N:
1. Acesse: `https://automation-test.ggvinteligencia.com.br`
2. Verifique o workflow "Diagnóstico GGV"
3. Confirme se os dados estão sendo processados

## 🔍 Debug

### Logs do Browser:
```javascript
// Verificar se o webhook está sendo chamado
console.log('📍 PIPEDRIVE - URL completa: https://app.grupoggv.com/api/webhook/diag-ggv-register?deal_id=569934')
```

### Status da Resposta:
- ✅ 200: Sucesso
- ❌ 404: Endpoint não encontrado
- ❌ 500: Erro interno do servidor
