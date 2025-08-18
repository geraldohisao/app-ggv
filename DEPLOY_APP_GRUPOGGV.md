# 🚀 Deploy para app.grupoggv.com

## 📋 Checklist de Configuração

### ✅ **Configurações Atualizadas**

1. **Netlify.toml**
   - ✅ Domínio configurado: `app.grupoggv.com`
   - ✅ Variável de ambiente: `VITE_APP_DOMAIN`
   - ✅ Headers de segurança atualizados

2. **URLs de Webhook**
   - ✅ Pipedrive: `https://app.grupoggv.com/api/webhook/diag-ggv-register`
   - ✅ N8N: `https://app.grupoggv.com/api/webhook/diag-ggv-register`

3. **Configurações de Ambiente**
   - ✅ Vite configurado para produção
   - ✅ CSP atualizado para novo domínio
   - ✅ Proxy configurado corretamente

### 🔧 **Configurações no Netlify**

#### **Variáveis de Ambiente**
```bash
NODE_ENV=production
VITE_APP_DOMAIN=app.grupoggv.com
VITE_API_BASE_URL=https://app.grupoggv.com/api
VITE_CALLS_API_BASE=https://app.grupoggv.com/api
VITE_PIPEDRIVE_WEBHOOK_URL=https://app.grupoggv.com/api/webhook/diag-ggv-register
VITE_N8N_WEBHOOK_URL=https://app.grupoggv.com/api/webhook/diag-ggv-register
```

#### **Domínio Customizado**
- **Domínio Principal**: `app.grupoggv.com`
- **SSL**: Automático (Netlify)
- **DNS**: Configurado via Netlify

### 🧪 **Testes Pós-Deploy**

#### **1. Teste de Acesso**
```bash
# Teste básico
curl -I https://app.grupoggv.com

# Teste de diagnóstico
curl -I https://app.grupoggv.com/diagnostico?deal_id=569934
```

#### **2. Teste de Webhook**
```bash
# Teste do webhook Pipedrive
curl -X GET "https://app.grupoggv.com/api/webhook/diag-ggv-register?deal_id=569934"
```

#### **3. Teste de Funcionalidades**
- ✅ Acesso ao diagnóstico
- ✅ Preenchimento automático com deal_id
- ✅ Envio de e-mail
- ✅ Geração de relatórios
- ✅ Integração com Pipedrive

### 🔍 **URLs Importantes**

#### **Aplicação Principal**
- **Home**: `https://app.grupoggv.com`
- **Diagnóstico**: `https://app.grupoggv.com/diagnostico`
- **Resultado**: `https://app.grupoggv.com/resultado-diagnostico`

#### **APIs e Webhooks**
- **Webhook Pipedrive**: `https://app.grupoggv.com/api/webhook/diag-ggv-register`
- **API de Chamadas**: `https://app.grupoggv.com/api/calls`

#### **Relatórios Públicos**
- **Formato**: `https://app.grupoggv.com/r/{token}`

### 🚨 **Monitoramento**

#### **Logs Importantes**
```javascript
// No console do browser
console.log('🔍 Testando webhook...');
fetch('https://app.grupoggv.com/api/webhook/diag-ggv-register?deal_id=569934')
  .then(response => console.log('Status:', response.status))
  .catch(error => console.error('Erro:', error));
```

#### **Métricas a Acompanhar**
- ✅ Tempo de carregamento
- ✅ Taxa de erro 404/500
- ✅ Sucesso de webhooks
- ✅ Performance de diagnóstico

### 🔄 **Rollback (se necessário)**

Se houver problemas, o Netlify mantém:
- **Deploys anteriores** disponíveis
- **Branch de produção** configurado
- **Domínio antigo** ainda funcional

### 📞 **Suporte**

**Em caso de problemas:**
1. Verificar logs do Netlify
2. Testar URLs de diagnóstico
3. Confirmar configurações de ambiente
4. Verificar integrações externas

---

**✅ Deploy configurado e pronto para produção!**
