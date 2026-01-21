# 🔄 **PLANEJAMENTO: INTEGRAÇÃO GOOGLE WORKSPACE**

---

## **🎯 OBJETIVO**

Sincronizar automaticamente usuários do **Google Workspace** com o sistema GGV:
- ✅ Importar usuários, cargos, departamentos
- ✅ Sincronização bidirecional (Google ↔ GGV)
- ✅ Atualização automática (cargo, departamento, status)
- ✅ Exclusão automática (usuário removido do Workspace → removido do GGV)
- ✅ Suporte a Unidades de Negócio (OUs)

---

## **📊 ARQUITETURA DA SOLUÇÃO**

### **Componentes:**

```
┌─────────────────────┐
│ Google Workspace    │
│ Admin SDK           │
└──────────┬──────────┘
           │
           │ (1) Sync API
           ↓
┌─────────────────────┐
│ Supabase            │
│ Edge Function       │ ← (2) Scheduled / Webhook
└──────────┬──────────┘
           │
           │ (3) Update DB
           ↓
┌─────────────────────┐
│ Tabela: profiles    │
│ + workspace_sync    │
└─────────────────────┘
           │
           │ (4) Realtime
           ↓
┌─────────────────────┐
│ Frontend GGV        │
│ (atualização auto)  │
└─────────────────────┘
```

---

## **🗂️ FASES DE IMPLEMENTAÇÃO**

### **FASE 1: SETUP INICIAL** ⏱️ 2-3h

**Objetivo:** Configurar acesso ao Google Workspace API

**Tarefas:**
1. Criar projeto no Google Cloud Console
2. Ativar Google Workspace Admin SDK API
3. Criar Service Account com permissões:
   - `https://www.googleapis.com/auth/admin.directory.user.readonly`
   - `https://www.googleapis.com/auth/admin.directory.orgunit.readonly`
4. Domain-wide delegation no Workspace
5. Baixar credenciais JSON
6. Armazenar credenciais no Supabase (Vault/Secrets)

**Resultado:** ✅ Acesso configurado ao Google Workspace

---

### **FASE 2: MAPEAMENTO DE CAMPOS** ⏱️ 1-2h

**Objetivo:** Definir como mapear dados do Google → GGV

**Mapeamento:**

| Google Workspace | GGV System | Transformação |
|------------------|------------|---------------|
| `user.name.fullName` | `profiles.name` | Direto |
| `user.primaryEmail` | `profiles.email` | Direto |
| `user.organizations[0].title` | `profiles.cargo` | Buscar/criar cargo correspondente |
| `user.organizations[0].department` | `profiles.department` | Normalizar (lowercase) |
| `user.orgUnitPath` | `profiles.business_unit` | Mapear OU → Unidade |
| `user.suspended` | `profiles.is_active` | Inverter (!suspended) |
| - | `profiles.role` | Padrão: 'USER' (admin define depois) |

**Campos adicionais do Google:**
- `user.organizations[0].location` → localização física
- `user.phones` → telefones
- `user.thumbnailPhotoUrl` → foto do perfil
- `user.customSchemas` → campos customizados

**Decisões:**
- [ ] Quais campos customizados vocês usam no Workspace?
- [ ] Como mapear cargos (título exato ou fuzzy matching?)
- [ ] Departamentos: usar exatamente como no Google ou normalizar?

---

### **FASE 3: SYNC INICIAL (IMPORT)** ⏱️ 3-4h

**Objetivo:** Importar todos os usuários existentes do Workspace

**Implementação:**

**A) Criar tabela de controle de sync:**
```sql
CREATE TABLE workspace_sync_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sync_type TEXT NOT NULL, -- 'full' | 'incremental'
  started_at TIMESTAMPTZ DEFAULT NOW(),
  finished_at TIMESTAMPTZ,
  users_imported INTEGER DEFAULT 0,
  users_updated INTEGER DEFAULT 0,
  users_deleted INTEGER DEFAULT 0,
  status TEXT DEFAULT 'running', -- 'running' | 'success' | 'error'
  error_message TEXT,
  metadata JSONB
);

CREATE TABLE workspace_user_mapping (
  google_id TEXT PRIMARY KEY, -- Google User ID
  profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  last_synced_at TIMESTAMPTZ DEFAULT NOW(),
  sync_hash TEXT, -- Hash dos dados para detectar mudanças
  google_data JSONB -- Snapshot dos dados do Google
);
```

