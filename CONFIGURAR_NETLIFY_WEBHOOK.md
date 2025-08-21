# 🔧 Configurar Webhook N8N no Netlify - URGENTE

## ❌ **Problema Atual**
O webhook `https://app.grupoggv.com/.netlify/functions/n8n-callback` está retornando erro 500:
```json
{"error":"Supabase configuration missing","config":{"hasUrl":false,"hasServiceKey":false}}
```

## ✅ **Solução: Configurar Variáveis de Ambiente**

### **1. Acesse o Netlify Dashboard**
1. Vá para: https://app.netlify.com
2. Faça login na sua conta
3. Clique no site **app.grupoggv.com**
4. Vá em **Site Settings** → **Environment Variables**

### **2. Adicione estas 2 variáveis:**

#### **Variável 1:**
- **Nome:** `VITE_SUPABASE_URL`
- **Valor:** Sua URL do Supabase (algo como `https://xxx.supabase.co`)

#### **Variável 2:**
- **Nome:** `SUPABASE_SERVICE_ROLE_KEY`  
- **Valor:** Sua Service Role Key do Supabase (começa com `eyJ...`)

### **3. Como encontrar os valores:**

#### **Para VITE_SUPABASE_URL:**
1. Acesse seu projeto no Supabase Dashboard
2. Vá em **Settings** → **API**
3. Copie a **Project URL**

#### **Para SUPABASE_SERVICE_ROLE_KEY:**
1. No mesmo local (Settings → API)
2. Copie a **service_role** key (não a anon key)
3. ⚠️ **CUIDADO:** Esta é uma chave sensível!

### **4. Após configurar:**
1. **Salve** as variáveis no Netlify
2. **Aguarde 1-2 minutos** para propagação
3. **Teste** novamente a automação

### **5. Como testar se funcionou:**
Execute este comando no terminal:
```bash
curl -X POST https://app.grupoggv.com/.netlify/functions/n8n-callback \
  -H "Content-Type: application/json" \
  -d '{"workflowId":"test123","status":"completed","message":"Test"}'
```

**Resultado esperado:** Status 200 com `{"success":true}`

## 🎯 **Resultado Final**
- ✅ N8N poderá enviar callbacks de conclusão
- ✅ Status será atualizado automaticamente de "started" → "completed"  
- ✅ Sistema funcionará 100% em produção

## 📞 **Suporte**
Se tiver dúvidas, me avise que ajudo a localizar as chaves corretas!
