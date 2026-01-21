# 🏃 Guia Completo de Sprints - Ritmo de Execução

**Objetivo:** Entender como funcionam as Sprints no sistema GGV

---

## 📋 O Que São Sprints?

**Sprints** (ou "Rituais de Execução") são **ciclos de trabalho recorrentes** onde o time:

1. Define **iniciativas** (o que vai fazer)
2. Registra **impedimentos** (o que está bloqueando)
3. Toma **decisões** (resoluções importantes)
4. Executa **atividades** (tarefas operacionais)
5. Define **marcos** (milestones importantes)

### Tipos de Sprint

| Tipo | Duração | Uso Recomendado |
|------|---------|-----------------|
| **Semanal** | 7 dias | Equipes táticas, execução rápida |
| **Mensal** | ~30 dias | Projetos médios, departamentos |
| **Trimestral** | 90 dias | OKRs estratégicos |
| **Semestral** | 180 dias | Objetivos de longo prazo |
| **Anual** | 365 dias | Planejamento estratégico |

---

## 🎯 Anatomia de uma Sprint

### Estrutura

```
┌─────────────────────────────────────────────┐
│ SPRINT COMERCIAL W3 - JAN 2026              │
│ 📅 15/01/2026 - 22/01/2026                  │
│ 🏢 Departamento: Comercial                  │
│ 🎯 Status: Em Execução                      │
│ 📊 Progresso: 60% (3/5 concluídas)          │
├─────────────────────────────────────────────┤
│                                             │
│ 📋 INICIATIVAS & ENTREGAS (5)               │
│   ✅ Campanha LinkedIn Ads                  │
│   ✅ Webinar B2B                            │
│   ✅ Treinamento de vendas                  │
│   ⏳ Atualizar CRM                          │
│   ⏳ Criar apresentação Enterprise          │
│                                             │
│ 🛡️ IMPEDIMENTOS (2)                         │
│   ⚠️ CRM fora do ar                         │
│   ⚠️ Orçamento de Ads bloqueado             │
│                                             │
│ 💬 DECISÕES DO CICLO (1)                    │
│   "Aprovar desconto 20% para Enterprise"    │
│                                             │
└─────────────────────────────────────────────┘
```

### Componentes de uma Sprint

#### 1. **Iniciativas & Entregas** 📋

**O que é:** Ações que o time vai executar durante a sprint

**Exemplos:**
- Lançar campanha de LinkedIn Ads
- Realizar webinar sobre produto
- Treinar time de vendas
- Atualizar base de leads no CRM
- Criar deck de vendas para Enterprise

**Campos:**
- ✅ Título (obrigatório)
- Descrição (opcional)
- Responsável (opcional)
- Data limite (opcional)
- Status (Pendente → Em Andamento → Concluído)

#### 2. **Impedimentos** 🛡️

**O que é:** Bloqueios que estão impedindo o time de executar

**Exemplos:**
- CRM fora do ar
- Falta de aprovação de orçamento
- Dependência de outro time
- Ferramenta não funciona
- Falta de recursos

**Uso:**
- Registrar para visibilidade
- Priorizar resolução
- Acompanhar em reuniões

#### 3. **Decisões do Ciclo** 💬

**O que é:** Resoluções importantes tomadas durante a sprint

**Exemplos:**
- "Aprovar desconto de 20% para clientes Enterprise"
- "Adiar feature X para próximo trimestre"
- "Contratar 2 SDRs no Q2"
- "Mudar ferramenta de CRM"

**Uso:**
- Registro histórico
- Alinhamento do time
- Referência futura

#### 4. **Atividades** ⚡

**O que é:** Tarefas operacionais recorrentes

**Exemplos:**
- Atualizar dashboard semanal
- Revisar pipeline de vendas
- Enviar relatório ao CEO
- Backup de dados

#### 5. **Marcos** 🚩

**O que é:** Milestones ou entregas importantes

