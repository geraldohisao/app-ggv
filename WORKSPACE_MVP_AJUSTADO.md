# 🎯 **WORKSPACE SYNC MVP - VERSÃO FINAL AJUSTADA**

---

## **✅ AJUSTES INCORPORADOS:**

### **1️⃣ Role Editável (não sobrescreve):**

**Comportamento:**
- ✅ **Primeira importação:** Role é inferido do Google (CEO→SUPER_ADMIN, Head→ADMIN, etc)
- ✅ **Campo `role_source`** criado: `'google'` ou `'manual'`
- ✅ **Se você editar** o role manualmente → `role_source = 'manual'`
- ✅ **Próximas importações:** NÃO sobrescrevem role se `role_source = 'manual'`
- ✅ **Você tem controle total** sobre roles mesmo após sync

**Exemplo:**
```
Importação inicial:
  João (Head Comercial no Google) → role: ADMIN, role_source: 'google'

Você edita manualmente:
  João → role: USER (decisão interna) → role_source: 'manual'

Próxima importação:
  João continua como USER (NÃO sobrescreve porque role_source = 'manual')
```

---

### **2️⃣ Exclusão = Desativação (preserva histórico):**

**Comportamento:**
- ✅ **Usuário removido/suspenso no Google** → `is_active = false` no GGV
- ✅ **NÃO deleta** o registro da tabela
- ✅ **Preserva histórico:** OKRs, Sprints, KRs, chamadas, etc
- ✅ **Bloqueia login** automaticamente (via RLS)
- ✅ **Esconde da UI** (filtro de ativos)

**Benefícios:**
- ✅ Auditoria completa
- ✅ Relatórios históricos intactos
- ✅ Possível reativar depois se necessário

---

## **📊 LÓGICA COMPLETA DE SYNC**

### **Cenário 1: Novo usuário no Google**
```
Google: Maria Silva (SDR, Comercial, ativo)
  ↓
GGV: Criar profile:
  - name: "Maria Silva"
  - email: "maria@grupoggv.com"
  - cargo: "SDR"
  - department: "comercial"
  - role: "USER" (inferido)
  - role_source: "google"
  - is_active: true
```

### **Cenário 2: Usuário já existe (atualização)**
```
Google: João (agora é Coordenador)
GGV (antes): João (SDR)
  ↓
GGV (depois): 
  - cargo: "Coordenador" ✅ atualiza
  - department: atualiza se mudou ✅
  - role: SÓ atualiza se role_source = 'google' ⚠️
  - is_active: sincroniza ✅
```

### **Cenário 3: Usuário removido do Google**
```
Google: João foi removido
  ↓
GGV: 
  - is_active: false ✅
  - Mantém todos os dados ✅
  - Bloqueia login ✅
  - Histórico preservado ✅
```

### **Cenário 4: Role editado manualmente**
```
GGV: Admin promove Maria de USER → ADMIN
  ↓
GGV: role_source = 'manual' ✅

Próxima importação:
  Google: Maria continua SDR
  GGV: Mantém role = ADMIN (não sobrescreve) ✅
```

---

## **🔧 IMPLEMENTAÇÃO ATUALIZADA**

### **Tabelas (30min):**

```sql
-- 1. Adicionar campos de controle
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS role_source TEXT DEFAULT 'manual';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS google_id TEXT UNIQUE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS last_synced_at TIMESTAMPTZ;

-- 2. Log de sincronizações
CREATE TABLE workspace_sync_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  synced_at TIMESTAMPTZ DEFAULT NOW(),
  users_imported INTEGER DEFAULT 0,
  users_updated INTEGER DEFAULT 0,
  users_skipped INTEGER DEFAULT 0,
  users_deactivated INTEGER DEFAULT 0,
  triggered_by UUID REFERENCES profiles(id),
  summary JSONB,
  errors JSONB
);

-- 3. Índices
CREATE INDEX IF NOT EXISTS idx_profiles_google_id ON profiles(google_id);
CREATE INDEX IF NOT EXISTS idx_profiles_role_source ON profiles(role_source);
```

