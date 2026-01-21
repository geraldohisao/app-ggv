# 🏃 Módulo Sprints - Documentação Completa

**Data**: 2026-01-13  
**Versão**: 1.5  
**Status**: ✅ Implementado (parcial)

---

## 🎯 Visão Geral

Sistema de gestão de **Sprints** para ritualização e execução de iniciativas, conectadas aos OKRs estratégicos.

### Características Principais

- ✅ Criação e edição de Sprints (Semanal, Mensal, Trimestral, Semestral, Anual)
- ✅ Gestão de itens da sprint (Iniciativas, Impedimentos, Decisões, Atividades, Marcos)
- ✅ Vinculação opcional a OKRs
- ✅ Dashboard com filtros
- ✅ Cálculo automático de progresso
- ✅ Indicador de sprint ativa (em andamento no período)
- ⚠️ Rotacionalização automática (finalizar e criar próxima) - implementado mas não testado
- ❌ Check-in de KRs durante sprints (planejado)
- ❌ Atualização automática de KRs ao concluir sprint (planejado)

---

## 📁 Estrutura de Arquivos

```
components/okr/
├── components/
│   └── sprint/
│       ├── SprintCard.tsx        # Card de exibição da sprint (lista)
│       ├── SprintForm.tsx        # Formulário de criação/edição ✨ MELHORADO
│       ├── SprintItemRow.tsx     # Linha de item da sprint
│       └── SprintItemForm.tsx    # Formulário de item
├── pages/
│   ├── SprintList.tsx            # Dashboard de sprints
│   ├── SprintDetail.tsx          # Detalhe de sprint (versão antiga)
│   └── SprintDetailStyled.tsx    # Detalhe de sprint (versão nova) ✨ CORRIGIDO
├── services/
│   ├── sprint.service.ts         # CRUD de Sprints e Items
│   └── project.service.ts        # CRUD de Projetos ✨ CORRIGIDO
├── store/
│   └── sprintStore.ts            # Zustand store (estado global)
└── types/
    └── sprint.types.ts           # Tipos e schemas Zod
```

---

## 🗄️ Estrutura de Dados (Banco de Dados)

### Tabela: `sprints`

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| `id` | UUID | PK |
| `okr_id` | UUID | FK para okrs (opcional, NULL allowed) |
| `type` | TEXT | `'semanal'`, `'mensal'`, `'trimestral'`, `'semestral'`, `'anual'` |
| `department` | TEXT | `'geral'`, `'comercial'`, `'marketing'`, `'projetos'` |
| `title` | TEXT | Nome da sprint |
| `description` | TEXT | Descrição opcional |
| `start_date` | DATE | Início do período |
| `end_date` | DATE | Fim do período |
| `status` | TEXT | `'planejada'`, `'em andamento'`, `'concluída'`, `'cancelada'` |
| `parent_id` | UUID | FK para sprints (rotação: sprint anterior) |
| `created_by` | UUID | FK para auth.users |
| `created_at` | TIMESTAMPTZ | Data de criação |

### Tabela: `sprint_items`

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| `id` | UUID | PK |
| `sprint_id` | UUID | FK para sprints (CASCADE delete) |
| `type` | TEXT | `'iniciativa'`, `'impedimento'`, `'decisão'`, `'atividade'`, `'marco'` |
| `title` | TEXT | Nome do item |
| `description` | TEXT | Descrição opcional |
| `responsible` | TEXT | Nome do responsável (texto livre) |
| `status` | TEXT | `'pendente'`, `'em andamento'`, `'concluído'` |
| `due_date` | DATE | Prazo opcional |
| `is_carry_over` | BOOLEAN | Se foi carregado da sprint anterior |
| `project_id` | UUID | FK para projetos (opcional) |
| `created_at` | TIMESTAMPTZ | Data de criação |

### Tabela: `kr_checkins` (Check-ins de KRs)

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| `id` | UUID | PK |
| `sprint_id` | UUID | FK para sprints |
| `kr_id` | UUID | FK para key_results |
| `value` | NUMERIC | Novo valor reportado |
| `previous_value` | NUMERIC | Valor anterior |
| `comment` | TEXT | Comentário opcional |
| `created_at` | TIMESTAMPTZ | Data do check-in |

**Nota**: Check-ins permitem atualizar KRs a cada sprint (feature planejada, não implementada no frontend ainda).

