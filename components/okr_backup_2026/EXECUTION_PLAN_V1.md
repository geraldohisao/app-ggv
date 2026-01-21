# 🎯 Plano de Execução - OKR + Sprints v1 GGV

**Data de criação**: 2026-01-07  
**Baseado em**: Análise do cliente  
**Escopo**: Módulo OKR + Sprints (SEM IA, sem PDF avançado, sem reuniões formais)  
**Timeline**: 12-15 dias úteis (3 semanas)

---

## ✅ Escopo Confirmado v1

### Incluído
- ✅ OKRs (Estratégico + Setorial)
- ✅ Key Results numéricos com atualização manual
- ✅ Sprints (semanal, mensal, trimestral)
- ✅ Itens de Sprint (iniciativas, impedimentos, decisões)
- ✅ Dashboard com filtros e métricas
- ✅ Permissões (CEO/HEAD/OPERATIONAL)
- ✅ Ligação Sprint → OKR

### Explicitamente FORA
- ❌ IA (OpenAI/Gemini)
- ❌ PDF avançado (apenas print do browser)
- ❌ Módulo de reuniões formal
- ❌ Histórico de versões
- ❌ Nível operacional (SDR/Closer)
- ❌ Integração automática CRM

---

## 📅 Cronograma Executivo

### Fase 1: Fundamentos (2 dias - Jan 7-8)
**Objetivo**: Base técnica pronta

**Dia 1 - Setup**
- [ ] Backup código atual (`mv components/okr components/okr_backup_2026`)
- [ ] Nova estrutura de pastas limpa
- [ ] Instalar deps: `zustand`, `zod`, `@hookform/react-hook-form`, `@hookform/resolvers`
- [ ] Criar arquivos de types base (`okr.types.ts`, `sprint.types.ts`)

**Dia 2 - Database**
- [ ] SQL: Criar tabela `okrs`
- [ ] SQL: Criar tabela `key_results`
- [ ] SQL: Criar tabela `sprints`
- [ ] SQL: Criar tabela `sprint_items`
- [ ] SQL: Adicionar `role` e `department` em `users` (se não existir)
- [ ] SQL: Configurar RLS básico (3 policies por tabela)
- [ ] Testar insert/select manual no Supabase

**Entregável**: Database pronta + Types TypeScript + Zod schemas

---

### Fase 2: Módulo OKR (4 dias - Jan 9-14)

**Dia 3 - Services + Store**
- [ ] `okrService.ts`: CRUD completo de OKRs
- [ ] `okrService.ts`: CRUD de Key Results
- [ ] `okrStore.ts` (Zustand): Estado global de OKRs
- [ ] Hooks: `useOKRs()`, `usePermissions()`
- [ ] Testar CRUD via console

**Dia 4 - Componentes Base**
- [ ] `OKRCard.tsx`: Card visual do OKR
- [ ] `KeyResultItem.tsx`: Linha de KR com progresso
- [ ] `StatusBadge.tsx`: Badge de status
- [ ] `LevelBadge.tsx`: Badge de nível
- [ ] `ProgressBar.tsx`: Barra de progresso visual
- [ ] `Filters.tsx`: Filtros do dashboard

**Dia 5 - Dashboard**
- [ ] `OKRDashboard.tsx`: Tela principal
- [ ] Cards de métricas (total, concluídos, em andamento, atrasados)
- [ ] Grid de OKRCards com filtros funcionando
- [ ] Integração com `useOKRs()` e `useOKRStore()`
- [ ] Estados de loading/empty/error

**Dia 6 - CRUD UI**
- [ ] `OKRForm.tsx`: Formulário criar/editar OKR
- [ ] `KeyResultForm.tsx`: Sub-form de Key Results
- [ ] `OKRDetail.tsx`: Tela de detalhe de 1 OKR
- [ ] Validações com Zod + react-hook-form
- [ ] Navegação Dashboard ↔ Detail ↔ Form

**Entregável**: Módulo OKR 100% funcional (sem sprints ainda)

---