---

### **Lógica de Sync (Edge Function):**

```typescript
async function syncUser(googleUser: any, existingProfile: any | null) {
  const mappedData = {
    email: googleUser.primaryEmail,
    name: googleUser.name.fullName,
    cargo: mapCargo(googleUser.organizations?.[0]?.title),
    department: mapDepartment(googleUser.organizations?.[0]?.department),
    is_active: !googleUser.suspended,
    google_id: googleUser.id,
    last_synced_at: new Date().toISOString(),
  };
  
  // Se é novo usuário
  if (!existingProfile) {
    return {
      ...mappedData,
      role: inferRole(googleUser),
      role_source: 'google', // ✅ Primeira vez = inferido
    };
  }
  
  // Se já existe
  return {
    ...mappedData,
    // ⚠️ SÓ atualiza role se não foi editado manualmente
    ...(existingProfile.role_source === 'google' && {
      role: inferRole(googleUser),
      role_source: 'google'
    })
  };
}
```

---

### **Proteção ao editar role manualmente:**

```typescript
// Em setUserRole (supabaseService.ts)
export const setUserRole = async (userId: string, role: UserRole) => {
  await supabase
    .from('profiles')
    .update({ 
      role: role,
      role_source: 'manual' // ✅ Marca como editado manualmente
    })
    .eq('id', userId);
};
```

---

## **🎨 INTERFACE DE IMPORT**

### **Tela: Settings → Integração Google Workspace**

**Preview Table:**
| ✓ | Email | Nome | Cargo (Google) | → | Cargo (GGV) | Dept | Role | Ação |
|---|-------|------|----------------|---|-------------|------|------|------|
| ☑️ | maria@grupoggv.com | Maria Silva | SDR | → | SDR | comercial | USER | **Criar** |
| ☑️ | joao@grupoggv.com | João | Coordenador | → | Coordenador | comercial | ADMIN | **Atualizar** |
| ☐ | ex@grupoggv.com | Ex-funcionário | - | → | - | - | - | **Desativar** |

**Botões:**
- ✅ Selecionar todos
- ✅ Apenas novos
- ✅ Apenas atualizações
- 🚀 Importar selecionados (X usuários)

**Avisos:**
- ⚠️ "3 usuários com cargo não mapeado (serão importados como 'Analista')"
- ⚠️ "2 usuários têm role editado manualmente (não será sobrescrito)"
- ℹ️ "5 usuários suspensos no Google (serão desativados)"

---

## **📋 PRÓXIMOS PASSOS**

**Para você fazer:**

1. **Me passar informações:**
   - Cargos usados no Google Workspace (títulos exatos)
   - Departamentos no Google
   - Se usa campos customizados

2. **Configurar Google Cloud:**
   - Criar Service Account
   - Ativar Admin SDK
   - Domain-wide delegation

3. **Fornecer credenciais:**
   - JSON da service account (guardo no Supabase Vault)

**Para eu fazer:**

1. ✅ Criar regras de mapeamento precisas
2. ✅ Implementar Edge Function
3. ✅ Criar interface de import com preview
4. ✅ Adicionar campos de controle (role_source, google_id)
5. ✅ Testar com dados reais

---

## **⏱️ TIMELINE**

**Você:**
- Setup Google Cloud: 1h
- Me passar info: 15min

**Eu:**
- Implementação MVP: 6h

**TOTAL: ~7-8h (1 dia de trabalho)** ✅

---

## **🚀 POSSO COMEÇAR?**

**Me mande:**
1. ✅ Lista de cargos do Google Workspace
2. ✅ Lista de departamentos do Google Workspace
3. ✅ Confirma que vai criar Service Account
4. ✅ Diz "pode começar!" 

E eu implemento o MVP completo! 🚀

---

**Aguardo suas informações para começar!** 😊