**Exemplos:**
- Lançamento de produto
- Fechamento de contrato grande
- Atingir meta de R$ 1M
- Concluir integração técnica

---

## 🔄 Ciclo de Vida de uma Sprint

### 1. **Planejamento** 📝

```
Status: Planejada
Ações:
  - Definir título e descrição
  - Definir datas
  - Vincular a OKRs
  - Planejar iniciativas (opcional)
```

### 2. **Execução** 🏃

```
Status: Em Andamento
Ações:
  - Adicionar iniciativas conforme surgem
  - Marcar itens como concluídos
  - Registrar impedimentos
  - Tomar decisões
  - Atualizar progresso
```

### 3. **Finalização** ✅

```
Status: Concluída
Ações:
  - Clicar "Finalizar Sprint"
  - Sistema cria próxima sprint automaticamente
  - Itens pendentes são copiados (carry-over)
  - Sprint antiga fica no histórico
```

### 4. **Recorrência** 🔁

```
Sprint Atual (W3)
    └─ Finalizar
        ↓
    Sprint Próxima (W4)
        └─ Itens Pendentes copiados com flag is_carry_over
        └─ Novos itens podem ser adicionados
```

---

## 💡 Como Funciona: Passo a Passo Técnico

### Criar uma Sprint

#### Frontend (SprintForm.tsx)

```typescript
// 1. Validação com Zod
const schema = z.object({
  title: z.string().min(5),
  type: z.enum(['semanal', 'mensal', ...]),
  okr_ids: z.array(z.string()).max(3)
});

// 2. Submit
const onSubmit = async (data) => {
  const result = await sprintStore.createSprint(
    sprintData,
    [], // items iniciais
    data.okr_ids
  );
};
```

#### Store (sprintStore.ts)

```typescript
createSprint: async (sprint, items, okrIds) => {
  set({ loading: true });
  
  // Chama serviço
  const created = await sprintService.createSprintWithItems(
    sprint, 
    items, 
    okrIds
  );
  
  // Atualiza estado
  set({ 
    sprints: [created, ...state.sprints],
    selectedSprint: created,
    loading: false 
  });
  
  return created;
}
```

#### Service (sprint.service.ts)

```typescript
export async function createSprintWithItems(
  sprint, 
  items, 
  okrIds
) {
  // 1. Criar sprint
  const createdSprint = await createSprint(sprint);
  
  // 2. Criar items
  for (const item of items) {
    await createSprintItem({ ...item, sprint_id: createdSprint.id });
  }
  
  // 3. Vincular OKRs
  if (okrIds.length > 0) {
    await updateSprintOKRs(createdSprint.id, okrIds);
  }
  
  return { ...createdSprint, items, okr_ids: okrIds };
}
```

#### Supabase (SQL)

```sql
-- 1. INSERT Sprint
INSERT INTO sprints (title, type, department, start_date, end_date, status, created_by)
VALUES ('Sprint W3', 'semanal', 'comercial', '2026-01-15', '2026-01-22', 'em andamento', 'user123');

-- 2. INSERT Items (se houver)
-- (neste caso não há items iniciais)

-- 3. INSERT Sprint OKRs
INSERT INTO sprint_okrs (sprint_id, okr_id)
VALUES 
  ('sprint123', 'okr1'),
  ('sprint123', 'okr2');
```

---

### Adicionar Iniciativa

#### Frontend (SprintItemForm.tsx)

```typescript
// 1. Validação manual
if (!formData.title.trim() || formData.title.length < 3) {
  addToast('Título obrigatório (min 3 caracteres)', 'error');
  return;
}

// 2. Submit
const result = await sprintService.createSprintItem({
  sprint_id,
  type: 'iniciativa',
  title: formData.title.trim(),
  description: formData.description || null,
  responsible: formData.responsible || null,
  responsible_user_id: formData.responsible_user_id || null,
  status: formData.status,
  due_date: formData.due_date || null,
  project_id: formData.project_id || null
});
```

#### Service (sprint.service.ts)

