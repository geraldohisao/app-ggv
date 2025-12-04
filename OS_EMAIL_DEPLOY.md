# 📧 **Deploy da Edge Function de E-mail**

## ✅ **O QUE JÁ ESTÁ PRONTO:**

1. ✅ Configurações salvas no banco (`email_config`)
2. ✅ Service de e-mail criado (`osEmailService.ts`)
3. ✅ Edge Function criada (`send-os-email`)
4. ✅ Componentes atualizados (OSUploadModal, OSDetailModal)

---

## 🚀 **DEPLOY DA EDGE FUNCTION**

### **OPÇÃO 1: Via Supabase CLI** (Recomendado)

#### **1. Instalar Supabase CLI:**

```bash
# macOS
brew install supabase/tap/supabase

# Windows (PowerShell)
scoop bucket add supabase https://github.com/supabase/scoop-bucket.git
scoop install supabase

# Linux
brew install supabase/tap/supabase
```

#### **2. Login no Supabase:**

```bash
cd /Users/geraldohisao/Projects/app-ggv
supabase login
```

#### **3. Link com seu projeto:**

```bash
supabase link --project-ref SEU_PROJECT_REF
```

**Como encontrar o PROJECT_REF:**
- Acesse o **Supabase Dashboard**
- URL do seu projeto: `https://supabase.com/dashboard/project/[PROJECT_REF]`
- Copie o `PROJECT_REF`

#### **4. Deploy da função:**

```bash
supabase functions deploy send-os-email
```

✅ **Pronto! A função está no ar!**

---

### **OPÇÃO 2: Via Dashboard (Mais Fácil)**

Se não quiser instalar o CLI, pode fazer pelo Dashboard:

#### **1. Acessar Edge Functions:**

1. Vá no **Supabase Dashboard**
2. Clique em **Edge Functions** (menu lateral)
3. Clique em **"Create a new function"**

#### **2. Configurar a função:**

- **Nome:** `send-os-email`
- **Código:** Copie todo o conteúdo de:
  ```
  supabase/functions/send-os-email/index.ts
  ```

#### **3. Deploy:**

- Clique em **"Deploy"**
- Aguarde alguns segundos

✅ **Função publicada!**

---

## 🧪 **TESTAR A FUNÇÃO**

Execute este curl ou use o Postman:

```bash
curl -i --location --request POST 'https://SEU_PROJECT_REF.supabase.co/functions/v1/send-os-email' \
  --header 'Authorization: Bearer SEU_ANON_KEY' \
  --header 'Content-Type: application/json' \
  --data '{
    "to": "seu-email@teste.com",
    "toName": "Seu Nome",
    "subject": "Teste de E-mail OS",
    "html": "<h1>Teste</h1><p>Este é um e-mail de teste.</p>"
  }'
```

**Substitua:**
- `SEU_PROJECT_REF` → Seu project ref
- `SEU_ANON_KEY` → Anon key do Supabase
- `seu-email@teste.com` → Seu e-mail para teste

**Resposta esperada:**
```json
{
  "success": true,
  "message": "Email sent to seu-email@teste.com",
  "messageId": "..."
}
```

---

## ⚙️ **CONFIGURAR VARIÁVEIS DE AMBIENTE** (Importante!)

A Edge Function precisa acessar variáveis de ambiente. Execute:

```bash
# Via CLI
supabase secrets set SUPABASE_URL=https://SEU_PROJECT_REF.supabase.co
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=SEU_SERVICE_ROLE_KEY
```

**Ou via Dashboard:**
1. **Edge Functions** → Clique na função `send-os-email`
2. **Settings** → **Environment Variables**
3. Adicione:
   - `SUPABASE_URL`: `https://SEU_PROJECT_REF.supabase.co`
   - `SUPABASE_SERVICE_ROLE_KEY`: Sua service role key

**Como encontrar:**
- Dashboard → **Settings** → **API**
- Copie a **service_role** key (não a anon!)

---

## 🔐 **SEGURANÇA**

✅ A função usa **Service Role Key** para acessar o banco  
✅ E-mails são enviados via **SMTP autenticado**  
✅ Senha do e-mail fica **criptografada** no banco  
✅ **CORS** configurado para aceitar requisições do frontend

---

## 📋 **VERIFICAR SE ESTÁ FUNCIONANDO**

### **1. Ver logs da função:**

```bash
# Via CLI
supabase functions logs send-os-email

# Ou via Dashboard
Edge Functions → send-os-email → Logs
```

### **2. Testar no sistema:**

1. Crie uma nova OS
2. Adicione um assinante (use seu e-mail)
3. Envie
4. **Verifique sua caixa de entrada!** 📧

---

## ❌ **TROUBLESHOOTING**

### **Erro: "Function not found"**
→ Certifique-se que fez o deploy corretamente

### **Erro: "SMTP connection failed"**
→ Verifique se a senha de app está correta na tabela `email_config`

### **Erro: "Authorization required"**
→ Certifique-se que está enviando o header `Authorization` com o anon key

### **E-mail não chega:**
1. Verifique spam/lixeira
2. Veja os logs da função
3. Confirme que a senha de app está correta
4. Teste enviar direto via curl

---

## 🎯 **RESUMO DO FLUXO:**

```
Frontend (OSUploadModal)
    ↓
osEmailService.sendToAllSigners()
    ↓
Supabase Edge Function (send-os-email)
    ↓
SMTP Gmail (smtp.gmail.com:587)
    ↓
📧 E-mail entregue ao destinatário
```

---

## 📝 **PRÓXIMOS PASSOS APÓS DEPLOY:**

1. ✅ Deploy da Edge Function
2. ✅ Testar envio com seu e-mail
3. ✅ Criar uma OS de teste
4. ✅ Verificar se os e-mails chegam
5. ✅ Ajustar templates se necessário

---

**🎉 Tudo pronto! Agora o sistema envia e-mails automaticamente!**

**Dúvidas? Veja os logs ou me chama!** 🚀

