# 🎯 **WORKSPACE SYNC - MVP SIMPLIFICADO**

---

## **📋 ESCOPO DO MVP**

### **O QUE VAI FAZER:**
- ✅ Botão "Importar do Google Workspace"
- ✅ Busca usuários do Google automaticamente
- ✅ Mapeia: email, nome, cargo, departamento, status
- ✅ Preview antes de importar (você aprova)
- ✅ Importação em batch
- ✅ **Google = fonte de verdade** (unidirecional)
- ✅ Sync manual quando quiser

### **O QUE NÃO VAI FAZER (por enquanto):**
- ❌ Webhook automático
- ❌ Sync bidirecional
- ❌ OUs complexas
- ❌ Logs elaborados

---

## **🔧 IMPLEMENTAÇÃO TÉCNICA**

### **FASE 1: Setup Google (30min)**

**A) Criar Service Account:**
1. Google Cloud Console → Criar projeto "GGV Workspace Sync"
2. Ativar Admin SDK API
3. Criar Service Account
4. Download JSON de credenciais
5. Domain-wide delegation no Workspace

**B) Armazenar credenciais:**
```sql
-- No Supabase
INSERT INTO app_settings (key, value) VALUES
('google_workspace_credentials', '{"type": "service_account", ...}');
```

---

### **FASE 2: Edge Function de Import (2h)**

**Arquivo:** `supabase/functions/import-workspace-users/index.ts`

```typescript
import { google } from 'googleapis';

export async function handler(req: Request) {
  // 1. Autenticar
  const auth = getGoogleAuth();
  const admin = google.admin({ version: 'directory_v1', auth });
  
  // 2. Buscar usuários do Workspace
  const { data } = await admin.users.list({
    domain: 'grupoggv.com',
    maxResults: 500,
    projection: 'full'
  });
  
  // 3. Mapear para formato GGV
  const mappedUsers = data.users.map(googleUser => ({
    email: googleUser.primaryEmail,
    name: googleUser.name.fullName,
    cargo: mapCargo(googleUser.organizations?.[0]?.title),
    department: mapDepartment(googleUser.organizations?.[0]?.department),
    is_active: !googleUser.suspended,
    role: inferRole(googleUser), // Regra de negócio
    google_id: googleUser.id,
  }));
  
  return new Response(JSON.stringify(mappedUsers), {
    headers: { 'Content-Type': 'application/json' }
  });
}
```

---

### **FASE 3: Regras de Mapeamento (1h)**

**Mapeamento de Cargo:**
```typescript
function mapCargo(googleTitle: string | undefined): string {
  if (!googleTitle) return 'Analista';
  
  const title = googleTitle.toLowerCase();
  
  // Mapeamento direto
  const directMap: Record<string, string> = {
    'ceo': 'CEO',
    'coo': 'COO',
    'diretor': 'Diretor',
    'head comercial': 'Head Comercial',
    'head marketing': 'Head Marketing',
    'head projetos': 'Head Projetos',
    'coordenador': 'Coordenador',
    'gerente': 'Gerente',
    'sdr': 'SDR',
    'closer': 'Closer',
    'analista de marketing': 'Analista de Marketing',
    'desenvolvedor': 'Desenvolvedor',
  };
  
  // Busca exata
  if (directMap[title]) return directMap[title];
  
  // Fuzzy matching
  if (title.includes('ceo')) return 'CEO';
  if (title.includes('coo')) return 'COO';
  if (title.includes('diretor')) return 'Diretor';
  if (title.includes('head') && title.includes('comercial')) return 'Head Comercial';
  if (title.includes('head') && title.includes('marketing')) return 'Head Marketing';
  if (title.includes('head') && title.includes('projeto')) return 'Head Projetos';
  if (title.includes('coordenador')) return 'Coordenador';
  if (title.includes('gerente')) return 'Gerente';
  if (title.includes('sdr')) return 'SDR';
  if (title.includes('closer')) return 'Closer';
  if (title.includes('analista') && title.includes('marketing')) return 'Analista de Marketing';
  if (title.includes('desenvolvedor') || title.includes('developer')) return 'Desenvolvedor';
  
  // Fallback
  return 'Analista';
}
```