```typescript
export async function createSprintItem(item) {
  // 1. Verificar autenticação
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) throw new Error('Não autenticado');

  // 2. Preparar dados com fallback
  const fullData = { ...item, created_by: userData.user.id };
  const minimalData = { sprint_id, type, title, status };

  // 3. Tentar inserir
  try {
    return await insert(fullData);
  } catch (error) {
    if (error.message.includes('column')) {
      // Fallback: apenas obrigatórias
      return await insert(minimalData);
    }
    throw error;
  }

  // 4. Invalidar cache
  invalidateSprintCache(item.sprint_id);
}
```

#### Supabase (SQL)

```sql
-- Inserção com fallback automático
INSERT INTO sprint_items (
  sprint_id, 
  type, 
  title, 
  description, 
  responsible,
  status,
  due_date,
  created_by  -- Se coluna existir
) VALUES (
  'sprint123',
  'iniciativa',
  'Campanha LinkedIn',
  'Segmentação Enterprise',
  'Geraldo Hisao',
  'pendente',
  '2026-01-20',
  'user123'
);
```

---

### Marcar Item como Concluído

#### Frontend (SprintItemRow.tsx)

```typescript
// Click no checkbox
const toggleStatus = () => {
  const newStatus = isCompleted ? 'pendente' : 'concluído';
  onUpdate(item.id, { status: newStatus });
};

// Renderização
<button onClick={toggleStatus}>
  {isCompleted ? '✅' : '⭕'}
</button>
```

#### Service (sprint.service.ts)

```typescript
export async function updateSprintItem(id, updates) {
  // 1. Atualizar no banco
  const { data } = await supabase
    .from('sprint_items')
    .update({ status: 'concluído' })
    .eq('id', id)
    .select()
    .single();

  // 2. Invalidar cache
  invalidateSprintCache(data.sprint_id);
  
  return data;
}
```

#### Supabase (SQL)

```sql
UPDATE sprint_items 
SET status = 'concluído', updated_at = NOW()
WHERE id = 'item123';
```

#### Frontend (Atualização Visual)

```typescript
// 1. Store chama refreshSprint()
await refreshSprint();

// 2. refreshSprint força reload
await fetchSprintById(sprintId, true); // skipCache = true

// 3. getSprintById carrega novos dados
const sprint = await getSprintById(sprintId, true);

// 4. Componente re-renderiza
// - Checkbox fica verde ✅
// - Título fica riscado
// - Barra de progresso atualiza
// - Contador atualiza (3/5 → 4/5)
```

---

### Finalizar Sprint

#### Frontend (SprintDetailStyled.tsx)

```typescript
const handleFinalizeAndRotate = async () => {
  // 1. Confirmação
  if (!confirm('Finalizar e criar próxima?')) return;
  
  // 2. Chamar store
  const nextSprint = await finalizeAndCreateNext(sprintId);
  
  // 3. Redirecionar
  if (nextSprint?.id) {
    await fetchSprintById(nextSprint.id);
  }
};
```

#### Service (sprint.service.ts)

```typescript
export async function finalizeAndCreateNext(currentSprintId) {
  // 1. Buscar sprint atual
  const current = await getSprintById(currentSprintId);
  
  // 2. Marcar como concluída
  await updateSprint(currentSprintId, { status: 'concluída' });
  
  // 3. Calcular datas da próxima
  const nextDates = calculateNextSprintDates(
    current.end_date, 
    current.type
  );
  // Exemplo: end_date = 22/01 → nextStart = 23/01, nextEnd = 30/01 (semanal)
  
  // 4. Criar próxima sprint
  const nextSprint = await createSprint({
    title: current.title,
    type: current.type,
    department: current.department,
    start_date: nextDates.start_date,
    end_date: nextDates.end_date,
    status: 'em andamento',
    parent_id: current.id  // Link histórico
  });
  
  // 5. Copiar itens pendentes (carry-over)
  const pendingItems = current.items.filter(i => i.status !== 'concluído');
  
  for (const item of pendingItems) {
    await createSprintItem({
      sprint_id: nextSprint.id,
      type: item.type,
      title: item.title,
      description: item.description,
      responsible: item.responsible,
      status: item.status,
      is_carry_over: true  // ← Marcado como carry-over
    });
  }
  
  return { ...nextSprint, items: copiedItems };
}
```

