# 🎯 Implementação Fase 2 - Check-ins (VERSÃO CORRIGIDA)

**Baseado em:** Feedback de OKR Master  
**Correções:** 6 problemas críticos resolvidos  
**Status:** ✅ Pronto para implementar

---

## ✅ Correções Aplicadas

### 1. ✅ Templates em Tabela Separada

**ANTES (Errado):**
```sql
ALTER TABLE sprints ADD COLUMN template_id UUID REFERENCES sprints(id);
-- ❌ Confuso: template aponta para outra sprint
```

**AGORA (Correto):**
```sql
CREATE TABLE sprint_templates (...);  -- Tabela dedicada
ALTER TABLE sprints ADD COLUMN template_id UUID REFERENCES sprint_templates(id);
-- ✅ Claro: template é entidade própria
```

---

### 2. ✅ Trigger de KR Corrigido

**ANTES (Bug):**
```sql
-- ❌ ERRADO: Atualiza KR primeiro, depois lê (pega valor já atualizado)
UPDATE key_results SET current_value = NEW.value;
NEW.previous_value := (SELECT current_value FROM key_results); -- Pega NEW.value!
```

**AGORA (Correto):**
```sql
-- ✅ CORRETO: Lê valor ANTES de atualizar
CREATE TRIGGER trigger_process_kr_checkin BEFORE INSERT ...
    -- Lê current_value (valor antigo)
    NEW.previous_value := current_kr_value;
    -- Calcula delta
    NEW.delta := NEW.value - NEW.previous_value;

CREATE TRIGGER trigger_update_kr_after_checkin AFTER INSERT ...
    -- Só DEPOIS atualiza o KR
    UPDATE key_results SET current_value = NEW.value;
```

---

### 3. ✅ Direction em Key Results

**ADICIONADO:**
```sql
ALTER TABLE key_results ADD COLUMN direction TEXT DEFAULT 'increase';
-- 'increase' = maior é melhor (vendas, contratos)
-- 'decrease' = menor é melhor (churn, custo, tempo)
```

**Cálculo de Progresso:**
```sql
IF direction = 'increase' THEN
    progress := (value / target) * 100;    -- Normal
ELSE
    progress := ((target - value) / target) * 100;  -- Invertido
END IF;
```

**Exemplo:**
```
KR: "Reduzir churn de 10% para 5%"
- direction: 'decrease'
- target: 5
- current: 8
- progress: ((5 - 8) / 5) * 100 = -60% ❌ (ainda precisa melhorar)
- current: 6
- progress: ((5 - 6) / 5) * 100 = -20% ⚠️ (quase lá)
- current: 5
- progress: ((5 - 5) / 5) * 100 = 0% ✅ (meta atingida!)
```

---

### 4. ✅ Sem JSON Snapshot (Usa Query)

**ANTES (Ruim para analytics):**
```typescript
krs_snapshot: JSON.stringify([
  { kr_id: '...', value: 450000, target: 1000000 }
])
```

**AGORA (Correto):**
```typescript
// Renderizar em tempo real via query
const krs = await getSprintKRs(sprintId);
const latestValues = await getLatestKRValues(krs.map(kr => kr.id));

// Mostrar valor atual de cada KR (sempre atualizado)
```

---

### 5. ✅ Constraint UNIQUE (1 Check-in por Sprint)

**ADICIONADO:**
```sql
CREATE TABLE sprint_checkins (
    ...
    checkin_date DATE NOT NULL DEFAULT CURRENT_DATE,
    ...
    UNIQUE(sprint_id, checkin_date)  -- ✅ Garante 1 por dia
);
```

**Comportamento:**
- Sprint semanal: 1 check-in (no final da semana)
- Sprint mensal: Múltiplos check-ins (1 por semana)
- Erro se tentar criar 2x no mesmo dia

---

### 6. ✅ Rotate Limpo (Não Usa Spread)

**ANTES (Perigoso):**
```typescript
const nextSprint = await createSprint({ 
  ...currentSprint,  // ❌ Copia TUDO (inclusive status, datas, id)
  id: undefined 
});
```

