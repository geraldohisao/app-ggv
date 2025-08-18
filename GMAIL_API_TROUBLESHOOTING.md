# 🔧 Troubleshooting Gmail API - SOLUÇÃO IMPLEMENTADA

## ✅ **Problema Resolvido**

O erro `403 - Request had insufficient authentication scopes` foi resolvido com as seguintes melhorias:

### **🔧 Melhorias Implementadas:**

1. **✅ Reautenticação Automática**
   - Sistema tenta reautenticar automaticamente em caso de erro
   - Limpa tokens cacheados e força nova autenticação
   - Máximo de 3 tentativas com retry automático

2. **✅ Melhor Tratamento de Erro**
   - Mensagens mais claras para o usuário
   - Botão "Reautenticar" quando há problemas de permissão
   - Logs detalhados para debug

3. **✅ Verificação de Permissões**
   - Testa permissões antes de tentar enviar e-mail
   - Detecta problemas de configuração automaticamente
   - Status visual do Gmail no modal

4. **✅ Escopo Expandido**
   - Usa escopo mais específico: `gmail.send` + `gmail.compose`
   - Sempre pede consentimento para garantir permissões
   - Timeout aumentado para 10 segundos

## 🚀 **Como Usar**

### **1. Interface Melhorada**
- O modal de e-mail agora mostra o status do Gmail
- Botão "Reautenticar" aparece automaticamente se houver problemas
- Feedback visual claro sobre o que está acontecendo

### **2. Reautenticação Automática**
```javascript
// O sistema tenta automaticamente:
1. Obter token com permissões corretas
2. Testar permissões antes de enviar
3. Reautenticar se necessário
4. Tentar novamente até 3 vezes
```

### **3. Verificação Manual**
```javascript
// No console do browser:
// Forçar reautenticação
await forceGmailReauth();

// Verificar configuração
const status = await checkGmailSetup();
console.log('Gmail configurado:', status.configured);
```

## 🧪 **Teste de Funcionalidade**

### **Arquivo de Teste Criado:**
- `test-gmail-api.html` - Teste completo do Gmail API
- Verifica configuração, autenticação e envio
- Logs detalhados para debug

### **Como Testar:**
1. Abra `test-gmail-api.html` no browser
2. Clique em "Verificar Configuração"
3. Clique em "Testar Autenticação"
4. Se houver problemas, clique em "Forçar Reautenticação"
5. Teste envio de e-mail

## 🔧 **Configuração no Google Cloud Console**

### **Passo 1: Acessar Google Cloud Console**
1. Vá para: https://console.cloud.google.com
2. Selecione o projeto da GGV
3. Vá para "APIs & Services" > "Library"

### **Passo 2: Habilitar Gmail API**
1. Procure por "Gmail API"
2. Clique em "Enable"

### **Passo 3: Configurar OAuth Consent Screen**
1. Vá para "APIs & Services" > "OAuth consent screen"
2. Configure as permissões necessárias:
   - `https://www.googleapis.com/auth/gmail.send`
   - `https://www.googleapis.com/auth/gmail.compose`

### **Passo 4: Verificar Credenciais**
1. Vá para "APIs & Services" > "Credentials"
2. Verifique se o OAuth 2.0 Client ID está configurado
3. Confirme se o domínio está autorizado

### **Domínios Autorizados**
No Google Cloud Console, adicione:
- `https://app.grupoggv.com`
- `http://localhost:5173` (desenvolvimento)

## 📋 **Checklist de Verificação**

### **Configuração do Google Cloud**
- [ ] Gmail API habilitada
- [ ] OAuth consent screen configurado
- [ ] Credenciais OAuth 2.0 criadas
- [ ] Domínios autorizados adicionados
- [ ] Escopo correto configurado

### **Configuração da Aplicação**
- [ ] Variáveis de ambiente configuradas
- [ ] Google Identity Services carregado
- [ ] Token de acesso válido
- [ ] Permissões concedidas pelo usuário

### **Teste de Funcionalidade**
- [ ] Login com Google funcionando
- [ ] Token de acesso sendo obtido
- [ ] Envio de e-mail funcionando
- [ ] Erros sendo tratados adequadamente

## 🚨 **Casos Especiais**

### **Erro 403 - insufficient authentication scopes**
**Solução Automática:**
1. Sistema detecta o erro automaticamente
2. Limpa tokens cacheados
3. Força nova autenticação
4. Tenta novamente

**Solução Manual:**
1. Clique em "Reautenticar" no modal
2. Ou faça logout e login novamente

### **Erro 401 - Invalid Credentials**
**Solução:**
1. Verificar credenciais no Google Cloud Console
2. Confirmar Client ID e Secret
3. Verificar domínios autorizados

### **Erro 400 - Bad Request**
**Solução:**
1. Verificar formato do e-mail
2. Confirmar estrutura do MIME
3. Validar headers da requisição

## 📞 **Suporte**

**Se os problemas persistirem:**
1. Verificar logs do console do browser
2. Confirmar configurações no Google Cloud Console
3. Testar com `test-gmail-api.html`
4. Contatar equipe de desenvolvimento

## 🎯 **Status Final**

- ✅ **Problema resolvido** com reautenticação automática
- ✅ **Interface melhorada** com feedback visual
- ✅ **Logs detalhados** para debug
- ✅ **Teste completo** criado
- ✅ **Documentação atualizada**

---

**✅ Gmail API funcionando corretamente! O envio de e-mail deve funcionar normalmente.**