### Tabela: `projects` (Projetos)

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| `id` | UUID | PK |
| `okr_id` | UUID | FK para okrs (opcional) |
| `title` | TEXT | Nome do projeto |
| `description` | TEXT | Descrição |
| `owner` | TEXT | Responsável |
| `status` | TEXT | `'ativo'`, `'pausado'`, `'concluído'`, `'cancelado'` |
| `priority` | TEXT | `'baixa'`, `'média'`, `'alta'`, `'crítica'` |
| `created_at` | TIMESTAMPTZ | Data de criação |
| `updated_at` | TIMESTAMPTZ | Data de atualização |

**Nota**: Projetos são entidades de médio/longo prazo que podem ser vinculadas a OKRs e têm itens de sprint associados.

---

## 🔐 Controle de Acesso (RLS)

### Permissões por Role

| Role | Criar Sprint | Editar Sprint | Deletar Sprint | Ver Sprints |
|------|--------------|---------------|----------------|-------------|
| **CEO (SUPER_ADMIN)** | ✅ Todas | ✅ Todas | ✅ Todas | ✅ Todas |
| **HEAD (ADMIN)** | ✅ Seu dept | ✅ Seu dept | ✅ Seu dept | ✅ Geral + Seu dept |
| **Operacional (USER)** | ❌ Não | ❌ Não | ❌ Não | ✅ Apenas leitura |

### Regras de Negócio (RLS)

- **Sprint Geral**: Apenas CEO pode criar/editar.
- **Sprint Setorial**: HEAD do departamento pode criar/editar, mas apenas no seu próprio departamento.
- **Sprint Items**: Herdam as permissões da sprint pai.

---

## 🎨 Fluxos de Usuário

### 1. Criar Nova Sprint

1. Usuário clica em "Nova Sprint" (se tiver permissão).
2. Formulário abre com campos vazios ✨ **MELHORADO (layout 2 colunas, status visual)**.
3. Preenche:
   - Título (mínimo 5 caracteres)
   - Descrição (opcional)
   - Tipo (semanal/mensal/trimestral/semestral/anual)
   - Departamento
   - Período (início/fim)
   - Status (botões grandes coloridos) ✨ **NOVO**
   - Vincular a OKR (opcional)
4. Clica em "Criar Sprint".
5. Backend:
   - Valida dados.
   - Cria sprint na tabela `sprints`.
   - Usa `created_by` do usuário autenticado.
6. Lista atualiza com a nova sprint.

### 2. Editar Sprint Existente

1. Usuário entra no detalhe da sprint.
2. Clica no ícone de **lápis (✏️)** no header ✨ **AGORA FUNCIONAL**.
3. Formulário abre preenchido com dados da sprint.
4. Usuário altera campos.
5. **Se não alterar nada** e clicar em "X", fecha sem perguntar ✨ **NOVO: usa `isDirty`**.
6. **Se alterar** e clicar em "X", pergunta "Tem certeza?...".
7. Ao salvar:
   - Atualiza sprint.
   - Items não são alterados (precisam ser editados individualmente).

### 3. Adicionar Itens à Sprint

1. No detalhe da sprint, clicar em "+ Adicionar" na seção desejada (Iniciativas, Impedimentos, Decisões).
2. Modal abre para criar item do tipo correspondente.
3. Preenche: título, descrição, responsável, prazo.
4. Salva.
5. Item aparece na lista.

### 4. Finalizar Sprint e Rotacionar

1. Na página de detalhe, clicar em "Finalizar e Criar Próxima" (botão deve existir, não visível na implementação atual).
2. Sistema:
   - Marca a sprint atual como "concluída".
   - Cria uma nova sprint com:
     - Mesmos tipo/departamento.
     - Datas ajustadas automaticamente (próxima semana, próximo mês, etc).
     - Itens pendentes carregados (`is_carry_over = true`).
3. Nova sprint abre automaticamente.

**Status**: ⚠️ Backend implementado (`finalizeAndCreateNext`), frontend pendente.

---

## 📊 Cálculo de Progresso

### Progresso de Sprint (%)

```
progress = (items concluídos / total de items) * 100
```

Simples e direto: conta quantos items da sprint estão marcados como "concluído".

### Indicador de Sprint Ativa

```typescript
isSprintActive(sprint) {
  const today = new Date();
  return start_date <= today && today <= end_date;
}
```

Sprint ativa é aquela cujo período contém a data atual.

---

