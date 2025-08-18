# Troubleshooting N8N Integration

## 🔍 Diagnóstico de Problemas

### 1. Verificar Status do N8N
1. Acesse o N8N: `https://automation-test.ggvinteligencia.com.br`
2. Verifique se está online
3. Confirme se o workflow está ativo

### 2. Testar Webhook Diretamente
```bash
# Teste básico
curl -X GET "https://app.grupoggv.com/api/webhook/diag-ggv-register?deal_id=569934"

# Teste com headers
curl -X GET \
  -H "Content-Type: application/json" \
  "https://app.grupoggv.com/api/webhook/diag-ggv-register?deal_id=569934"
```

### 3. Verificar Logs do Browser
```javascript
// No console do browser
console.log('🔍 Testando webhook...');
fetch('https://app.grupoggv.com/api/webhook/diag-ggv-register?deal_id=569934')
  .then(response => {
    console.log('Status:', response.status);
    return response.text();
  })
  .then(data => console.log('Resposta:', data))
  .catch(error => console.error('Erro:', error));
```

## 🚨 Problemas Comuns

### CORS Error
```
Access to fetch at 'https://app.grupoggv.com/api/webhook/diag-ggv-register' from origin 'https://app.grupoggv.com' has been blocked by CORS policy
```

**Solução:**
- Verificar se o servidor está configurado para aceitar requisições do domínio
- Adicionar headers CORS no servidor

### 404 Not Found
```
GET https://app.grupoggv.com/api/webhook/diag-ggv-register 404
```

**Solução:**
- Verificar se o endpoint está configurado no servidor
- Confirmar se a rota está correta

### 500 Internal Server Error
```
GET https://app.grupoggv.com/api/webhook/diag-ggv-register 500
```

**Solução:**
- Verificar logs do servidor
- Confirmar se o workflow N8N está funcionando

## 🔧 Configurações

### Variáveis de Ambiente
```bash
N8N_WEBHOOK_URL=https://app.grupoggv.com/api/webhook/diag-ggv-register
N8N_BASE_URL=https://automation-test.ggvinteligencia.com.br
```

### Headers Necessários
```
Access-Control-Allow-Origin: *
Access-Control-Allow-Methods: GET, POST
Access-Control-Allow-Headers: Content-Type
```

## 📞 Suporte

Se os problemas persistirem:
1. Verificar logs do servidor
2. Confirmar configurações do N8N
3. Testar com dados de exemplo
4. Contatar equipe de desenvolvimento