### Fase 3: Módulo Sprint (4 dias - Jan 15-20)

**Dia 7 - Services + Store Sprint**
- [ ] `sprintService.ts`: CRUD de Sprints
- [ ] `sprintService.ts`: CRUD de Sprint Items
- [ ] `sprintStore.ts` (Zustand): Estado de sprints
- [ ] Hooks: `useSprints()`, `useSprintItems()`
- [ ] Testar CRUD via console

**Dia 8 - Componentes Sprint**
- [ ] `SprintCard.tsx`: Card visual da sprint
- [ ] `SprintItemRow.tsx`: Linha de item da sprint
- [ ] `SprintTypesBadge.tsx`: Badge de tipo (semanal/mensal/trimestral)
- [ ] `SprintFilters.tsx`: Filtros de sprints

**Dia 9 - Lista de Sprints**
- [ ] `SprintList.tsx`: Listagem de sprints
- [ ] Filtros (tipo, departamento, status)
- [ ] Grid de SprintCards
- [ ] Integração com `useSprints()`
- [ ] Botão "Nova Sprint"

**Dia 10 - Detalhe Sprint**
- [ ] `SprintDetail.tsx`: Tela de 1 sprint
- [ ] Header com meta info + link para OKR vinculado
- [ ] Lista de itens agrupados por tipo
- [ ] `SprintItemForm.tsx`: Form de adicionar item
- [ ] Atualizar status da sprint e dos itens
- [ ] Navegação Sprint List ↔ Sprint Detail

**Entregável**: Módulo Sprint 100% funcional + integração com OKRs

---

### Fase 4: Permissões + Polish (3 dias - Jan 21-23)

**Dia 11 - Permissões RLS**
- [ ] Testar policies como CEO (tudo)
- [ ] Testar policies como HEAD (só seu dept)
- [ ] Testar policies como OPERATIONAL (só leitura)
- [ ] Ajustar policies se necessário
- [ ] Frontend: guards para esconder botões conforme role

**Dia 12 - UX + Polish**
- [ ] Mensagens de erro amigáveis
- [ ] Loaders em todas as ações assíncronas
- [ ] Estados vazios com CTAs
- [ ] Confirmações de delete
- [ ] Toast notifications básicas
- [ ] Responsividade mobile básica

**Dia 13 - Testes + Deploy**
- [ ] Smoke test completo (criar OKR → criar Sprint → vincular)
- [ ] Testar com 3 usuários (CEO, HEAD, OP)
- [ ] Testar atualização de KRs em reunião simulada
- [ ] Corrigir bugs críticos encontrados
- [ ] Deploy para produção

**Entregável**: Sistema v1 pronto para uso em produção

---

## 🗂️ Estrutura de Arquivos (Nova)

```
components/okr/
├── pages/
│   ├── OKRDashboard.tsx
│   ├── OKRDetail.tsx
│   ├── SprintList.tsx
│   └── SprintDetail.tsx
├── components/
│   ├── okr/
│   │   ├── OKRCard.tsx
│   │   ├── OKRForm.tsx
│   │   ├── KeyResultItem.tsx
│   │   ├── KeyResultForm.tsx
│   │   ├── StatusBadge.tsx
│   │   ├── LevelBadge.tsx
│   │   └── ProgressBar.tsx
│   ├── sprint/
│   │   ├── SprintCard.tsx
│   │   ├── SprintDetail.tsx
│   │   ├── SprintItemRow.tsx
│   │   ├── SprintItemForm.tsx
│   │   └── SprintTypesBadge.tsx
│   └── shared/
│       ├── Filters.tsx
│       ├── EmptyState.tsx
│       └── LoadingState.tsx
├── services/
│   ├── okr.service.ts
│   └── sprint.service.ts
├── store/
│   ├── okrStore.ts
│   └── sprintStore.ts
├── hooks/
│   ├── useOKRs.ts
│   ├── useSprints.ts
│   └── usePermissions.ts
├── types/
│   ├── okr.types.ts
│   └── sprint.types.ts
└── sql/
    └── okr_v2_schema.sql
```