## 🎨 Interface (UI/UX)

### SprintForm (Formulário) ✨ MELHORADO

**Layout**: 2 colunas responsivas (similar ao OKRFormSimple)
- **Esquerda**: Título, Descrição, Vínculo com OKR.
- **Direita**: Tipo, Departamento, Datas, Status.

**Melhorias Aplicadas**:
- ✅ Layout em 2 colunas (aproveitamento de espaço).
- ✅ Status com botões visuais (cards coloridos) em vez de dropdown.
- ✅ Modal mais largo (`max-w-6xl` em vez de `max-w-4xl`).
- ✅ Fechamento inteligente (`isDirty`).
- ✅ AutoComplete off.
- ✅ Header sticky com botão de fechar estilizado.

**Campos**:
- Título (input grande)
- Descrição (textarea 4 linhas)
- Tipo de Sprint (select: semanal/mensal/trimestral/semestral/anual)
- Departamento (select)
- Período (date range: início/fim)
- Status (radio buttons visuais: planejada/em andamento/concluída/cancelada) ✨ **NOVO**
- Vincular a OKR (select opcional)

### SprintDetailStyled (Detalhe da Sprint)

**Header Escuro** (conforme print fornecido):
- Ícone de raio (⚡) em destaque.
- Título da sprint.
- Badges de tipo e datas.
- Indicador de status ("EM EXECUÇÃO" com bolinha pulsante).
- **Botão de edição (✏️)** ✨ **AGORA FUNCIONAL**.

**Corpo** (3 seções principais):
- **Iniciativas & Entregas**: Lista de ações/tarefas da sprint.
- **Impedimentos**: Lista de bloqueios.
- **Decisões**: Lista de decisões tomadas.

Cada seção:
- Contador de itens concluídos/total.
- Botão "+ Adicionar".
- Lista de items (cards brancos com status).

---

## ⚙️ Regras de Negócio

### Validações

1. **Título**: Mínimo 5 caracteres.
2. **Datas**: `start_date` <= `end_date`.
3. **Tipo**: Obrigatório (semanal/mensal/etc).
4. **Departamento**: Obrigatório.
5. **Status**: Obrigatório.

### Comportamentos Especiais

- **Vinculação a OKR**: Opcional. Se vinculado, permite tracking de impacto da sprint no objetivo.
- **Itens pendentes**: Ao finalizar uma sprint, itens não concluídos podem ser carregados para a próxima (`is_carry_over = true`).
- **Rotacionalização**: Sprints podem ser rotacionadas automaticamente (concluir uma e criar a próxima com datas ajustadas).

---

## 🔗 Integração com OKRs

### Conceito

Sprints são **ciclos de execução** que contribuem para os **OKRs** (objetivos estratégicos).

- Um **OKR** pode ter múltiplas **Sprints** vinculadas.
- Uma **Sprint** pode estar vinculada a **um OKR** (ou nenhum).
- Ao concluir uma sprint, os KRs do OKR vinculado podem ser atualizados automaticamente (planejado).

### Check-ins de KRs

**Tabela `kr_checkins`** (implementada no backend, não no frontend):
- Permite registrar valores de KRs a cada sprint.
- Ex: Sprint semanal → reportar progresso dos KRs vinculados ao OKR.
- Histórico de evolução do KR ao longo das sprints.

**Status**: ⚠️ Backend pronto, frontend pendente.

---

## 🐛 Issues Conhecidos / Corrigidos

### 1. ✅ Botão de Edição (Lápis) Não Funcionava

**Problema**: O ícone de lápis no header da `SprintDetailStyled` estava sem `onClick`.

**Solução Aplicada**:
- Adicionado estado `showEditForm`.
- Configurado `onClick={() => setShowEditForm(true)}` no botão.
- Renderizado `SprintForm` condicionalmente quando `showEditForm = true`.

**Status**: ✅ Resolvido.

### 2. ✅ Import Incorreto em `project.service.ts`

**Problema**: Arquivo importava `from '../../../lib/supabase'` (caminho inexistente).

**Solução Aplicada**:
- Corrigido para `from '../../../services/supabaseClient'`.

**Status**: ✅ Resolvido.

### 3. ⚠️ Fechamento Sem Verificação de Alterações

**Problema**: Modal sempre perguntava "Tem certeza?" mesmo sem editar nada.

