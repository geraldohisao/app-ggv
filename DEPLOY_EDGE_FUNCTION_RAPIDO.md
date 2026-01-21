# 🚀 **DEPLOY RÁPIDO: EDGE FUNCTION DO SUPABASE**

---

## **📋 MÉTODO MAIS RÁPIDO (Via Dashboard - 5min)**

### **1. Acesse o Supabase Dashboard:**
- https://supabase.com/dashboard
- Selecione seu projeto

### **2. Vá em Edge Functions:**
- Menu lateral: **Edge Functions**
- Clique **"Create a new function"**

### **3. Configurar:**
- **Function name:** `fetch-workspace-users`
- **Código:** Copie TODO o conteúdo de:
  - `supabase/functions/fetch-workspace-users/index.ts`

### **4. Deploy:**
- Clique **"Deploy Function"**
- Aguarde ~1 minuto

### **5. Pronto!** ✅
- A função estará disponível em:
  - `https://seu-projeto.supabase.co/functions/v1/fetch-workspace-users`

---

## **🔧 VARIÁVEIS DE AMBIENTE (Se necessário):**

A Edge Function usa essas variáveis (já configuradas automaticamente):
- `SUPABASE_URL` ✅
- `SUPABASE_SERVICE_ROLE_KEY` ✅

**As credenciais do Google** estão no banco (`app_settings`), então não precisa configurar nada extra!

---

## **✅ TESTE:**

Depois do deploy, teste novamente a importação no frontend:
- Deve buscar **todos os 37 usuários** do Google Workspace! 🎉

---

**Quer que eu faça o deploy agora ou você prefere fazer?** 🤔  
O código já está pronto, só falta fazer o deploy! 😊

