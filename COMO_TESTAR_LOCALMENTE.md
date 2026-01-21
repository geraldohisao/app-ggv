# 🚀 **COMO TESTAR WORKSPACE SYNC LOCALMENTE (SEM DEPLOY)**

---

## **✅ SOLUÇÃO SIMPLES (2 OPÇÕES):**

---

### **OPÇÃO 1: Usar Supabase CLI Local** ⏱️ 5min ⭐ **RECOMENDADO**

**Funciona 100% igual produção, mas local!**

#### **Passo 1: Instalar Supabase CLI**
```bash
# Mac
brew install supabase/tap/supabase

# Ou
npm install -g supabase
```

#### **Passo 2: Login**
```bash
supabase login
```

#### **Passo 3: Link ao projeto**
```bash
cd /Users/geraldohisao/Projects/app-ggv
supabase link --project-ref mwlekwyxbfbxfxskywgx
```

#### **Passo 4: Rodar Edge Function local**
```bash
supabase functions serve fetch-workspace-users --env-file .env.local
```

**Isso vai:**
- ✅ Iniciar servidor local em `http://localhost:54321`
- ✅ Servir Edge Function sem deploy!
- ✅ Buscar os **37 usuários reais** do Google! 🎉

#### **Passo 5: Testar no frontend**
- O código já está preparado para tentar localhost primeiro
- Recarregue o frontend e clique "Buscar Usuários"
- Deve funcionar! ✅

---

### **OPÇÃO 2: Usar Mock para Testar Fluxo** ⏱️ 0min

**Para testar apenas o fluxo de importação (preview, seleção, import):**

- ✅ O mock já está funcionando
- ✅ Você pode testar toda a interface
- ✅ A importação real via `workspace_sync_user()` também funciona
- ❌ Mas não busca usuários reais do Google

**Quando quiser buscar os 37 usuários reais:**
- Use Opção 1 (Supabase CLI) ou faça deploy da Edge Function

---

## **🎯 RECOMENDAÇÃO:**

**Para desenvolver/testar:**
- Use **Opção 1** (Supabase CLI local) - busca usuários reais sem deploy! ✅

**Para produção:**
- Faça deploy da Edge Function no Supabase Dashboard

---

**Prefere qual opção?** 🤔  
Posso te ajudar a configurar o Supabase CLI agora! 🚀

