# 💎 Consultoria OKR Master - Plano de Evolução

**Data:** 19/01/2026  
**Consultor:** Especialista em OKR  
**Status Atual:** MVP Funcional ✅  
**Objetivo:** Evoluir para Sistema Profissional de Gestão OKR

---

## 📋 Sumário Executivo

O sistema atual **funciona bem** como MVP, mas para se tornar uma **ferramenta profissional de OKR**, precisa evoluir em 3 áreas principais:

1. **Arquitetura:** Separar "configuração" (cadência) de "execução" (ciclo)
2. **Rastreabilidade:** Sistema de check-ins com histórico auditável
3. **Governança:** Regras, limites e automações

---

## 🎯 Análise do Feedback

### 1. ✅ Ajuste de Conceito: "Sprint" vs "Cadência"

#### Problema Atual

```
sprints table = {
  type: 'semanal',           ← Configuração
  title: 'Sprint W3',        ← Instância
  start_date: '15/01',       ← Instância
  end_date: '22/01'          ← Instância
}
```

**Mistura:** Configuração recorrente + Instância do período

#### Solução Proposta

**Opção A: Duas Tabelas (Melhor para escala)**

```sql
-- Configuração (template)
CREATE TABLE sprint_cadences (
    id UUID PRIMARY KEY,
    name TEXT NOT NULL,           -- "Comercial Semanal"
    type TEXT NOT NULL,           -- 'semanal' | 'mensal' | etc
    scope TEXT NOT NULL,          -- 'operacional' | 'tático' | 'estratégico'
    audience TEXT NOT NULL,       -- 'time' | 'liderança' | 'diretoria'
    department TEXT NOT NULL,
    auto_create BOOLEAN DEFAULT true,
    max_initiatives INTEGER DEFAULT 7,
    max_carry_over_pct INTEGER DEFAULT 30,
    template_description TEXT,
    is_active BOOLEAN DEFAULT true
);

-- Instâncias (ciclos)
CREATE TABLE sprint_cycles (
    id UUID PRIMARY KEY,
    cadence_id UUID REFERENCES sprint_cadences(id),
    cycle_number INTEGER,         -- 1, 2, 3... (W1, W2, W3)
    title TEXT,                   -- Auto-gerado: "Comercial W3 - Jan 2026"
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    status TEXT NOT NULL,
    parent_cycle_id UUID REFERENCES sprint_cycles(id),
    created_at TIMESTAMP DEFAULT NOW()
);
```

**Opção B: Uma Tabela com Template (Mais rápido)**

```sql
-- Manter sprints atual + adicionar:
ALTER TABLE sprints ADD COLUMN is_template BOOLEAN DEFAULT false;
ALTER TABLE sprints ADD COLUMN template_id UUID REFERENCES sprints(id);

-- Sprint template
{
  is_template: true,
  title: "Template: Sprint Comercial Semanal",
  type: 'semanal',
  department: 'comercial',
  auto_create: true
}

-- Sprint instância
{
  is_template: false,
  template_id: 'template-abc',
  title: "Sprint Comercial W3",
  start_date: '2026-01-15',
  end_date: '2026-01-22'
}
```

**Recomendação:** Opção B para implementação rápida, evoluir para Opção A depois.

---

### 2. ⭐ Check-in do Ciclo (CRÍTICO)

#### Problema Atual

```
❌ Não há registro de "momentos" na sprint
❌ Não há histórico de evolução
❌ Não há snapshot dos KRs
```

#### Solução: Tabela `sprint_checkins`

```sql
CREATE TABLE sprint_checkins (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sprint_id UUID NOT NULL REFERENCES sprints(id),
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),
    
    -- Resumo do ciclo
    summary TEXT NOT NULL,              -- "O que avançou / travou / próximos passos"
    achievements TEXT,                  -- "O que foi entregue"
    blockers TEXT,                      -- "O que travou"
    decisions_taken TEXT,               -- "Decisões tomadas"
    next_focus TEXT,                    -- "Próximo foco"
    
    -- Saúde do ciclo
    health TEXT NOT NULL,               -- 'verde' | 'amarelo' | 'vermelho'
    health_reason TEXT,                 -- "Por que está amarelo?"
    
    -- Métricas
    initiatives_completed INTEGER,
    initiatives_total INTEGER,
    carry_over_count INTEGER,
    
    -- Snapshot de KRs (JSON ou tabela separada)
    krs_snapshot JSONB                  -- [{ kr_id, title, value, target, progress }]
);
```