**Solução Aplicada**:
- Adicionado `isDirty` do react-hook-form.
- `handleClose` só pergunta se `isDirty = true`.

**Status**: ✅ Resolvido.

---

## 🚀 Funcionalidades Implementadas

### ✅ CRUD de Sprints

- Criar (`createSprint`)
- Ler/Listar (`listSprints`, `getSprintById`)
- Atualizar (`updateSprint`)
- Deletar (`deleteSprint`)

### ✅ CRUD de Sprint Items

- Criar (`createSprintItem`)
- Atualizar (`updateSprintItem`)
- Deletar (`deleteSprintItem`)
- Listar por Sprint (`getSprintItemsByType`)

### ✅ Métricas

- Total de sprints
- Sprints planejadas, em andamento, concluídas
- Progresso por sprint (% de items concluídos)

### ✅ Filtros

- Por tipo (semanal/mensal/etc)
- Por departamento
- Por status
- Busca por texto no título

### ✅ Vinculação a OKRs

- Campo `okr_id` na tabela sprints
- Select no formulário para escolher OKR
- Badge no card mostrando OKR vinculado

### ⚠️ Rotacionalização (Backend Pronto, Frontend Pendente)

Função `finalizeAndCreateNext(sprintId)`:
1. Marca sprint atual como "concluída".
2. Busca items pendentes.
3. Cria nova sprint com:
   - Tipo/departamento iguais.
   - Datas ajustadas (próxima semana/mês/etc).
   - Items pendentes carregados (`is_carry_over`).
4. Retorna a nova sprint.

**Implementação Frontend**: Botão "Finalizar e Rotacionar" ainda não está visível na UI.

---

## 🎯 Tipos de Items de Sprint

### 1. 🎯 Iniciativa
- Ação concreta a ser executada.
- Ex: "Gerar 50 leads qualificados".

### 2. 🛡️ Impedimento
- Bloqueio ou problema que precisa ser resolvido.
- Ex: "Sistema de CRM fora do ar".

### 3. 💡 Decisão
- Decisão importante tomada durante a sprint.
- Ex: "Aprovado investimento de R$ 50k em ads".

### 4. ✅ Atividade
- Tarefa genérica.
- Ex: "Treinar time sobre novo processo".

### 5. 🏁 Marco
- Milestone ou entrega importante.
- Ex: "Lançamento do novo produto".

---

## 🎨 Design do SprintForm ✨ MELHORADO

### Antes
- Layout vertical simples.
- Status como dropdown.
- Fechamento sempre pergunta "Tem certeza?".

### Depois
- **Layout em 2 colunas** (melhor aproveitamento de espaço).
- **Status como radio buttons visuais** (cards coloridos, fácil de identificar).
- **Fechamento inteligente** (só pergunta se `isDirty`).
- **Modal mais largo** (max-w-6xl).
- **Estilo unificado** com OKRs (rounded-[2.5rem], sombras, tipografia).

---

## 📝 Próximas Melhorias Sugeridas

### 1. 📊 Check-ins de KRs durante Sprints

- Interface para, ao concluir uma sprint, atualizar os KRs vinculados ao OKR.
- Formulário rápido: "Qual o novo valor do KR X?" para cada KR do OKR vinculado.
- Salvar na tabela `kr_checkins`.

### 2. 🔄 Botão de Rotacionalização

- Adicionar botão "Finalizar e Criar Próxima" no detalhe da sprint.
- Ao clicar:
  - Modal de confirmação mostrando items pendentes.
  - Criar nova sprint automaticamente.
  - Redirecionar para a nova sprint.

### 3. 📈 Dashboard Executivo de Sprints

- Métricas agregadas:
  - Total de sprints ativas.
  - % de conclusão média.
  - Items pendentes totais.
  - Comparação semanal/mensal.
- Gráficos visuais.

### 4. 🏆 Gamificação

- Streak de sprints concluídas no prazo.
- Ranking de departamentos com melhor taxa de conclusão.
- Badges/conquistas.

### 5. 📅 Calendário de Sprints

- Visualização em calendário das sprints ativas/planejadas.
- Identificar gaps ou sobreposições.

### 6. 🔗 Vinculação Sprint ↔ Projeto

- Permitir vincular items de sprint a projetos (`project_id`).
- Tracking de progresso de projetos baseado em sprints.

### 7. 📧 Notificações

- Alertar responsáveis:
  - Quando sprint iniciar (3 dias antes).
  - Quando sprint estiver terminando (2 dias antes).
  - Items com prazo vencido.