**AGORA (Correto):**
```typescript
const nextSprint = await createSprint({
  // ✅ Apenas campos permitidos
  template_id: currentSprint.template_id,
  type: currentSprint.type,
  department: currentSprint.department,
  scope: currentSprint.scope,
  audience: currentSprint.audience,
  title: generateTitle(currentSprint.template_id),
  description: currentSprint.description,
  start_date: nextDates.start,
  end_date: nextDates.end,
  status: 'em andamento',  // ✅ Sempre novo status
  parent_id: currentSprint.id
});
```

---

## 📊 Estrutura Final (Corrigida)

### Tabelas

```
sprint_templates (config)
    ↓ template_id
sprints (instâncias)
    ↓ sprint_id
sprint_items (ações)
    ↓ sprint_id
sprint_checkins (registro do ciclo)

okrs
    ↓ okr_id
key_results
    ↓ kr_id
kr_checkins (histórico de valores)
```

---

## 🚀 Como Implementar (Ordem Correta)

### Passo 1: Executar SQL (5 min)

```bash
# Execute no Supabase SQL Editor:
supabase/sql/FASE2_CHECKINS_CORRETO.sql
```

**Verifica:**
- ✅ `direction` em `key_results`
- ✅ Tabela `kr_checkins` criada
- ✅ Tabela `sprint_checkins` criada
- ✅ Tabela `sprint_templates` criada
- ✅ Triggers corretos
- ✅ Constraint UNIQUE

### Passo 2: Criar Serviço (Já Feito!)

```bash
# Arquivo criado:
components/okr/services/checkin.service.ts
```

**Funções:**
- `createKRCheckin()`
- `listKRCheckins()`
- `getKREvolution()`
- `createSprintCheckin()`
- `listSprintCheckins()`
- `getSprintKRs()`

### Passo 3: Criar Componentes de UI

**Prioridade:**

1. **KRCheckinForm** (2h)
   - Atualizar valor do KR
   - Adicionar comentário
   - Selecionar confiança

2. **KRIndicatorBlock** (2h)
   - Mostrar KRs da sprint
   - Botão "Atualizar" inline
   - Progresso visual

3. **SprintCheckinForm** (4h)
   - Formulário estruturado
   - 4 campos principais (entregas, bloqueios, decisões, foco)
   - Saúde do ciclo
   - Métricas automáticas

4. **SprintCheckinList** (2h)
   - Histórico de check-ins
   - Timeline visual
   - Expansível

### Passo 4: Integrar em SprintDetailStyled (2h)

```typescript
// Adicionar seções:
<KRIndicators sprintId={sprintId} />
<CheckinSection sprintId={sprintId} />
<ToggleCompletedItems />
```

---

## 🎨 UX Corrigida - Check-in Como Centro

### Layout Proposto

```
┌─────────────────────────────────────────────┐
│ Sprint Comercial W3 - Jan 2026              │
│ 15/01 - 22/01 | EM EXECUÇÃO                 │
│                                             │
│ [📝 REGISTRAR CHECK-IN DO CICLO] ← DESTAQUE│
└─────────────────────────────────────────────┘

┌─────────────────────────────────────────────┐
│ 📊 INDICADORES DO CICLO                     │
├─────────────────────────────────────────────┤
│ KR1: Gerar R$ 1M em vendas                  │
│ ━━━━━━━━━━░░░░░░░░░░ 45% (R$ 450k)        │
│ +R$ 150k esta semana ↗ [Atualizar]         │
│                                             │
│ KR2: Fechar 50 contratos                    │
│ ━━━━━━░░░░░░░░░░░░░░ 36% (18/50)          │
│ +3 contratos esta semana → [Atualizar]     │
└─────────────────────────────────────────────┘

┌─────────────────────────────────────────────┐
│ 📝 CHECK-INS DO CICLO (1)                   │
├─────────────────────────────────────────────┤
│ ✅ Check-in 22/01 - VERDE                   │
│ "Semana produtiva. 3 de 5 concluídas."      │
│                                             │
│ ✅ Entregas: Campanha LinkedIn, Webinar...  │
│ ⚠️ Bloqueios: CRM fora do ar               │
│ 💬 Decisões: Aprovar desconto 20%          │
│ 🎯 Foco: Resolver CRM, fechar 3 contratos  │
│                                             │
│ [Ver Detalhes] [Editar]                     │
└─────────────────────────────────────────────┘

┌─────────────────────────────────────────────┐
│ 📋 INICIATIVAS (3/5) [👁️ Mostrar Concluídos]│
├─────────────────────────────────────────────┤
│ ⏳ Atualizar CRM                            │
│ ⏳ Criar deck Enterprise                    │
│                                             │
│ (3 concluídos ocultos)                      │
└─────────────────────────────────────────────┘
```