**Uso:**

```typescript
// Ao finalizar sprint (ou durante)
await createSprintCheckin({
  sprint_id: 'sprint-w3',
  summary: 'Semana produtiva. 3 de 5 iniciativas concluídas.',
  achievements: '- Campanha LinkedIn gerou 20 SQLs\n- Webinar com 50 participantes',
  blockers: '- CRM ainda fora do ar\n- Orçamento de Ads não aprovado',
  decisions_taken: '- Aprovar desconto 20% para Enterprise',
  next_focus: '- Resolver CRM até segunda\n- Focar em fechar 3 contratos grandes',
  health: 'amarelo',
  health_reason: 'CRM fora do ar está impactando follow-ups',
  initiatives_completed: 3,
  initiatives_total: 5,
  krs_snapshot: [
    { kr_id: 'kr1', title: 'Gerar R$ 1M', value: 450000, target: 1000000, progress: 45 },
    { kr_id: 'kr2', title: 'Fechar 50 contratos', value: 18, target: 50, progress: 36 }
  ]
});
```

**UX:**

```
┌─────────────────────────────────────────┐
│ Sprint Comercial W3                     │
│ [Registrar Check-in]                    │
├─────────────────────────────────────────┤
│ 📊 Check-ins (2)                        │
│                                         │
│ ✅ Check-in 18/01 - VERDE               │
│ "Semana iniciou bem. 2 iniciativas..."  │
│                                         │
│ ⚠️ Check-in 22/01 - AMARELO             │
│ "CRM fora do ar travou follow-ups"      │
│ KRs: R$ 450k / R$ 1M (45%)             │
│                                         │
└─────────────────────────────────────────┘
```

---

### 3. ⭐ Histórico de KRs (kr_checkins)

#### Problema Atual

```
key_results.current_value = 450000  ← Sobrescreve valor anterior
❌ Não há histórico de evolução
❌ Não há gráfico de progresso
❌ Não há "quem atualizou quando"
```

#### Solução: Tabela `kr_checkins`

```sql
CREATE TABLE kr_checkins (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    kr_id UUID NOT NULL REFERENCES key_results(id),
    sprint_id UUID REFERENCES sprints(id),      -- Opcional: vincula ao ciclo
    value NUMERIC NOT NULL,                     -- Novo valor
    previous_value NUMERIC,                     -- Valor anterior (snapshot)
    comment TEXT,                               -- "Fechamos 5 contratos esta semana"
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP DEFAULT NOW()
);
```

**Uso:**

```typescript
// Atualizar KR
await createKRCheckin({
  kr_id: 'kr1',
  sprint_id: 'sprint-w3',  // Vincula ao ciclo atual
  value: 450000,
  previous_value: 300000,  // Calculado automaticamente
  comment: 'Fechamos 3 contratos grandes: R$ 50k + R$ 60k + R$ 40k'
});

// Automático: atualiza key_results.current_value também
UPDATE key_results SET current_value = 450000 WHERE id = 'kr1';
```

**UX:**

```
┌─────────────────────────────────────────┐
│ KR1: Gerar R$ 1M em vendas              │
│ 📊 Progresso: 45% (R$ 450k / R$ 1M)    │
│                                         │
│ [Atualizar Valor]                       │
│                                         │
│ 📈 Histórico:                           │
│ 22/01: R$ 450k (+R$ 150k) - Geraldo    │
│ 15/01: R$ 300k (+R$ 100k) - Geraldo    │
│ 08/01: R$ 200k (inicial) - Geraldo     │
│                                         │
│ [Gráfico de Evolução]                   │
│     |           /                       │
│  1M |         /                         │
│ 500k|       / ← você está aqui         │
│     |     /                             │
│     |___/___________________________    │
│     8/1  15/1  22/1  29/1              │
└─────────────────────────────────────────┘
```

