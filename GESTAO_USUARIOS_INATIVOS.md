# 🔧 GESTÃO DE USUÁRIOS INATIVOS

## **📋 PROBLEMA IDENTIFICADO:**
Usuários que foram excluídos do Google Workspace ainda aparecem no sistema, pois:
- Quando fazem login pela primeira vez, um registro é criado em `auth.users` (Supabase Auth)
- Automaticamente é criado um perfil em `public.profiles` via trigger
- Quando o usuário é excluído do Google, o sistema não é notificado
- Os registros permanecem no banco de dados indefinidamente

---

## **✅ SOLUÇÃO IMPLEMENTADA:**

### **1️⃣ BANCO DE DADOS** ✅
**Arquivo:** `add-user-status-column.sql`

**Mudanças:**
- ✅ Adicionada coluna `is_active` (BOOLEAN) na tabela `profiles`
- ✅ Valor padrão: `true` (todos os usuários existentes ficam ativos)
- ✅ Índice criado para performance: `idx_profiles_is_active`
- ✅ Atualizada RPC `list_all_profiles()` para incluir `is_active`
- ✅ Atualizada RPC `admin_list_profiles()` para incluir `is_active`
- ✅ Criada RPC `admin_toggle_user_status(user_id, is_active)` para ativar/desativar

**Como executar:**
```sql
-- No SQL Editor do Supabase, execute:
-- Copie e cole todo o conteúdo de add-user-status-column.sql
```

---

### **2️⃣ BACKEND (TypeScript)** ✅

#### **Hook `useUsersData.ts`:**
- ✅ Adicionado campo `isActive: boolean` no tipo `UiUser`
- ✅ Adicionado filtro `statusFilter` com opções:
  - `ACTIVE` - Apenas usuários ativos (padrão)
  - `INACTIVE` - Apenas usuários inativos
  - `ALL` - Todos os usuários
- ✅ Atualizada função `updateUser()` para suportar alteração de status
- ✅ Atualizada função `bulkUpdate()` para ativação/desativação em massa

#### **Serviço `supabaseService.ts`:**
- ✅ Criada função `toggleUserStatus(userId, isActive)` com:
  - Tentativa via RPC `admin_toggle_user_status`
  - Fallback direto na tabela `profiles`
  - Logs detalhados para debug

---

### **3️⃣ FRONTEND (React)** ✅

#### **`UserRow.tsx`:**
- ✅ Visual diferenciado para usuários inativos:
  - Linha com fundo vermelho claro (`bg-red-50/30`)
  - Badge "INATIVO" ao lado do nome
  - Campos desabilitados (role e função)
- ✅ Botão de ativar/desativar:
  - 🔴 **Desativar** (vermelho) para usuários ativos
  - 🟢 **Ativar** (verde) para usuários inativos

#### **`UserTable.tsx`:**
- ✅ Adicionada coluna "Status" no cabeçalho
- ✅ Ajustado colspan para 6 colunas

#### **`UserToolbar.tsx`:**
- ✅ Adicionado dropdown de filtro de status:
  - ✅ Apenas Ativos (padrão)
  - 🔴 Apenas Inativos
  - Todos (Ativos + Inativos)

#### **`BulkBar.tsx`:**
- ✅ Botões de ação em massa:
  - 🟢 **Ativar** - Ativa todos os usuários selecionados
  - 🔴 **Desativar** - Desativa todos os usuários selecionados

---

## **🎯 COMO USAR:**

### **Cenário 1: Desativar usuário excluído do Google**
1. Abra **Configurações** → **Gerenciar Usuários**
2. Localize o usuário que foi excluído do Google
3. Clique no botão **🔴 Desativar** na coluna "Status"
4. O usuário ficará com:
   - Fundo vermelho claro
   - Badge "INATIVO"
   - Campos desabilitados
   - Não aparecerá mais na lista padrão (apenas ativos)

### **Cenário 2: Ver apenas usuários inativos**
1. Abra **Configurações** → **Gerenciar Usuários**
2. No filtro de status, selecione **🔴 Apenas Inativos**
3. Apenas usuários desativados serão exibidos

### **Cenário 3: Reativar usuário**
1. Filtre por **🔴 Apenas Inativos** ou **Todos**
2. Localize o usuário inativo
3. Clique no botão **🟢 Ativar**
4. O usuário volta a ficar ativo normalmente

### **Cenário 4: Desativar múltiplos usuários de uma vez**
1. Selecione os checkboxes dos usuários a desativar
2. Na barra inferior (BulkBar), clique em **🔴 Desativar**
3. Todos os usuários selecionados serão desativados

---

## **📊 ESTRUTURA DO BANCO DE DADOS:**

```sql
-- Tabela profiles (atualizada)
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'USER',
  user_function TEXT,
  email TEXT,
  name TEXT,
  is_active BOOLEAN DEFAULT true NOT NULL, -- ✅ NOVA COLUNA
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índice para performance
CREATE INDEX idx_profiles_is_active ON public.profiles(is_active);
```

---

## **🔐 PERMISSÕES:**