**Mapeamento de Departamento:**
```typescript
function mapDepartment(googleDept: string | undefined): string {
  if (!googleDept) return 'geral';
  
  const dept = googleDept.toLowerCase();
  
  if (dept.includes('comercial') || dept.includes('vendas')) return 'comercial';
  if (dept.includes('marketing')) return 'marketing';
  if (dept.includes('projeto')) return 'projetos';
  if (dept.includes('inovação') || dept.includes('inovacao') || dept.includes('tech')) return 'inovação';
  
  return 'geral';
}
```

**Inferir Role:**
```typescript
function inferRole(googleUser: any): 'SUPER_ADMIN' | 'ADMIN' | 'USER' {
  const title = (googleUser.organizations?.[0]?.title || '').toLowerCase();
  const email = googleUser.primaryEmail?.toLowerCase() || '';
  
  // Emails específicos
  if (email === 'geraldo@grupoggv.com') return 'SUPER_ADMIN';
  
  // Cargos que são ADMIN
  if (title.includes('ceo')) return 'SUPER_ADMIN';
  if (title.includes('coo')) return 'ADMIN';
  if (title.includes('diretor')) return 'ADMIN';
  if (title.includes('head')) return 'ADMIN';
  if (title.includes('coordenador')) return 'ADMIN';
  
  return 'USER';
}
```

---

### **FASE 4: Interface de Import (2h)**

**Componente:** `WorkspaceImportModal.tsx`

**Fluxo:**
1. **Usuário clica** "Importar do Google Workspace"
2. **Loading** "Buscando usuários..."
3. **Preview** mostra tabela:
   - Email | Nome | Cargo (Google) → Cargo (GGV) | Departamento | Role
   - ✅ Checkbox para selecionar quais importar
   - ⚠️ Avisos se mapeamento estiver incerto
4. **Botão** "Importar X usuários selecionados"
5. **Progresso** "Importando... 5/20"
6. **Sucesso** "✅ 20 usuários importados!"

---

### **FASE 5: Tabelas de Controle (30min)**

```sql
-- Log de sincronizações
CREATE TABLE workspace_sync_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  synced_at TIMESTAMPTZ DEFAULT NOW(),
  users_imported INTEGER DEFAULT 0,
  users_updated INTEGER DEFAULT 0,
  users_skipped INTEGER DEFAULT 0,
  triggered_by UUID REFERENCES profiles(id),
  summary JSONB
);

-- Link Google ↔ GGV
CREATE TABLE workspace_user_link (
  google_id TEXT PRIMARY KEY,
  profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  last_synced TIMESTAMPTZ DEFAULT NOW()
);

-- Adicionar campos de controle em profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS role_source TEXT DEFAULT 'manual';
-- 'google' = inferido do Workspace | 'manual' = editado manualmente
-- Sync só sobrescreve role se role_source = 'google'

COMMENT ON COLUMN profiles.role_source IS 
'Origem do role: google (inferido) ou manual (editado no sistema). 
Sync NÃO sobrescreve se for manual.';
```

---

## **⏱️ CRONOGRAMA MVP**

| Tarefa | Tempo | Total Acumulado |
|--------|-------|-----------------|
| Setup Google API | 30min | 30min |
| Edge Function | 2h | 2h30min |
| Regras de mapeamento | 1h | 3h30min |
| Interface de import | 2h | 5h30min |
| Tabelas de controle | 30min | **6h** |

**TOTAL MVP: ~6 horas** ✅

---

## **🎯 APÓS MVP (V2 - FUTURO)**

Quando tudo estiver rodando bem:
- Webhook para sync automático
- Logs detalhados
- Business Units (OUs)
- Resolução de conflitos
- Sync incremental inteligente

---

## **🚀 COMEÇAMOS AGORA?**

**Preciso de você:**

1. **Confirma que quer MVP (6h)?** ✅
2. **Acesso Super Admin no Workspace?** (para criar service account)
3. **Me diga os cargos exatos** que vocês usam no Google Workspace
4. **Me diga os departamentos exatos** no Google

Com essas info, eu:
1. Crio as regras de mapeamento precisas
2. Implemento a Edge Function
3. Crio a interface de import
4. Testamos juntos

---

**Bora começar?** 🚀