---

### 4. ✅ Itens Concluídos: Não Somem

#### Problema Atual

✅ **Já está bom!** Itens ficam na tabela, só mudam `status`.

#### Melhoria Sugerida: Toggle de Visualização

```typescript
// Estado
const [showCompleted, setShowCompleted] = useState(false);

// Filtragem
const visibleItems = showCompleted 
  ? allItems 
  : allItems.filter(i => i.status !== 'concluído');

// UI
<button onClick={() => setShowCompleted(!showCompleted)}>
  {showCompleted ? '🔽 Ocultar' : '👁️ Mostrar'} Concluídos ({completedCount})
</button>
```

**UX:**

```
┌─────────────────────────────────────────┐
│ Iniciativas (2 ativas, 3 concluídas)    │
│ [👁️ Mostrar Concluídos (3)]            │
├─────────────────────────────────────────┤
│ ⏳ Atualizar CRM                        │
│ ⏳ Criar deck Enterprise                │
└─────────────────────────────────────────┘

← Ao clicar "Mostrar":

┌─────────────────────────────────────────┐
│ Iniciativas (2 ativas, 3 concluídas)    │
│ [🔽 Ocultar Concluídos (3)]            │
├─────────────────────────────────────────┤
│ ⏳ Atualizar CRM                        │
│ ⏳ Criar deck Enterprise                │
│ ✅ Campanha LinkedIn (concluída)        │
│ ✅ Webinar B2B (concluída)              │
│ ✅ Treinamento vendas (concluída)       │
└─────────────────────────────────────────┘
```

---

### 5. 🎯 Sprints Operacionais vs Estratégicas

#### Adicionar Campos

```sql
ALTER TABLE sprints ADD COLUMN scope TEXT DEFAULT 'operacional' 
  CHECK (scope IN ('operacional', 'tático', 'estratégico'));
  
ALTER TABLE sprints ADD COLUMN audience TEXT DEFAULT 'time'
  CHECK (audience IN ('time', 'liderança', 'diretoria'));

ALTER TABLE sprints ADD COLUMN max_initiatives INTEGER DEFAULT 7;
ALTER TABLE sprints ADD COLUMN max_carry_over_pct INTEGER DEFAULT 30;
```

**Regras por Escopo:**

| Escopo | Foco | Frequência | Limites |
|--------|------|------------|---------|
| **Operacional** | Iniciativas + Impedimentos | Semanal/Mensal | 5-7 iniciativas |
| **Tático** | Projetos + Decisões | Mensal/Trimestral | 10-15 iniciativas |
| **Estratégico** | Decisões + Riscos + KRs | Trimestral/Anual | 3-5 decisões |

**UX Diferenciada:**

```typescript
// Sprint Operacional (Time)
<SprintDetail>
  <Initiatives />  ← Destaque
  <Impediments />
  <Activities />
</SprintDetail>

// Sprint Estratégica (Diretoria)
<SprintDetail>
  <KRCheckins />   ← Destaque
  <Decisions />    ← Destaque
  <Risks />
  <Alignments />
</SprintDetail>
```

---

### 6. 🤖 Automação de Recorrência

#### Problema Atual

```
❌ Depende do usuário clicar "Finalizar Sprint"
❌ Se esquecer, sprint fica "travada"
❌ Não tem lógica para feriados/exceções
```

#### Solução: Job Automatizado

**Opção A: Supabase Edge Function (Recomendado)**

