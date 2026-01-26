# 🎨 **Como Configurar o Logo do Grupo GGV no Google OAuth**

## 🎯 **Problema Identificado**
O logo do Grupo GGV não aparece na tela de autenticação do Google porque precisa ser configurado no **Google Cloud Console** na seção **OAuth Consent Screen**.

---

## 🚀 **SOLUÇÃO PASSO A PASSO**

### **📋 Pré-requisitos**
- Acesso ao [Google Cloud Console](https://console.cloud.google.com)
- Permissões de administrador no projeto da GGV
- Logo do Grupo GGV em formato adequado (PNG/JPEG)

---

### **🔧 PASSO 1: Acessar Google Cloud Console**

1. **Acesse**: https://console.cloud.google.com
2. **Selecione o projeto** da GGV (onde está configurado o OAuth)
3. **Navegue para**: `APIs & Services` → `OAuth consent screen`

---

### **🎨 PASSO 2: Configurar Logo na OAuth Consent Screen**

#### **2.1 - Seção "App Information"**
```
✅ Application name: "APP GGV" ou "Grupo GGV"
✅ User support email: geraldo@grupoggv.com
🎨 Application logo: [FAZER UPLOAD DO LOGO]
✅ Application home page: https://app.grupoggv.com
```

#### **2.2 - Requisitos do Logo**
- **Formato**: PNG ou JPEG
- **Tamanho**: 120x120 pixels (recomendado)
- **Tamanho máximo**: 1MB
- **Fundo**: Preferencialmente transparente (PNG)

#### **2.3 - Seção "App Domain"**
```
✅ Application home page: https://app.grupoggv.com
✅ Application privacy policy: https://app.grupoggv.com/privacy
✅ Application terms of service: https://app.grupoggv.com/terms
```

#### **2.4 - Seção "Developer Contact Information"**
```
✅ Developer contact information: geraldo@grupoggv.com
```

---

### **🔍 PASSO 3: Verificar Configurações Atuais**

#### **3.1 - Verificar Scopes Configurados**
Certifique-se que estes escopos estão configurados:
```
✅ openid
✅ email  
✅ profile
✅ https://www.googleapis.com/auth/gmail.send
✅ https://www.googleapis.com/auth/gmail.compose
✅ https://www.googleapis.com/auth/gmail.readonly
✅ https://www.googleapis.com/auth/calendar.events     (para criar/gerenciar eventos no Google Calendar)
✅ https://www.googleapis.com/auth/drive.readonly      (para ler transcrições do Google Drive)
✅ https://www.googleapis.com/auth/documents.readonly  (para ler conteúdo do Google Docs)
```

#### **3.2 - Verificar URLs Autorizadas**
```
✅ https://app.grupoggv.com
✅ https://app.grupoggv.com/
✅ https://app.grupoggv.com/diagnostico
✅ https://mwlekwyxbfbxfxskywgx.supabase.co/auth/v1/callback
```

---

### **💾 PASSO 4: Salvar e Publicar**

1. **Clique em "Save and Continue"** em cada seção
2. **Revise todas as configurações**
3. **Clique em "Back to Dashboard"**
4. **Status deve ser**: `In production` ou `Testing`

---

## 🧪 **COMO TESTAR**

### **Teste 1: Verificar Logo**
1. **Acesse**: https://app.grupoggv.com
2. **Clique em**: "Login com Google"
3. **Verifique**: Logo do Grupo GGV deve aparecer na tela do Google

### **Teste 2: Teste Completo**
1. **Faça logout** se estiver logado
2. **Limpe cache** do navegador
3. **Acesse novamente** e teste o login
4. **Verifique**: Nome da aplicação e logo corretos

---

## 🚨 **PROBLEMAS COMUNS**

### **Logo não aparece**
- ✅ Verificar se o upload foi bem-sucedido
- ✅ Verificar tamanho e formato do arquivo
- ✅ Aguardar até 24h para propagação

### **Nome da aplicação incorreto**
- ✅ Verificar campo "Application name" na OAuth Consent Screen
- ✅ Salvar alterações

### **Tela genérica do Google**
- ✅ Verificar se o projeto está correto
- ✅ Verificar se as configurações foram salvas
- ✅ Verificar se o Client ID está correto

---

## 📸 **EXEMPLO DO RESULTADO ESPERADO**

Após a configuração, a tela de login deve mostrar:

```
┌─────────────────────────────────────┐
│  [LOGO GGV]                         │
│                                     │
│  Fazer Login com o Google           │
│                                     │
│  para prosseguir para APP GGV       │
│                                     │
│  Geraldo Hisao                      │
│  geraldo@grupoggv.com              │
│  [Continuar]                        │
│                                     │
│  Geraldo Hisao                      │
│  geraldo.hisao@gmail.com           │
│  [Continuar]                        │
│                                     │
│  [Usar outra conta]                 │
└─────────────────────────────────────┘
```

---

## 🔗 **LINKS IMPORTANTES**

- **Google Cloud Console**: https://console.cloud.google.com
- **OAuth Consent Screen**: https://console.cloud.google.com/apis/credentials/consent
- **Aplicação Produção**: https://app.grupoggv.com
- **Teste Debug**: https://app.grupoggv.com/debug-oauth-production.html

---

## ✅ **CHECKLIST FINAL**

- [ ] ✅ Logo do GGV carregado (120x120px, PNG/JPEG)
- [ ] ✅ Nome da aplicação: "APP GGV"
- [ ] ✅ Email de suporte: geraldo@grupoggv.com
- [ ] ✅ URLs autorizadas configuradas
- [ ] ✅ Scopes necessários configurados
- [ ] ✅ Configurações salvas
- [ ] ✅ Teste realizado com sucesso

---

## 🎯 **RESULTADO FINAL**

Após seguir estes passos, o **logo do Grupo GGV** aparecerá na tela de autenticação do Google, dando uma aparência profissional e branded para o login da aplicação! 🚀

**⚡ IMPORTANTE**: As alterações podem levar até 24 horas para serem propagadas completamente pelo sistema do Google.