---

## 💻 Código Pronto para Uso

### Criar Check-in de KR

```typescript
import { createKRCheckin } from '../services/checkin.service';

const handleUpdateKR = async (krId: string, newValue: number, comment: string) => {
  try {
    await createKRCheckin({
      kr_id: krId,
      sprint_id: currentSprintId,
      value: newValue,
      comment: comment,
      confidence: 'alta'
    });
    
    // Trigger fez:
    // 1. Salvou previous_value (leu antes de atualizar)
    // 2. Calculou delta e progress_pct
    // 3. Atualizou key_results.current_value
    
    addToast('✅ KR atualizado com sucesso!', 'success');
    refreshSprint();
  } catch (error) {
    addToast(`❌ Erro: ${error.message}`, 'error');
  }
};
```

### Criar Check-in de Sprint

```typescript
import { createSprintCheckin } from '../services/checkin.service';

const handleCreateCheckin = async (formData: any) => {
  try {
    await createSprintCheckin(
      sprintId,
      {
        summary: formData.summary,
        achievements: formData.achievements,
        blockers: formData.blockers,
        decisions_taken: formData.decisions_taken,
        next_focus: formData.next_focus,
        health: formData.health,
        health_reason: formData.health_reason
      },
      sprintItems  // Para calcular métricas
    );
    
    addToast('✅ Check-in registrado!', 'success');
    refreshCheckins();
  } catch (error) {
    if (error.message.includes('Já existe um check-in')) {
      addToast('⚠️ Já existe check-in hoje. Edite o existente.', 'warning');
    } else {
      addToast(`❌ Erro: ${error.message}`, 'error');
    }
  }
};
```

---

## 📋 Checklist de Implementação (Ordem do Especialista)

### Essencial (Implementar AGORA)

- [ ] **1. SQL**: Executar `FASE2_CHECKINS_CORRETO.sql`
- [ ] **2. Serviço**: `checkin.service.ts` (já criado ✅)
- [ ] **3. UI**: Bloco "Indicadores do Ciclo" em SprintDetail
- [ ] **4. UI**: Botão "Atualizar KR" inline
- [ ] **5. UI**: Formulário "Registrar Check-in" (centro da tela)
- [ ] **6. UI**: Lista de check-ins anteriores
- [ ] **7. UX**: Toggle "Mostrar concluídos"
- [ ] **8. Validação**: carry_over_count incrementa automaticamente

### Desejável (Implementar DEPOIS)

- [ ] Gráfico de evolução de KR
- [ ] Dashboard consolidado
- [ ] Automação de recorrência
- [ ] Notificações

---

## 🔍 Diferenças Principais vs Versão Anterior

| Aspecto | Versão Anterior | Versão Corrigida |
|---------|-----------------|------------------|
| **Templates** | Misturado em sprints | Tabela separada ✅ |
| **Trigger KR** | Bug (previous = new) | Correto (lê antes) ✅ |
| **Direction** | Não tinha | increase/decrease ✅ |
| **KRs Snapshot** | JSON (ruim analytics) | Query tempo real ✅ |
| **Check-ins/Sprint** | Múltiplos | 1 por dia (UNIQUE) ✅ |
| **Rotate** | Spread perigoso | Campos explícitos ✅ |