```typescript
// supabase/functions/auto-rotate-sprints/index.ts

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

serve(async (req) => {
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
  
  const today = new Date().toISOString().split('T')[0];
  
  // 1. Encontrar sprints expiradas
  const { data: expiredSprints } = await supabase
    .from('sprints')
    .select('*')
    .eq('status', 'em andamento')
    .lt('end_date', today);
  
  for (const sprint of expiredSprints) {
    // 2. Marcar como concluída
    await supabase
      .from('sprints')
      .update({ status: 'concluída' })
      .eq('id', sprint.id);
    
    // 3. Criar próxima (se auto_create = true)
    if (sprint.auto_create) {
      const nextDates = calculateNextDates(sprint.end_date, sprint.type);
      
      await supabase
        .from('sprints')
        .insert({
          ...sprint,
          id: undefined,
          start_date: nextDates.start,
          end_date: nextDates.end,
          parent_id: sprint.id,
          status: 'em andamento'
        });
    }
  }
  
  return new Response(JSON.stringify({ rotated: expiredSprints.length }));
});
```

**Configuração no Supabase:**

```bash
# Criar função
supabase functions deploy auto-rotate-sprints

# Agendar (cron)
# No Supabase Dashboard → Database → Cron Jobs
# Schedule: 0 0 * * * (todo dia à meia-noite)
# Function: auto-rotate-sprints
```

**Opção B: Supabase pg_cron (Direto no PostgreSQL)**

```sql
-- Instalar extensão
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Criar job
SELECT cron.schedule(
  'auto-rotate-sprints',
  '0 0 * * *',  -- Todo dia à meia-noite
  $$
    -- Marcar expiradas
    UPDATE sprints 
    SET status = 'concluída'
    WHERE status = 'em andamento' 
      AND end_date < CURRENT_DATE;
    
    -- Criar próximas (simplificado)
    -- ... lógica de criação ...
  $$
);
```

**Vantagens:**
- ✅ Não depende de ação manual
- ✅ Ciclos sempre atualizados
- ✅ Histórico completo mantido

---

### 7. 📊 Métricas na Tela (4 Blocos Essenciais)

#### Bloco 1: Indicadores do Ciclo (KR Check-in)

```
┌─────────────────────────────────────────┐
│ 📊 INDICADORES DO CICLO                 │
├─────────────────────────────────────────┤
│ KR1: Gerar R$ 1M em vendas              │
│ ━━━━━━━━━━░░░░░░░░░░ 45% (R$ 450k)    │
│ +R$ 150k esta semana ↗                  │
│ [Atualizar]                             │
│                                         │
│ KR2: Fechar 50 contratos                │
│ ━━━━━━░░░░░░░░░░░░░░ 36% (18 contratos)│
│ +3 contratos esta semana →              │
│ [Atualizar]                             │
└─────────────────────────────────────────┘
```

#### Bloco 2: Resumo do Check-in

```
┌─────────────────────────────────────────┐
│ 📝 RESUMO DO CICLO                      │
│ [Registrar Check-in]                    │
├─────────────────────────────────────────┤
│ ✅ O que foi entregue:                  │
│ • Campanha LinkedIn (20 SQLs)           │
│ • Webinar (50 participantes)            │
│ • Treinamento de vendas (15 pessoas)    │
│                                         │
│ ⚠️ O que travou:                        │
│ • CRM fora do ar (3 dias)               │
│ • Orçamento de Ads não aprovado         │
│                                         │
│ 💬 Decisões tomadas:                    │
│ • Aprovar desconto 20% para Enterprise  │
│                                         │
│ 🎯 Próximo foco:                        │
│ • Resolver CRM até segunda              │
│ • Fechar 3 contratos grandes            │
└─────────────────────────────────────────┘
```

#### Bloco 3: Saúde do Ciclo

```
┌─────────────────────────────────────────┐
│ 🏥 SAÚDE DO CICLO                       │
├─────────────────────────────────────────┤
│ ⚠️ AMARELO                              │
│                                         │
│ Motivo:                                 │
│ "CRM fora do ar está impactando         │
│  follow-ups. 30% da capacidade perdida."│
│                                         │
│ Ação:                                   │
│ "Migrar para HubSpot até segunda"       │
│                                         │
│ [Mudar para Verde] [Mudar para Vermelho]│
└─────────────────────────────────────────┘
```

#### Bloco 4: Carry-over Controlado

