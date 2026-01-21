# 🚀 **TESTAR EDGE FUNCTION LOCALMENTE (SEM DEPLOY)**

---

## **📋 PRÉ-REQUISITOS:**

### **1. Instalar Supabase CLI:**
```bash
# Mac (Homebrew)
brew install supabase/tap/supabase

# Ou via npm
npm install -g supabase
```

### **2. Login:**
```bash
supabase login
```

### **3. Link ao projeto:**
```bash
cd /Users/geraldohisao/Projects/app-ggv
supabase link --project-ref mwlekwyxbfbxfxskywgx
```

---

## **🚀 RODAR EDGE FUNCTION LOCALMENTE:**

### **1. Iniciar Supabase local:**
```bash
supabase functions serve fetch-workspace-users
```

Isso vai:
- ✅ Iniciar um servidor local na porta `54321`
- ✅ Servir a Edge Function em `http://localhost:54321/functions/v1/fetch-workspace-users`
- ✅ Usar credenciais do seu projeto Supabase

### **2. Atualizar URL no frontend (temporário):**

No arquivo `WorkspaceImportModal.tsx`, mudar temporariamente:

```typescript
const response = await fetch(`http://localhost:54321/functions/v1/fetch-workspace-users`, {
```

### **3. Testar!**
- ✅ Recarregue o frontend
- ✅ Clique "Buscar Usuários do Google"
- ✅ Vai buscar os 37 usuários reais! 🎉

---

## **⚠️ ATENÇÃO:**

**Depois de testar, volte a URL para produção:**
```typescript
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const response = await fetch(`${supabaseUrl}/functions/v1/fetch-workspace-users`, {
```

---

**Quer que eu configure isso agora ou prefere a Opção 2 (mais simples)?** 🤔

