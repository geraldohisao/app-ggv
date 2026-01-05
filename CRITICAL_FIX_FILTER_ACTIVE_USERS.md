# 🚨 CORREÇÃO CRÍTICA: Filtrar Apenas Usuários Ativos

## **⚠️ PROBLEMA IDENTIFICADO:**

Atualmente, usuários INATIVOS aparecem em dropdowns do sistema porque as queries **NÃO FILTRAM** por `is_active = true`.

### **📍 Lugares Afetados:**

1. **CallsPage** - Dropdown "Todos os Usuários"
   - Arquivo: `components/Calls/pages/CallsPage.tsx`
   - Função: `fetchRealUsers()` em `services/callsService.ts`
   
2. **DashboardPage** - Dropdown "Todos os SDRs"
   - Arquivo: `components/Calls/pages/DashboardPage.tsx`
   - Função: `fetchRealUsers()` em `services/callsService.ts`

3. **ReativacaoLeadsPage** - Dropdown "Proprietário (SDR)"
   - Arquivo: `components/ReativacaoLeadsPage.tsx`
   - Função: `listProfiles()` em `services/supabaseService.ts`

---

## **✅ SOLUÇÃO:**

### **1. Atualizar `fetchRealUsers()` em `callsService.ts`**

**Linha 467-478 (ANTES):**
```typescript
const { data: usersData, error } = await supabase
  .from('profiles')
  .select(`
    id,
    full_name,
    email,
    calls!inner(count)
  `)
  .not('full_name', 'is', null)
  .neq('full_name', '')
  .not('full_name', 'like', 'Usuário%')
  .limit(50);
```

**Linha 467-479 (DEPOIS):**
```typescript
const { data: usersData, error } = await supabase
  .from('profiles')
  .select(`
    id,
    full_name,
    email,
    calls!inner(count)
  `)
  .eq('is_active', true)  // ✅ FILTRAR APENAS ATIVOS
  .not('full_name', 'is', null)
  .neq('full_name', '')
  .not('full_name', 'like', 'Usuário%')
  .limit(50);
```

---

### **2. Verificar `listProfiles()` em `supabaseService.ts`**

A RPC `list_all_profiles()` já retorna o campo `is_active`, mas precisamos filtrar no código TypeScript ou criar uma nova RPC que já filtra.

**OPÇÃO A: Filtrar no TypeScript (Rápido)**
```typescript
// No arquivo supabaseService.ts, função listProfiles()
const rows = await listProfiles();

// Adicionar filtro após receber dados:
const activeUsers = rows.filter(r => r.is_active !== false);
```

**OPÇÃO B: Criar nova RPC (Melhor Performance)**
```sql
-- No Supabase SQL Editor
CREATE OR REPLACE FUNCTION public.list_active_profiles()
RETURNS TABLE (
  id UUID,
  email TEXT,
  name TEXT,
  role TEXT,
  user_function TEXT,
  is_active BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id,
    p.email,
    p.name,
    p.role,
    p.user_function,
    p.is_active
  FROM public.profiles p
  WHERE p.is_active = true  -- ✅ APENAS ATIVOS
  ORDER BY p.created_at DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.list_active_profiles() TO authenticated, service_role;
```

---

## **🎯 IMPLEMENTAÇÃO RECOMENDADA:**

1. ✅ Atualizar `fetchRealUsers()` com filtro `.eq('is_active', true)`
2. ✅ Criar RPC `list_active_profiles()` no Supabase
3. ✅ Atualizar `ReativacaoLeadsPage` para usar nova RPC

---

## **📝 CHECKLIST:**

- [ ] Atualizar `services/callsService.ts` linha 467
- [ ] Criar RPC `list_active_profiles()` no Supabase
- [ ] Atualizar `components/ReativacaoLeadsPage.tsx` linha 210
- [ ] Testar dropdown em CallsPage
- [ ] Testar dropdown em DashboardPage
- [ ] Testar dropdown em ReativacaoLeadsPage
- [ ] Verificar se usuários inativos NÃO aparecem mais

---

## **⚡ RESULTADO ESPERADO:**

Após correção:
- ✅ Usuários inativos **NÃO** aparecerão em dropdowns
- ✅ Apenas 11 usuários ativos aparecerão (conforme query mostrada)
- ✅ Sistema ficará consistente em todos os lugares

---

**Criado em:** 2026-01-05
**Prioridade:** 🔴 CRÍTICA