**B) Criar Supabase Edge Function:**
```typescript
// supabase/functions/sync-workspace/index.ts

import { createClient } from '@supabase/supabase-js'
import { google } from 'googleapis'

export async function syncWorkspaceUsers() {
  // 1. Autenticar com Google
  const auth = new google.auth.GoogleAuth({
    credentials: JSON.parse(Deno.env.get('GOOGLE_CREDENTIALS')),
    scopes: ['https://www.googleapis.com/auth/admin.directory.user.readonly']
  });
  
  const admin = google.admin({ version: 'directory_v1', auth });
  
  // 2. Buscar todos os usuários do Workspace
  const { data } = await admin.users.list({
    domain: 'grupoggv.com',
    maxResults: 500,
    projection: 'full'
  });
  
  // 3. Para cada usuário do Google
  for (const googleUser of data.users || []) {
    // Mapear dados
    const profileData = mapGoogleToProfile(googleUser);
    
    // Upsert no Supabase
    await upsertProfile(profileData, googleUser.id);
  }
}
```

**C) Interface de admin:**
- Botão "Sincronizar com Google Workspace"
- Barra de progresso
- Log de sincronização
- Estatísticas (X importados, Y atualizados, Z erros)

---

### **FASE 4: SYNC INCREMENTAL** ⏱️ 2-3h

**Objetivo:** Atualizar apenas o que mudou (mais eficiente)

**Implementação:**

**A) Webhook do Google (Directory API Push Notifications):**
```typescript
// Registrar webhook no Google
await admin.channels.watch({
  address: 'https://seu-projeto.supabase.co/functions/v1/workspace-webhook',
  type: 'webhook',
  events: ['update', 'delete']
});
```

**B) Edge Function de webhook:**
```typescript
// supabase/functions/workspace-webhook/index.ts

export async function handleWebhook(req: Request) {
  const event = await req.json();
  
  if (event.type === 'USER_DELETE') {
    // Desativar usuário no GGV
    await supabase
      .from('profiles')
      .update({ is_active: false })
      .eq('email', event.user.primaryEmail);
  }
  
  if (event.type === 'USER_UPDATE') {
    // Atualizar dados do usuário
    await syncSingleUser(event.user.id);
  }
}
```

**C) Scheduled sync (backup):**
- Cron job que roda de hora em hora
- Verifica mudanças nos últimos 60 minutos
- Garante que nada é perdido se webhook falhar

---

### **FASE 5: UNIDADES DE NEGÓCIO** ⏱️ 2h

**Objetivo:** Importar e usar Organizational Units do Google

**Google Workspace OUs:**
```
/
├── /Comercial
│   ├── /Comercial/SDRs
│   └── /Comercial/Closers
├── /Marketing
├── /Projetos
└── /Inovação
```

**Mapeamento:**
```sql
CREATE TABLE business_units (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL,
  google_ou_path TEXT UNIQUE, -- '/Comercial/SDRs'
  parent_unit_id UUID REFERENCES business_units(id),
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE profiles ADD COLUMN business_unit_id UUID REFERENCES business_units(id);
```

**Benefícios:**
- ✅ Organização mais granular (SDRs júnior vs sênior, por exemplo)
- ✅ Permissões por unidade de negócio
- ✅ Relatórios por unidade
- ✅ OKRs por unidade

---

### **FASE 6: INTERFACE DE GESTÃO** ⏱️ 3h

**Objetivo:** UI para gerenciar a integração

**Tela: Settings → Integração Google Workspace**

**Recursos:**
1. **Status da conexão:**
   - ✅ Conectado / ❌ Desconectado
   - Última sincronização: "há 5 minutos"
   - Próxima sincronização: "em 55 minutos"

2. **Ações:**
   - 🔄 Sincronizar Agora (manual)
   - ⚙️ Configurar Mapeamentos
   - 📊 Ver Logs de Sincronização
   - 🔧 Testar Conexão

3. **Configurações de mapeamento:**
   - Mapear cargos do Google → Cargos GGV
   - Mapear departamentos
   - Definir role padrão (USER/ADMIN)
   - Regras de auto-promoção (cargo X → role ADMIN)

4. **Logs e auditoria:**
   - Histórico de sincronizações
   - Erros e avisos
   - Usuários importados recentemente
   - Conflitos (usuário existe nos dois com dados diferentes)