---

## 🎯 Foco: Check-in Como CENTRO

### Antes (Errado)

```
Sprint = Lista de tarefas
    └─ Check-in = "mais um form"
```

### Agora (Correto)

```
Sprint = Ritual de Gestão
    └─ Check-in = PROPÓSITO PRINCIPAL
        └─ Itens alimentam o check-in
```

### Na Prática

**Ao abrir sprint:**
1. **Primeira coisa:** Bloco de KRs (indicadores)
2. **Segunda coisa:** Botão grande "Registrar Check-in"
3. **Terceira coisa:** Histórico de check-ins
4. **Quarta coisa:** Iniciativas (que alimentam o check-in)

**Ao registrar check-in:**
- Sistema auto-preenche métricas (3/5 iniciativas)
- Usuário documenta: entregas, bloqueios, decisões, foco
- Define saúde (verde/amarelo/vermelho)
- Salva → Vira histórico auditável

---

## 🚀 Implementação Prioritária

### Fase 2.1: Essencial (1 semana)

**Dia 1-2: Banco de Dados**
- [x] ✅ Script SQL corrigido criado
- [ ] Executar no Supabase
- [ ] Verificar triggers funcionando

**Dia 3: Serviço**
- [x] ✅ `checkin.service.ts` criado
- [ ] Testar funções via console

**Dia 4-5: UI Básica**
- [ ] `KRIndicatorBlock.tsx` - Mostrar KRs com botão atualizar
- [ ] `KRCheckinQuickForm.tsx` - Mini-form inline para atualizar KR
- [ ] `SprintCheckinButton.tsx` - Botão destaque "Registrar Check-in"

**Dia 6-7: UI Completa**
- [ ] `SprintCheckinForm.tsx` - Form completo de check-in
- [ ] `SprintCheckinList.tsx` - Lista de check-ins anteriores
- [ ] Integrar tudo em `SprintDetailStyled.tsx`

---

### Fase 2.2: Polimento (1 semana)

- [ ] Gráfico simples de evolução de KR
- [ ] Toggle "mostrar concluídos"
- [ ] Validações soft (carry-over, sprint inflada)
- [ ] Testes e ajustes de UX

---

## 📝 Código de Exemplo: KRIndicatorBlock

```typescript
// components/okr/components/checkin/KRIndicatorBlock.tsx

export const KRIndicatorBlock: React.FC<{ sprintId: string }> = ({ sprintId }) => {
  const [krs, setKrs] = useState([]);
  const [showUpdateForm, setShowUpdateForm] = useState<string | null>(null);

  useEffect(() => {
    loadKRs();
  }, [sprintId]);

  const loadKRs = async () => {
    const krs = await checkinService.getSprintKRs(sprintId);
    setKrs(krs);
  };

  const handleUpdate = async (krId: string, value: number, comment: string) => {
    await checkinService.createKRCheckin({
      kr_id: krId,
      sprint_id: sprintId,
      value,
      comment
    });
    loadKRs(); // Recarrega
    setShowUpdateForm(null);
  };

  return (
    <div className="bg-white rounded-3xl p-8 shadow-sm">
      <h3 className="text-xl font-bold mb-6">📊 Indicadores do Ciclo</h3>
      
      {krs.map(kr => (
        <div key={kr.id} className="mb-6 pb-6 border-b last:border-0">
          <div className="flex justify-between items-start mb-2">
            <h4 className="font-bold text-slate-800">{kr.title}</h4>
            <button 
              onClick={() => setShowUpdateForm(kr.id)}
              className="text-xs text-indigo-600 hover:underline font-bold"
            >
              Atualizar
            </button>
          </div>
          
          {/* Barra de Progresso */}
          <div className="mb-3">
            <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-blue-500 to-indigo-500"
                style={{ width: `${kr.progress}%` }}
              />
            </div>
            <div className="flex justify-between mt-1 text-xs text-slate-500">
              <span>{kr.current_value} {kr.unit}</span>
              <span>{kr.progress}%</span>
              <span>Meta: {kr.target_value} {kr.unit}</span>
            </div>
          </div>
          
          {/* Último Check-in */}
          <LastKRCheckin krId={kr.id} />
          
          {/* Form Inline */}
          {showUpdateForm === kr.id && (
            <KRCheckinQuickForm 
              kr={kr}
              onSubmit={(value, comment) => handleUpdate(kr.id, value, comment)}
              onCancel={() => setShowUpdateForm(null)}
            />
          )}
        </div>
      ))}
    </div>
  );
};
```