---

## 🛠️ Como Testar

### Pré-requisitos

1. Banco de dados configurado:
   - Rodar `components/okr/sql/okr_v2_schema.sql` (cria tabela sprints).
   - Rodar `components/okr/sql/okr_v2_incremental_improvements.sql`.

2. Usuário com perfil adequado:
   ```sql
   UPDATE profiles 
   SET role = 'SUPER_ADMIN', department = 'geral' 
   WHERE id = '<user_id>';
   ```

### Testes Manuais

1. **Criar Sprint**:
   - Navegar para `/okr` → aba "Sprints" (ou `/okr/sprints`).
   - Clicar em "Nova Sprint".
   - Preencher formulário.
   - Testar seleção de status com botões visuais.
   - Salvar.
   - Verificar se aparece na lista.

2. **Editar Sprint**:
   - Clicar em um card de sprint (abre detalhe).
   - Clicar no ícone de lápis (✏️) no header.
   - Alterar dados.
   - Salvar.
   - Verificar se atualiza.

3. **Adicionar Items**:
   - No detalhe da sprint, clicar em "+ Adicionar" em qualquer seção.
   - Preencher formulário de item.
   - Salvar.
   - Verificar se item aparece na lista.

4. **Vincular a OKR**:
   - Criar sprint vinculada a um OKR existente.
   - Verificar se badge "OKR Vinculado" aparece no card.

---

## 🚨 Problemas em Aberto

1. ⚠️ **Rotacionalização não tem botão na UI**: Implementado no backend (`finalizeAndCreateNext`), mas falta criar o botão "Finalizar e Criar Próxima" na página de detalhe.
2. ⚠️ **Check-ins de KRs**: Tabela `kr_checkins` existe, mas não há interface para criar check-ins.
3. ⚠️ **Atualização automática de KRs**: Ao concluir sprint vinculada a OKR, não atualiza os KRs automaticamente.
4. ⚠️ **Projetos**: Tabela `projects` existe, mas não há CRUD completo na UI.

---

## 🎓 Decisões Arquiteturais

1. **Sprints independentes de OKRs**: Podem existir sem vínculo (útil para sprints operacionais).
2. **Rotacionalização via `parent_id`**: Permite rastrear a cadeia de sprints rotacionadas (sprint filha → pai → avô).
3. **Items com `is_carry_over`**: Marca items que foram "herdados" da sprint anterior (não concluídos).
4. **Responsável como texto livre**: Facilita preenchimento rápido, mas dificulta joins/relatórios.
5. **Vínculo 1:N (Sprint → OKR)**: Uma sprint pode vincular a um OKR, mas um OKR pode ter várias sprints.

---

## 📚 Comparação: OKRs vs Sprints

| Aspecto | OKRs | Sprints |
|---------|------|---------|
| **Foco** | Objetivos estratégicos (O que?) | Execução tática (Como?) |
| **Duração** | Trimestral/Anual | Semanal/Mensal/Trimestral |
| **Medição** | Key Results (métricas) | Items concluídos (%) |
| **Hierarquia** | Estratégico → Setorial | Geral → Departamental |
| **IA** | ✅ Sugestão de KRs | ❌ Não aplicável |
| **Rotacionalização** | Não (OKRs são únicos) | ✅ Sim (sprints recorrentes) |

---

## 📝 Logs e Debug

### Console Logs Importantes (após correção)

- `📝 Submitting Sprint data: ...`
- `🔄 Atualizando sprint <id>...`
- `🆕 Criando nova sprint...`
- `✅ Sprint salva com sucesso!`
- `❌ Falha ao salvar sprint (result null)`

### Erros Comuns

- **404 ao salvar**: RLS bloqueando (verificar se usuário tem permissão para o departamento da sprint).
- **Formulário não fecha após salvar**: Verificar se `onSuccess` está sendo chamado.
- **Botão de lápis não funciona**: Import do `SprintForm` faltando ou estado `showEditForm` não configurado.

---

**Fim da Documentação** 🎉

Para continuar melhorando o módulo de Sprints, priorize:
1. ✅ Corrigir botão de edição (feito).
2. ⚠️ Implementar rotacionalização na UI (botão + modal de confirmação).
3. ⚠️ Criar interface de check-in de KRs.
4. 📊 Quick edit para atualizar items sem abrir formulário completo.