```
┌─────────────────────────────────────────┐
│ 🔁 CARRY-OVER                           │
├─────────────────────────────────────────┤
│ 2 itens carregados da sprint anterior   │
│ ⚠️ 40% de carry-over (acima do limite)  │
│                                         │
│ 🔁 Atualizar CRM (2ª vez)               │
│ Motivo: "CRM ficou fora do ar"          │
│ [Concluir] [Cancelar]                   │
│                                         │
│ 🔁 Criar deck (2ª vez)                  │
│ Motivo: "Dependência de design"         │
│ [Concluir] [Cancelar]                   │
│                                         │
│ ⚠️ Items com carry-over 3x são          │
│    automaticamente cancelados            │
└─────────────────────────────────────────┘
```

---

### 8. 📏 Regras de Governança

#### Implementar Validações "Soft"

```typescript
// Warnings (não bloqueiam, apenas alertam)

// 1. Sprint inflada
if (initiatives.length > maxInitiatives) {
  addToast(`⚠️ Atenção: Sprint com ${initiatives.length} iniciativas. 
    Recomendado: máx ${maxInitiatives}`, 'warning');
}

// 2. Carry-over alto
const carryOverPct = (carryOverItems / totalItems) * 100;
if (carryOverPct > 30) {
  addToast(`⚠️ ${carryOverPct}% de carry-over. Máximo recomendado: 30%`, 'warning');
}

// 3. Impedimento sem owner
if (impediment.responsible === null) {
  addToast('⚠️ Impedimento sem responsável pode não ser resolvido', 'warning');
}

// 4. Decisão sem impacto definido
if (decision.related_kr_id === null) {
  addToast('💡 Sugestão: Vincule a decisão a um KR para rastrear impacto', 'info');
}
```

#### Adicionar Campos de Governança

```sql
-- Em sprint_items (decisões)
ALTER TABLE sprint_items ADD COLUMN related_kr_id UUID REFERENCES key_results(id);
ALTER TABLE sprint_items ADD COLUMN impact_description TEXT;
ALTER TABLE sprint_items ADD COLUMN trade_off TEXT;

-- Em sprint_items (impedimentos)
ALTER TABLE sprint_items ADD COLUMN severity TEXT CHECK (severity IN ('baixa', 'média', 'alta', 'crítica'));
ALTER TABLE sprint_items ADD COLUMN resolution_deadline DATE;
ALTER TABLE sprint_items ADD COLUMN resolution_notes TEXT;

-- Contadores de carry-over
ALTER TABLE sprint_items ADD COLUMN carry_over_count INTEGER DEFAULT 0;
```

---

### 9. 🗺️ Roadmap de Implementação

#### **Fase 1: Fundação (1-2 semanas)** ⚡ RÁPIDO

**Prioridade:** ALTA  
**Complexidade:** Baixa

- [x] ✅ Sistema básico de Sprints (FEITO)
- [x] ✅ CRUD de items (FEITO)
- [x] ✅ Finalização manual (FEITO)
- [x] ✅ Carry-over básico (FEITO)
- [x] ✅ Toasts e validações (FEITO)
- [x] ✅ Otimizações de performance (FEITO)

---

#### **Fase 2: Check-ins (2-3 semanas)** 🎯 PRÓXIMO

**Prioridade:** ALTA  
**Complexidade:** Média

**2.1. Criar Tabelas**
```sql
-- sprint_checkins
-- kr_checkins
```

**2.2. Componentes**
```typescript
<SprintCheckinForm />
<SprintCheckinList />
<KRCheckinForm />
<KRCheckinChart />
```

**2.3. Serviços**
```typescript
// sprint.service.ts
createSprintCheckin()
listSprintCheckins()

// okr.service.ts
createKRCheckin()
getKRHistory()
```

**2.4. UX**
- Botão "Registrar Check-in" na sprint
- Modal com formulário estruturado
- Lista de check-ins anteriores
- Gráfico de evolução de KRs

**Resultado:** Histórico completo e auditável de cada ciclo

---

#### **Fase 3: Cadência/Template (1-2 semanas)** 🔄

**Prioridade:** MÉDIA  
**Complexidade:** Média