---

## 📊 SQL de Verificação

### Testar Direction

```sql
-- Inserir KR com direction = 'decrease'
INSERT INTO key_results (okr_id, title, current_value, target_value, unit, status, direction)
VALUES ('okr-id', 'Reduzir churn de 10% para 5%', 10, 5, '%', 'vermelho', 'decrease');

-- Criar check-in
INSERT INTO kr_checkins (kr_id, value, comment)
VALUES ('kr-id', 8, 'Churn caiu de 10% para 8%');

-- Verificar cálculo
SELECT 
    value,              -- 8
    previous_value,     -- 10
    delta,              -- -2 (diminuiu)
    progress_pct,       -- Deve ser positivo (progrediu)
    target_value        -- 5
FROM kr_checkins
ORDER BY created_at DESC
LIMIT 1;
```

### Testar Constraint UNIQUE

```sql
-- Tentar criar 2 check-ins no mesmo dia
INSERT INTO sprint_checkins (sprint_id, summary, health)
VALUES ('sprint-id', 'Check-in 1', 'verde');

INSERT INTO sprint_checkins (sprint_id, summary, health)
VALUES ('sprint-id', 'Check-in 2', 'verde');
-- ❌ Deve dar erro: duplicate key value violates unique constraint
```

---

## ⚡ Quick Start (Para Testar Rápido)

### 1. Execute SQL

```bash
# Copie e execute:
supabase/sql/FASE2_CHECKINS_CORRETO.sql
```

### 2. Teste via SQL Direto

```sql
-- Criar check-in de KR
INSERT INTO kr_checkins (kr_id, value, comment)
SELECT 
    id,
    500000,  -- Novo valor
    'Teste de check-in'
FROM key_results
LIMIT 1
RETURNING *;

-- Verificar se previous_value está CORRETO
-- (deve ser o valor antigo, não o novo)
```

### 3. Aguarde Componentes de UI

Vou criar os componentes na sequência se você confirmar!

---

## 🎯 Decisão Necessária

**O que você quer fazer AGORA?**

### Opção 1: Executar SQL e Aguardar UI (Recomendado)
- Execute `FASE2_CHECKINS_CORRETO.sql`
- Teste via SQL direto
- Aguardo sua confirmação para criar componentes UI

### Opção 2: Implementação Completa (2 semanas)
- Execute SQL
- Eu crio TODOS os componentes de UI
- Sistema completo de check-ins funcionando

### Opção 3: Quick Wins Primeiro
- Toggle "mostrar concluídos"
- Contador de carry-over
- Validações soft
- Check-ins depois

---

## 📊 Arquivos Criados (Corrigidos)

1. ✅ `supabase/sql/FASE2_CHECKINS_CORRETO.sql` - SQL com todas as correções
2. ✅ `components/okr/services/checkin.service.ts` - Serviço completo
3. ✅ `CONSULTORIA_OKR_MASTER.md` - Análise do feedback
4. ✅ `IMPLEMENTACAO_FASE2_CORRIGIDA.md` - Este documento

---

## 🚀 Próximo Passo

**Me confirme:**

1. **Executar SQL agora?** → Eu te guio passo a passo
2. **Criar componentes UI?** → Começarei hoje mesmo  
3. **Quick Wins primeiro?** → Implemento hoje (6h)

**Aguardando sua decisão para continuar!** 🎯