#### Supabase (SQL)

```sql
-- 1. UPDATE sprint atual
UPDATE sprints 
SET status = 'concluída' 
WHERE id = 'sprint-w3';

-- 2. INSERT próxima sprint
INSERT INTO sprints (title, type, department, start_date, end_date, status, parent_id)
VALUES ('Sprint Comercial W3 - Jan 2026', 'semanal', 'comercial', '2026-01-23', '2026-01-30', 'em andamento', 'sprint-w3');

-- 3. INSERT items pendentes
INSERT INTO sprint_items (sprint_id, type, title, status, is_carry_over)
VALUES 
  ('sprint-w4', 'iniciativa', 'Atualizar CRM', 'pendente', true),
  ('sprint-w4', 'iniciativa', 'Criar apresentação', 'pendente', true);
```

---

## 🎨 Interface do Usuário

### Tela de Listagem (SprintList.tsx)

```
┌─────────────────────────────────────────────┐
│  Ritmo de Execução                          │
│  [+ Nova Sprint]  [Filtros ▼]               │
├─────────────────────────────────────────────┤
│                                             │
│  ┌──────────────────────────────────────┐  │
│  │ 🏃 Sprint Comercial W3               │  │
│  │ 📅 15/01 - 22/01 | SEMANAL           │  │
│  │ 🏢 Comercial | 🟢 Em Execução       │  │
│  │ 📊 60% concluído (3/5)               │  │
│  │ [Abrir Sprint →]                     │  │
│  └──────────────────────────────────────┘  │
│                                             │
│  ┌──────────────────────────────────────┐  │
│  │ 🏃 Sprint Marketing W3               │  │
│  │ ...                                  │  │
│  └──────────────────────────────────────┘  │
│                                             │
└─────────────────────────────────────────────┘
```

### Tela de Detalhes (SprintDetailStyled.tsx)

```
┌─────────────────────────────────────────────────────────┐
│ ⚡ SPRINT COMERCIAL W3 - JAN 2026                       │
│ 📅 15/01/2026 - 22/01/2026 | 🏢 Comercial              │
│ 🟢 EM EXECUÇÃO          [Finalizar Sprint] [Editar]    │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│ 📊 PROGRESSO DA SPRINT               60%                │
│ [████████████████░░░░░░░░░░]                            │
│ 0% Iniciado                                Meta: 100%   │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────┬───────────────────────────────┐
│ 📋 INICIATIVAS (3/5)    │ 🛡️ IMPEDIMENTOS (2)          │
│ [+ Adicionar]           │ [+ Adicionar]                 │
│                         │                               │
│ ✅ Campanha LinkedIn    │ ⚠️ CRM fora do ar             │
│ 👤 Geraldo Hisao        │ 📝 Desde 18/01                │
│ 📅 Até 20/01            │                               │
│                         │ ⚠️ Orçamento bloqueado        │
│ ✅ Webinar B2B          │                               │
│                         ├───────────────────────────────┤
│ ⏳ Atualizar CRM        │ 💬 DECISÕES (1)               │
│ (Em Andamento)          │ [+ Adicionar]                 │
│                         │                               │
└─────────────────────────┤ "Aprovar desconto 20%         │
                          │  para Enterprise"             │
                          │ — CEO                         │
                          └───────────────────────────────┘
```

---

## 🚀 Funcionalidades Especiais

### 1. **Carry-Over Automático**

Ao finalizar uma sprint, itens **não concluídos** são automaticamente copiados para a próxima:

```typescript
// Sprint W3: 5 iniciativas
// - 3 concluídas ✅
// - 2 pendentes ⏳

// Ao finalizar
finalizeAndCreateNext('sprint-w3');

// Sprint W4 criada com:
// - 2 iniciativas copiadas (is_carry_over = true)
// - Badge especial: 🔁 Carry-over
```

### 2. **Vínculo com Múltiplos OKRs**

Uma sprint pode focar em até **3 OKRs** simultaneamente:

```typescript
// Sprint pode ter:
okr_ids: ['okr-receita', 'okr-churn', 'okr-vendas']

// Filtra por departamento
const okrsDisponiveis = okrs.filter(o => 
  o.department === 'comercial' || o.department === 'geral'
);
```

### 3. **Responsável Flexível**

**3 modos de atribuição:**

```typescript
// 1. Nenhum responsável
{ responsible: null, responsible_user_id: null }

// 2. Responsável interno (usuário do sistema)
{ responsible: 'Geraldo Hisao', responsible_user_id: 'user123' }

// 3. Responsável externo (nome livre)
{ responsible: 'Consultor XYZ', responsible_user_id: null }
```

### 4. **Progresso Visual**

```typescript
// Cálculo automático
const completed = items.filter(i => i.status === 'concluído').length;
const progress = Math.round((completed / items.length) * 100);

// Renderização
<div className="progress-bar">
  <div style={{ width: `${progress}%` }} />
</div>
```

### 5. **Exportação PDF**

```typescript
// Botão na interface
<button onClick={handleExport}>Exportar PDF</button>

// Função
const handleExport = async () => {
  await exportElementToPDF(printableRef.current, {
    filename: `Sprint-${selectedSprint.title}.pdf`
  });
};
```

---

## 🔧 Configurações Avançadas

### Personalizar Duração de Sprints

```typescript
// sprint.service.ts → calculateNextSprintDates

switch (type) {
  case 'semanal':
    nextEnd.setDate(nextEnd.getDate() + 6);  // Altere aqui
    break;
  case 'mensal':
    nextEnd.setMonth(nextEnd.getMonth() + 1);
    break;
  // ...
}
```

### Personalizar Cache TTL

```typescript
// sprint.service.ts
const CACHE_TTL = 10000; // Altere aqui (em milissegundos)

// Exemplos:
// 5 segundos: 5000
// 30 segundos: 30000
// 1 minuto: 60000
```

### Personalizar Máximo de OKRs

```typescript
// SprintForm.tsx
okr_ids: z.array(z.string()).max(3, 'Máximo 3 OKRs')

// Para permitir 5:
okr_ids: z.array(z.string()).max(5, 'Máximo 5 OKRs')
```

---

## 📊 Relatórios e Métricas

### Métricas Disponíveis

```typescript
interface SprintMetrics {
  total: number;         // Total de sprints
  planned: number;       // Planejadas
  in_progress: number;   // Em andamento
  completed: number;     // Concluídas
}

// Uso
const metrics = await getSprintMetrics();
// { total: 12, planned: 2, in_progress: 5, completed: 5 }
```

### Calcular Taxa de Conclusão

```typescript
const completionRate = (sprint: SprintWithItems) => {
  const completed = sprint.items.filter(i => i.status === 'concluído').length;
  return (completed / sprint.items.length) * 100;
};
```

### Itens por Tipo

```typescript
const itemsByType = getSprintItemsByType(sprint.items);

// Retorna:
{
  iniciativa: [ {...}, {...} ],
  impedimento: [ {...} ],
  decisão: [ {...} ],
  atividade: [],
  marco: []
}

// Uso
const totalIniciativas = itemsByType.iniciativa.length;
const iniciativasConcluidas = itemsByType.iniciativa
  .filter(i => i.status === 'concluído').length;
```

---

## 🎯 Melhores Práticas

### 1. **Planeje Antes de Executar**

```
❌ RUIM: Criar sprint e já sair adicionando itens sem pensar
✅ BOM: 
  1. Criar sprint
  2. Revisar OKRs vinculados
  3. Planejar iniciativas principais
  4. Executar durante a semana
  5. Finalizar e revisar
```