**3.1. Opção Rápida: Adicionar Campos**
```sql
ALTER TABLE sprints ADD COLUMN is_template BOOLEAN DEFAULT false;
ALTER TABLE sprints ADD COLUMN template_id UUID;
ALTER TABLE sprints ADD COLUMN auto_create BOOLEAN DEFAULT true;
ALTER TABLE sprints ADD COLUMN scope TEXT DEFAULT 'operacional';
ALTER TABLE sprints ADD COLUMN audience TEXT DEFAULT 'time';
```

**3.2. Opção Completa: Nova Tabela**
```sql
CREATE TABLE sprint_cadences (...);
```

**3.3. UI**
```typescript
<CadenceManager />  // Gerenciar templates
<CadenceForm />     // Criar/editar cadência
```

**Resultado:** Configuração centralizada de rituais recorrentes

---

#### **Fase 4: Automação (1 semana)** 🤖

**Prioridade:** MÉDIA  
**Complexidade:** Baixa

**4.1. Edge Function**
```typescript
// supabase/functions/auto-rotate-sprints
```

**4.2. Cron Job**
```
0 0 * * * (meia-noite todo dia)
```

**4.3. Lógica**
- Encontrar sprints expiradas
- Marcar como concluídas
- Criar próximas (se auto_create = true)
- Copiar itens pendentes
- Enviar notificações (opcional)

**Resultado:** Ciclos se renovam automaticamente, sem intervenção manual

---

#### **Fase 5: Governança (1-2 semanas)** 📏

**Prioridade:** BAIXA  
**Complexidade:** Baixa

**5.1. Adicionar Validações Soft**
```typescript
// Warnings (não bloqueiam)
- Sprint inflada (> 7 items)
- Carry-over alto (> 30%)
- Impedimento sem dono
- Decisão sem impacto
```

**5.2. Métricas**
```typescript
<SprintHealthMetrics />
<CarryOverAnalysis />
<ComplianceChecks />
```

**5.3. Campos Adicionais**
```sql
-- Para decisões
related_kr_id, impact, trade_off

-- Para impedimentos  
severity, resolution_deadline
```

**Resultado:** Sistema "ensina" boas práticas de OKR

---

#### **Fase 6: Dashboard Executivo (2-3 semanas)** 📈

**Prioridade:** MÉDIA  
**Complexidade:** Alta

**6.1. Componentes**
```typescript
<ExecutiveDashboard />
  <OKROverview />        // Progresso de todos os OKRs
  <KRTrendChart />       // Gráfico de evolução
  <SprintTimeline />     // Timeline de sprints
  <DepartmentComparison /> // Comparativo entre deptos
  <RiskHeatmap />        // Mapa de riscos
```

**6.2. Queries Agregadas**
```typescript
// Progresso médio por departamento
SELECT department, AVG(progress) FROM okrs GROUP BY department;

// Taxa de conclusão de sprints
SELECT COUNT(*) / TOTAL * 100 FROM sprints WHERE status = 'concluída';
```

**Resultado:** Visão executiva de todos os OKRs e Sprints

---

## 📅 Timeline Sugerido

```
Hoje (19/01/2026)
    ↓
Fase 1: ✅ CONCLUÍDA
    ↓
Fase 2: Check-ins (2-3 semanas)
    ↓ 11/02/2026
Fase 3: Cadências (1-2 semanas)
    ↓ 25/02/2026
Fase 4: Automação (1 semana)
    ↓ 04/03/2026
Fase 5: Governança (1-2 semanas)
    ↓ 18/03/2026
Fase 6: Dashboard (2-3 semanas)
    ↓ 08/04/2026
    
Sistema Profissional Completo! 🎉
```

**Total:** ~8-12 semanas para sistema completo de nível enterprise

---

## 🎯 Priorização Recomendada

### Must Have (Essencial)

1. ✅ Check-ins de Sprints
2. ✅ Check-ins de KRs (histórico)
3. ✅ Toggle "mostrar concluídos"

### Should Have (Importante)

4. ✅ Automação de recorrência
5. ✅ Cadências/Templates
6. ✅ Validações soft (governança)