### **RPC `admin_toggle_user_status`:**
- ✅ Apenas ADMIN e SUPER_ADMIN podem executar
- ✅ Verifica permissões antes de atualizar
- ✅ Security definer (executa como proprietário da função)

### **Políticas RLS:**
- ✅ Mantidas as políticas existentes da tabela `profiles`
- ✅ Campo `is_active` pode ser atualizado apenas por admins

---

## **🎨 INTERFACE VISUAL:**

### **Usuário Ativo:**
```
┌─────────────────────────────────────────────────────────────┐
│ ☑  João Silva          joao@ggv.com    USER    SDR    🔴   │
└─────────────────────────────────────────────────────────────┘
```

### **Usuário Inativo:**
```
┌─────────────────────────────────────────────────────────────┐
│ ☑  Maria Santos [INATIVO]  maria@ggv.com  USER  SDR  🟢    │
│ (Fundo vermelho claro, campos desabilitados)                │
└─────────────────────────────────────────────────────────────┘
```

---

## **⚡ PERFORMANCE:**

### **Índice criado:**
```sql
CREATE INDEX idx_profiles_is_active ON public.profiles(is_active);
```

**Benefícios:**
- ✅ Filtros por status ficam mais rápidos
- ✅ Queries com `WHERE is_active = true` otimizadas
- ✅ Melhora performance em tabelas com muitos registros

---

## **🔍 QUERIES ÚTEIS:**

### **Ver todos os usuários inativos:**
```sql
SELECT id, name, email, role, user_function
FROM public.profiles
WHERE is_active = false
ORDER BY name;
```

### **Contar usuários por status:**
```sql
SELECT 
  COUNT(*) FILTER (WHERE is_active = true) as ativos,
  COUNT(*) FILTER (WHERE is_active = false) as inativos,
  COUNT(*) as total
FROM public.profiles;
```

### **Desativar usuário manualmente:**
```sql
UPDATE public.profiles
SET is_active = false
WHERE email = 'usuario@exemplo.com';
```

### **Ativar usuário manualmente:**
```sql
UPDATE public.profiles
SET is_active = true
WHERE email = 'usuario@exemplo.com';
```

---

## **📝 CHECKLIST DE IMPLANTAÇÃO:**

- [ ] **1. Executar SQL no Supabase:**
  - [ ] Copiar conteúdo de `add-user-status-column.sql`
  - [ ] Executar no SQL Editor do Supabase
  - [ ] Verificar se coluna `is_active` foi criada
  - [ ] Verificar se RPCs foram criadas

- [ ] **2. Deploy do Frontend:**
  - [ ] Fazer commit das alterações
  - [ ] Fazer push para repositório
  - [ ] Deploy automático (Vercel/Netlify)
  - [ ] Verificar se não há erros no build

- [ ] **3. Testar Funcionalidades:**
  - [ ] Abrir gestão de usuários
  - [ ] Verificar filtro de status
  - [ ] Desativar um usuário de teste
  - [ ] Verificar visual de usuário inativo
  - [ ] Reativar usuário de teste
  - [ ] Testar desativação em massa

- [ ] **4. Identificar Usuários Excluídos:**
  - [ ] Verificar lista de usuários ativos do Google Workspace
  - [ ] Comparar com usuários do sistema
  - [ ] Desativar usuários que não existem mais no Google

---

## **🚨 IMPORTANTE:**

### **⚠️ Usuários inativos:**
- ✅ **Podem** fazer login se ainda existirem no Google
- ✅ **Não aparecem** nas listagens por padrão (filtro = apenas ativos)
- ✅ **Permanecem** no banco de dados (soft delete)
- ✅ **Podem ser reativados** a qualquer momento

### **💡 Recomendação:**
Para usuários que foram **permanentemente excluídos do Google**, marque-os como **INATIVOS** ao invés de deletar do banco de dados. Isso preserva:
- 📊 Histórico de atividades
- 📞 Registros de chamadas
- 📝 Leads associados
- 🎯 OKRs criados

---

## **📚 ARQUIVOS MODIFICADOS:**

### **SQL:**
- ✅ `add-user-status-column.sql` (novo)

### **TypeScript:**
- ✅ `hooks/useUsersData.ts`
- ✅ `services/supabaseService.ts`

### **React Components:**
- ✅ `components/settings/UserRow.tsx`
- ✅ `components/settings/UserTable.tsx`
- ✅ `components/settings/UserToolbar.tsx`
- ✅ `components/settings/UserManagerModal.tsx`
- ✅ `components/settings/BulkBar.tsx`

---

## **✅ CONCLUSÃO:**

**Problema resolvido com sucesso!** 🎉

Agora você pode:
- ✅ Identificar usuários excluídos do Google
- ✅ Desativar usuários que não fazem mais parte da empresa
- ✅ Manter histórico completo no banco de dados
- ✅ Filtrar apenas usuários ativos
- ✅ Reativar usuários se necessário
- ✅ Fazer ativação/desativação em massa

**Por padrão, apenas usuários ATIVOS são mostrados na listagem.** 🎯

---

**Criado em:** 2026-01-05  
**Autor:** Cursor AI Assistant  
**Versão:** 1.0.0