### 2. **Use Carry-Over com Moderação**

```
❌ RUIM: Todas as sprints com 10+ itens carry-over
✅ BOM: 
  - Máximo 20-30% de carry-over
  - Analisar por que itens não foram concluídos
  - Replaanejar ou cancelar itens antigos
```

### 3. **Mantenha Sprints Focadas**

```
❌ RUIM: 20 iniciativas em uma sprint semanal
✅ BOM:
  - Semanal: 5-7 iniciativas
  - Mensal: 10-15 iniciativas
  - Trimestral: 20-30 iniciativas
```

### 4. **Registre Impedimentos Rapidamente**

```
✅ Assim que identificar um bloqueio, registre!
  - Visibilidade para o time
  - Priorização de resolução
  - Histórico de problemas
```

### 5. **Decisões Sejam Claras**

```
❌ RUIM: "Fazer algo sobre preços"
✅ BOM: "Aprovar desconto de 20% para Enterprise acima de R$ 100k/ano"
```

---

## 🧪 Testes de Funcionalidade

### Checklist Completo

**OKRs:**
- [ ] Criar OKR estratégico
- [ ] Adicionar 3 Key Results
- [ ] Editar OKR
- [ ] Atualizar valor de KR
- [ ] Ver progresso calculado
- [ ] Deletar OKR

**Sprints:**
- [ ] Criar sprint semanal
- [ ] Vincular a 2 OKRs
- [ ] Adicionar 3 iniciativas
- [ ] Adicionar 1 impedimento
- [ ] Adicionar 1 decisão
- [ ] Marcar iniciativa como concluída
- [ ] Ver progresso atualizar
- [ ] Finalizar sprint
- [ ] Ver próxima sprint criada
- [ ] Ver itens pendentes copiados

**Performance:**
- [ ] Abrir sprint < 1s
- [ ] Reabrir sprint = instantâneo (cache)
- [ ] Adicionar item < 1s
- [ ] Marcar concluído < 1s

---

## 📚 Recursos Adicionais

### Documentos Relacionados

- `DOCUMENTACAO_MODULO_OKR_SPRINT.md` - Documentação técnica completa
- `MELHORIAS_UX_IMPLEMENTADAS.md` - Histórico de melhorias de UX
- `OTIMIZACOES_PERFORMANCE_SPRINT.md` - Detalhes das otimizações
- `SOLUCAO_PROBLEMA_SPRINT_ITEMS.md` - Troubleshooting de erros

### Scripts SQL

- `ADICIONAR_TODAS_COLUNAS_DEFINITIVO.sql` - Corrigir sprint_items
- `CORRIGIR_TABELA_SPRINTS.sql` - Corrigir sprints
- `ADICIONAR_PARENT_ID_UPDATED_AT.sql` - Colunas opcionais

---

## ❓ FAQ

**P: Posso ter uma sprint sem OKR vinculado?**  
**R:** Sim! Sprints podem ser departamentais e não vinculadas a nenhum OKR.

**P: Quantas iniciativas posso adicionar?**  
**R:** Não há limite técnico, mas recomendamos 5-7 por sprint semanal.

**P: O que acontece com itens pendentes ao finalizar?**  
**R:** São automaticamente copiados para a próxima sprint com flag `is_carry_over = true`.

**P: Posso editar uma sprint após criada?**  
**R:** Sim! Clique no ícone de editar no header da sprint.

**P: Como faço para deletar um item?**  
**R:** Passe o mouse sobre o item e clique no ícone de lixeira que aparece.

**P: O cache pode causar dados desatualizados?**  
**R:** Não! O cache é invalidado automaticamente ao criar/atualizar/deletar itens.

**P: Preciso executar todos os scripts SQL?**  
**R:** Não! O código tem fallbacks. Mas scripts garantem funcionalidade completa.

---

**🎯 Agora você é expert em Sprints!** 🚀