### Nice to Have (Desejável)

7. Dashboard executivo
8. Gráficos de tendência
9. Notificações automáticas
10. Integração com calendário

---

## 💡 Quick Wins (Implementar Primeiro)

### Quick Win 1: Toggle "Mostrar Concluídos" (1h)

```typescript
// SprintDetailStyled.tsx
const [showCompleted, setShowCompleted] = useState(false);

const visibleInitiatives = showCompleted
  ? itemsByType.iniciativa
  : itemsByType.iniciativa.filter(i => i.status !== 'concluído');

<button onClick={() => setShowCompleted(!showCompleted)}>
  {showCompleted ? '🔽 Ocultar' : '👁️ Mostrar'} 
  Concluídos ({completedCount})
</button>
```

### Quick Win 2: Campos de Governança em Decisões (2h)

```sql
ALTER TABLE sprint_items ADD COLUMN related_kr_id UUID;
ALTER TABLE sprint_items ADD COLUMN impact_description TEXT;
```

```typescript
// SprintItemForm quando type = 'decisão'
<select name="related_kr_id">
  <option value="">Nenhum KR impactado</option>
  {krs.map(kr => <option value={kr.id}>{kr.title}</option>)}
</select>

<textarea name="impact_description" 
  placeholder="Qual o impacto esperado desta decisão?" />
```

### Quick Win 3: Contador de Carry-over (1h)

```sql
ALTER TABLE sprint_items ADD COLUMN carry_over_count INTEGER DEFAULT 0;
```

```typescript
// Ao copiar item para próxima sprint
const carryOverCount = (item.carry_over_count || 0) + 1;

if (carryOverCount >= 3) {
  addToast('⚠️ Item com carry-over 3x será cancelado automaticamente', 'warning');
  status = 'cancelado';
}
```

---

## 🏗️ Scripts SQL para Evolução

### Script 1: Adicionar Check-ins

```sql
-- Criar tabela sprint_checkins
CREATE TABLE sprint_checkins (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sprint_id UUID NOT NULL REFERENCES sprints(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),
    summary TEXT NOT NULL,
    achievements TEXT,
    blockers TEXT,
    decisions_taken TEXT,
    next_focus TEXT,
    health TEXT NOT NULL CHECK (health IN ('verde', 'amarelo', 'vermelho')),
    health_reason TEXT,
    initiatives_completed INTEGER,
    initiatives_total INTEGER,
    carry_over_count INTEGER,
    krs_snapshot JSONB
);

-- Criar tabela kr_checkins
CREATE TABLE kr_checkins (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    kr_id UUID NOT NULL REFERENCES key_results(id) ON DELETE CASCADE,
    sprint_id UUID REFERENCES sprints(id),
    value NUMERIC NOT NULL,
    previous_value NUMERIC,
    comment TEXT,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP DEFAULT NOW()
);

-- Índices
CREATE INDEX idx_sprint_checkins_sprint_id ON sprint_checkins(sprint_id);
CREATE INDEX idx_kr_checkins_kr_id ON kr_checkins(kr_id);
CREATE INDEX idx_kr_checkins_sprint_id ON kr_checkins(sprint_id);

-- RLS
ALTER TABLE sprint_checkins ENABLE ROW LEVEL SECURITY;
ALTER TABLE kr_checkins ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Acesso total" ON sprint_checkins FOR ALL TO authenticated USING (true);
CREATE POLICY "Acesso total" ON kr_checkins FOR ALL TO authenticated USING (true);
```

### Script 2: Adicionar Governança