---

## 📊 Modelo de Dados Detalhado

### Tabela: `okrs`

```sql
CREATE TABLE okrs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  level TEXT NOT NULL CHECK (level IN ('estratégico', 'setorial')),
  department TEXT CHECK (department IN ('comercial', 'marketing', 'projetos', 'geral')),
  owner TEXT NOT NULL,
  objective TEXT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  periodicity TEXT NOT NULL CHECK (periodicity IN ('mensal', 'trimestral')),
  status TEXT NOT NULL CHECK (status IN ('não iniciado', 'em andamento', 'concluído')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_okrs_user_id ON okrs(user_id);
CREATE INDEX idx_okrs_level ON okrs(level);
CREATE INDEX idx_okrs_department ON okrs(department);
CREATE INDEX idx_okrs_status ON okrs(status);
CREATE INDEX idx_okrs_dates ON okrs(start_date, end_date);

-- Trigger para updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_okrs_updated_at BEFORE UPDATE ON okrs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

### Tabela: `key_results`

```sql
CREATE TABLE key_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  okr_id UUID NOT NULL REFERENCES okrs(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  current_value NUMERIC DEFAULT 0,
  target_value NUMERIC NOT NULL,
  unit TEXT,
  status TEXT NOT NULL CHECK (status IN ('verde', 'amarelo', 'vermelho')),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_key_results_okr_id ON key_results(okr_id);
CREATE INDEX idx_key_results_status ON key_results(status);

CREATE TRIGGER update_key_results_updated_at BEFORE UPDATE ON key_results
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

### Tabela: `sprints`

```sql
CREATE TABLE sprints (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  okr_id UUID REFERENCES okrs(id) ON DELETE SET NULL,
  type TEXT NOT NULL CHECK (type IN ('semanal', 'mensal', 'trimestral')),
  department TEXT NOT NULL CHECK (department IN ('comercial', 'marketing', 'projetos', 'geral')),
  title TEXT NOT NULL,
  description TEXT,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('planejada', 'em andamento', 'concluída', 'cancelada')),
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_sprints_okr_id ON sprints(okr_id);
CREATE INDEX idx_sprints_type ON sprints(type);
CREATE INDEX idx_sprints_department ON sprints(department);
CREATE INDEX idx_sprints_status ON sprints(status);
CREATE INDEX idx_sprints_dates ON sprints(start_date, end_date);
```

### Tabela: `sprint_items`

```sql
CREATE TABLE sprint_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sprint_id UUID NOT NULL REFERENCES sprints(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('iniciativa', 'impedimento', 'decisão')),
  title TEXT NOT NULL,
  description TEXT,
  responsible TEXT,
  status TEXT NOT NULL CHECK (status IN ('pendente', 'em andamento', 'concluído')),
  due_date DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_sprint_items_sprint_id ON sprint_items(sprint_id);
CREATE INDEX idx_sprint_items_type ON sprint_items(type);
CREATE INDEX idx_sprint_items_status ON sprint_items(status);
```

### RLS Policies (Exemplo: `okrs`)

```sql
ALTER TABLE okrs ENABLE ROW LEVEL SECURITY;

-- CEO vê e edita tudo
CREATE POLICY "ceo_full_access" ON okrs
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'SUPER_ADMIN'
    )
  );

-- HEAD vê: estratégico + seu dept
CREATE POLICY "head_read_strategic_and_own_dept" ON okrs
  FOR SELECT
  USING (
    level = 'estratégico'
    OR (
      level = 'setorial'
      AND department = (
        SELECT department FROM users WHERE id = auth.uid()
      )
    )
  );

-- HEAD edita: apenas seu dept
CREATE POLICY "head_write_own_dept" ON okrs
  FOR INSERT, UPDATE, DELETE
  USING (
    department = (
      SELECT department FROM users WHERE id = auth.uid()
    )
    AND EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'ADMIN'
    )
  );

-- OPERATIONAL apenas lê
CREATE POLICY "operational_read_only" ON okrs
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'USER'
    )
  );
```

---

## 🎯 Critérios de Aceite (Checklist)

### CEO consegue:
- [ ] Criar OKR estratégico
- [ ] Editar qualquer OKR (estratégico ou setorial)
- [ ] Ver dashboard com TODOS os OKRs
- [ ] Ver quais OKRs estão atrasados (end_date < hoje e status ≠ concluído)
- [ ] Criar sprint geral ou de qualquer dept

### HEAD (ex: Comercial) consegue:
- [ ] Criar OKR setorial do próprio dept (comercial)
- [ ] Editar apenas OKRs do próprio dept
- [ ] Ver OKRs estratégicos (read-only)
- [ ] Ver OKRs do próprio dept (edição)
- [ ] NÃO ver OKRs de outros depts (ex: marketing)
- [ ] Criar sprint do próprio dept
- [ ] Vincular sprint a um OKR

### OPERATIONAL consegue:
- [ ] Ver todos os OKRs (read-only)
- [ ] Ver todas as sprints (read-only)
- [ ] NÃO criar/editar nada

### Sprint Semanal (reunião real):
- [ ] Abrir sprint da semana
- [ ] Adicionar iniciativa com responsável
- [ ] Adicionar impedimento
- [ ] Marcar item como "concluído"
- [ ] Ver qual OKR está vinculado
- [ ] Atualizar current_value de KR diretamente na tela do OKR

### Dashboard funcional:
- [ ] Mostrar total de OKRs
- [ ] Mostrar quantos concluídos
- [ ] Mostrar quantos em andamento
- [ ] Mostrar quantos atrasados
- [ ] Filtrar por nível (estratégico/setorial)
- [ ] Filtrar por departamento
- [ ] Filtrar por status

---

## 🚀 Próximos Passos IMEDIATOS

### Agora (próximos 5 minutos):
1. ✅ Confirmar aprovação deste plano
2. ⏳ Fazer backup do código atual
3. ⏳ Criar nova estrutura de pastas
4. ⏳ Instalar dependências

### Hoje (próximas 2 horas):
1. ⏳ Criar types TypeScript + Zod
2. ⏳ Criar SQL schema completo
3. ⏳ Rodar SQL no Supabase
4. ⏳ Testar insert/select manual

### Amanhã (Dia 2):
1. ⏳ Finalizar RLS policies
2. ⏳ Criar services básicos (okr + sprint)
3. ⏳ Criar store Zustand
4. ⏳ Começar componentes base

---

## 📝 Notas Importantes

### Sobre IA
- **Removida completamente da v1**
- Código antigo em `okr_backup_2026/` caso queira resgatar depois
- Se quiser adicionar na v2, será feature separada

### Sobre PDF
- **Apenas print do browser na v1**
- Não instalar html2canvas/jspdf
- Usuário usa Ctrl+P (Command+P) para imprimir

### Sobre Histórico
- **Não fazer versionamento na v1**
- Apenas ver lista de OKRs filtrados por data
- v2 pode adicionar snapshots se necessário

### Sobre Nível Operacional
- **Não criar OKRs operacionais na v1**
- SDRs/Closers continuam usando OTE/funil atual
- Na v1, operacional só visualiza OKRs estratégicos/setoriais

---

## ✅ Aprovação para Início

Confirme os seguintes pontos antes de começar:

- [ ] Li e entendi o escopo da v1
- [ ] Concordo que IA, PDF avançado e reuniões ficam de fora
- [ ] Entendi que v1 é entrada manual, para uso em 2026
- [ ] Tenho acesso ao Supabase para rodar SQL
- [ ] Posso testar com 3 usuários (CEO/HEAD/OP) no final
- [ ] Prazo de 12-15 dias (3 semanas) está OK

**Se todos os itens acima estão ✅, podemos começar AGORA.**

---

**Status**: ⏳ Aguardando aprovação para iniciar Fase 1  
**Próximo passo**: Backup código atual + criar estrutura nova  
**Tempo estimado até primeira entrega**: 13 dias úteis

