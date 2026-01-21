# 🚀 **DEPLOY: EDGE FUNCTION DO SUPABASE**

---

## **📋 MÉTODOS DE DEPLOY**

### **OPÇÃO 1: Via Supabase CLI** ⏱️ 10min (Recomendado)

#### **1. Instalar Supabase CLI:**
```bash
# Mac/Linux
brew install supabase/tap/supabase

# Windows (usar npm)
npm install -g supabase
```

#### **2. Login:**
```bash
supabase login
```
- Vai abrir navegador para autenticar
- Faça login com sua conta Supabase

#### **3. Link ao projeto:**
```bash
cd /Users/geraldohisao/Projects/app-ggv
supabase link --project-ref mwlekwyxbfbxfxskywgx
```

#### **4. Deploy da função:**
```bash
supabase functions deploy fetch-workspace-users
```

#### **5. Pronto!** ✅

---

### **OPÇÃO 2: Via Dashboard do Supabase** ⏱️ 5min (Mais simples)

#### **1. Acessar:**
- https://supabase.com/dashboard
- Selecione seu projeto

#### **2. Menu:**
- Edge Functions → Create a new function

#### **3. Configurar:**
- **Name:** `fetch-workspace-users`
- **Code:** Copiar de `supabase/functions/fetch-workspace-users/index.ts`

#### **4. Deploy:**
- Clicar "Deploy Function"

#### **5. Pronto!** ✅

---

### **OPÇÃO 3: Copiar o código direto** ⏱️ 2min (Rápido para testar)

**POR ENQUANTO:** Vou criar uma versão que roda no FRONTEND mesmo (sem Edge Function).

**Depois:** Movemos para Edge Function quando estabilizar.

---

## **💡 RECOMENDAÇÃO:**

**Para testar rápido:** Use Opção 3 (frontend)  
**Para produção:** Use Opção 1 ou 2 (Edge Function)

---

**Qual opção prefere?** 🤔  
Ou quer que eu implemente versão frontend primeiro para testar? 🚀