```sql
-- Campos de governança
ALTER TABLE sprints ADD COLUMN IF NOT EXISTS scope TEXT DEFAULT 'operacional';
ALTER TABLE sprints ADD COLUMN IF NOT EXISTS audience TEXT DEFAULT 'time';
ALTER TABLE sprints ADD COLUMN IF NOT EXISTS max_initiatives INTEGER DEFAULT 7;
ALTER TABLE sprints ADD COLUMN IF NOT EXISTS max_carry_over_pct INTEGER DEFAULT 30;

-- Campos em items
ALTER TABLE sprint_items ADD COLUMN IF NOT EXISTS related_kr_id UUID REFERENCES key_results(id);
ALTER TABLE sprint_items ADD COLUMN IF NOT EXISTS impact_description TEXT;
ALTER TABLE sprint_items ADD COLUMN IF NOT EXISTS trade_off TEXT;
ALTER TABLE sprint_items ADD COLUMN IF NOT EXISTS severity TEXT;
ALTER TABLE sprint_items ADD COLUMN IF NOT EXISTS resolution_deadline DATE;
ALTER TABLE sprint_items ADD COLUMN IF NOT EXISTS carry_over_count INTEGER DEFAULT 0;
```

### Script 3: Template/Cadência (Opção B - Rápida)

```sql
-- Transformar sprints em templates
ALTER TABLE sprints ADD COLUMN IF NOT EXISTS is_template BOOLEAN DEFAULT false;
ALTER TABLE sprints ADD COLUMN IF NOT EXISTS template_id UUID REFERENCES sprints(id);
ALTER TABLE sprints ADD COLUMN IF NOT EXISTS auto_create BOOLEAN DEFAULT true;

CREATE INDEX idx_sprints_template_id ON sprints(template_id);
CREATE INDEX idx_sprints_is_template ON sprints(is_template);
```

---

## 📊 Comparativo: Atual vs Profissional

| Aspecto | MVP Atual | Sistema Profissional |
|---------|-----------|----------------------|
| **Criação** | Manual | Manual + Auto-criação |
| **Histórico** | Parent ID | Check-ins + Cadências |
| **KRs** | Valor atual | Histórico completo + Gráficos |
| **Governança** | Nenhuma | Regras + Validações + Limites |
| **Tipos de Sprint** | Todas iguais | Operacional/Tático/Estratégico |
| **Carry-over** | Básico | Controlado + Limites + Motivos |
| **Automação** | Zero | Job diário + Notificações |
| **Métricas** | Contador básico | 4 blocos + Dashboard executivo |

---

## 🎯 Decisão Estratégica

### Opção A: MVP++ (Rápido)

**Implementar:**
- Check-ins básicos
- Toggle "mostrar concluídos"
- Validações soft

**Tempo:** 2-3 semanas  
**Valor:** Sistema usável profissionalmente

### Opção B: Sistema Completo (Robusto)

**Implementar:**
- Todas as 6 fases
- Dashboard executivo
- Automação completa

**Tempo:** 8-12 semanas  
**Valor:** Sistema enterprise-grade

### Opção C: Incremental (Recomendado)

**Implementar:**
- Fase 2 (Check-ins) → 3 semanas
- Avaliar uso e feedback
- Fase 3 ou 4 conforme necessidade

**Tempo:** Evolutivo  
**Valor:** Iterativo, baseado em feedback real

---

## 📝 Próximos Passos Imediatos

### 1. Validar Feedback com o Time

- Apresentar consultoria
- Priorizar features
- Definir fase inicial

### 2. Implementar Quick Wins (1 dia)

- Toggle "mostrar concluídos"
- Validações soft
- Contador de carry-over

### 3. Planejar Fase 2 (1 semana)

- Design de check-ins
- Protótipos de UX
- Estrutura de dados

---

## 🏆 Conclusão da Consultoria

**Pontos Fortes Atuais:**
- ✅ Implementação sólida do MVP
- ✅ Performance otimizada
- ✅ UX moderna
- ✅ Código bem estruturado

**Oportunidades de Evolução:**
- 🎯 Check-ins (histórico auditável)
- 🎯 Automação (menos manual)
- 🎯 Governança (disciplina)
- 🎯 Dashboard (visão executiva)

**Recomendação Final:**

> "Implemente Fase 2 (Check-ins) primeiro.  
> É o diferencial entre 'gerenciar tarefas' e 'gestão estratégica real'.  
> Com check-ins, você tem histórico, rastreabilidade e insights.  
> O resto é importante, mas check-in é transformador."

---

**Vou criar o plano de implementação da Fase 2?** 🚀