---

## **🔧 TECNOLOGIAS NECESSÁRIAS**

### **Backend:**
- ✅ Supabase Edge Functions (Deno)
- ✅ Google APIs Node.js Client
- ✅ Supabase Vault (armazenar credenciais)
- ✅ Supabase Cron (scheduled sync)

### **Frontend:**
- ✅ React
- ✅ Componentes de loading/progresso
- ✅ Tabelas de logs
- ✅ Formulários de configuração

### **Google Cloud:**
- ✅ Google Cloud Project
- ✅ Service Account
- ✅ Domain-wide delegation

---

## **💰 CUSTOS ESTIMADOS**

- Google Cloud API calls: **Gratuito** (dentro do limite)
- Supabase Edge Functions: **Gratuito** no plano Pro (até 2M invocações)
- Tempo de desenvolvimento: **12-15 horas**

---

## **⚠️ CONSIDERAÇÕES E RISCOS**

### **Benefícios:**
- ✅ Menos trabalho manual
- ✅ Dados sempre atualizados
- ✅ Single source of truth (Google Workspace)
- ✅ Onboarding automático
- ✅ Offboarding automático

### **Desafios:**
- ⚠️ Permissões no Google Workspace (precisa admin)
- ⚠️ Mapeamento de cargos pode não ser 1:1
- ⚠️ Conflitos de dados (usuário alterado nos 2 sistemas)
- ⚠️ Rate limits da API do Google

### **Mitigações:**
- ✅ Interface de mapeamento manual (resolver conflitos)
- ✅ Log completo de todas as operações
- ✅ Modo "somente leitura" (Google → GGV, não o contrário)
- ✅ Sincronização incremental (só o que mudou)

---

## **📋 CHECKLIST PRÉ-REQUISITOS**

Antes de começar, preciso saber:

- [ ] Você tem **acesso de Super Admin** no Google Workspace?
- [ ] Quais **campos customizados** vocês usam no Workspace?
- [ ] Os **cargos** no Google Workspace correspondem aos do sistema?
- [ ] Os **departamentos** estão padronizados no Google?
- [ ] Vocês usam **OUs** (Organizational Units) no Workspace?
- [ ] Existe alguma **regra de negócio** para definir roles (ADMIN vs USER)?

---

## **🚀 CRONOGRAMA**

| Fase | Duração | Dependências |
|------|---------|--------------|
| Setup Google API | 2-3h | Acesso admin Workspace |
| Mapeamento de campos | 1-2h | Definir campos customizados |
| Sync inicial | 3-4h | Fases 1 e 2 |
| Sync incremental | 2-3h | Fase 3 |
| Unidades de negócio | 2h | Fase 3 |
| Interface de gestão | 3h | Fase 3 |
| **TOTAL** | **13-17h** | - |

---

## **💡 ALTERNATIVA SIMPLIFICADA (MVP)**

Se quiser começar mais simples:

### **MVP: Sync Manual Assistido** ⏱️ 4-6h

1. **Botão "Importar do Google Workspace"**
2. **Lista usuários do Google** (com preview)
3. **Mapeamento manual** de cargos/departamentos
4. **Importação em batch**
5. **Sem webhook** (sync manual quando necessário)

**Vantagens:**
- ✅ Mais rápido de implementar
- ✅ Controle total sobre importações
- ✅ Sem risco de sync automático errado

**Desvantagens:**
- ❌ Não é automático
- ❌ Precisa rodar manualmente

---

## **🎯 PRÓXIMOS PASSOS**

**Opção A: Integração Completa (13-17h)**
- Sincronização automática
- Webhooks
- Unidades de negócio
- Interface completa

**Opção B: MVP Simplificado (4-6h)**
- Importação manual assistida
- Mapeamento interativo
- Sync on-demand

**Opção C: Híbrido (8-10h)**
- Importação inicial automática
- Sync manual posterior
- Sem webhooks (por enquanto)

---

## **❓ DECISÕES NECESSÁRIAS**

**Me responda:**

1. **Qual opção prefere?** (A, B ou C)
2. **Tem acesso admin no Google Workspace?**
3. **Campos customizados que usam no Workspace?**
4. **Cargos no Google são padronizados?**
5. **Usam OUs no Workspace?**
6. **Quer começar agora ou só planejamento?**

---

**Aguardo suas respostas para começarmos!** 🚀

