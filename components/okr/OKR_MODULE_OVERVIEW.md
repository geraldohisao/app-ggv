# 📊 Módulo OKR - Documentação Completa

**Data**: 2026-01-12  
**Versão**: 2.0  
**Status**: ✅ Em Produção

---

## 🎯 Visão Geral

Sistema de gestão de **Objectives and Key Results (OKRs)** para planejamento estratégico e setorial da organização.

### Características Principais

- ✅ Criação e edição de OKRs (Estratégicos e Setoriais)
- ✅ Gestão de Key Results (KRs) com tipos variados (numérico, percentual, moeda, atividade)
- ✅ Sugestão de KRs via IA (OpenAI/Gemini)
- ✅ Cálculo automático de progresso e status
- ✅ Dashboard com filtros e visualização em lista
- ✅ Avatares dos responsáveis
- ✅ Descrições opcionais para KRs
- ✅ Formatação de valores monetários e percentuais
- ✅ RLS (Row Level Security) baseado em roles

---

## 📁 Estrutura de Arquivos

```
components/okr/
├── components/
│   ├── okr/
│   │   ├── OKRCard.tsx           # Card de exibição do OKR (lista)
│   │   ├── OKRFormSimple.tsx     # Formulário de criação/edição
│   │   └── KeyResultItem.tsx     # (Não usado atualmente)
│   ├── shared/
│   │   ├── ProgressBar.tsx       # Barra de progresso visual
│   │   ├── EmptyState.tsx        # Estado vazio
│   │   ├── LoadingState.tsx      # Estado de carregamento
│   │   └── Badge.tsx             # Badges visuais
│   └── sprint/
│       └── [componentes de sprint - futuro]
├── hooks/
│   ├── useOKRUsers.ts            # Lista usuários com avatar
│   ├── usePermissions.ts         # Controle de permissões
│   └── useThrottledSave.ts       # Salvamento com debounce
├── pages/
│   ├── OKRDashboard.tsx          # Dashboard principal (lista de OKRs)
│   └── PerformanceHome.tsx       # Home do módulo Performance
├── services/
│   ├── okr.service.ts            # CRUD de OKRs e KRs
│   ├── krAIService.ts            # Sugestão de KRs com IA
│   └── sprint.service.ts         # CRUD de Sprints (futuro)
├── store/
│   ├── okrStore.ts               # Zustand store (estado global)
│   └── sprintStore.ts            # Store de sprints
├── types/
│   ├── okr.types.ts              # Tipos e schemas Zod
│   └── sprint.types.ts           # Tipos de sprints
├── utils/
│   ├── krProgress.ts             # Cálculo de progresso de KR
│   ├── exportToPDF.ts            # Exportação (futuro)
│   └── validation.ts             # Validações customizadas
├── sql/
│   ├── okr_v2_schema.sql         # Schema principal (tabelas + RLS)
│   ├── okr_v2_incremental_improvements.sql  # Melhorias incrementais
│   ├── enable_auto_kr_status.sql # Auto-cálculo de status (NOVO)
│   └── add_kr_description_manual.sql # Campo description
└── OKRModule.tsx                 # Componente wrapper do módulo
```

---

## 🗄️ Estrutura de Dados (Banco de Dados)

### Tabela: `okrs`

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| `id` | UUID | PK |
| `user_id` | UUID | FK para auth.users (quem criou) |
| `level` | TEXT | `'estratégico'` ou `'setorial'` |
| `department` | TEXT | `'geral'`, `'comercial'`, `'marketing'`, `'projetos'` |
| `owner` | TEXT | Nome do responsável (texto livre) |
| `objective` | TEXT | Descrição do objetivo |
| `start_date` | DATE | Início do período |
| `end_date` | DATE | Fim do período |
| `periodicity` | TEXT | `'mensal'` ou `'trimestral'` |
| `status` | TEXT | `'não iniciado'`, `'em andamento'`, `'concluído'` |
| `notes` | TEXT | Observações gerais |
| `archived` | BOOLEAN | Soft delete (FALSE = ativo) |
| `created_at` | TIMESTAMPTZ | Data de criação |
| `updated_at` | TIMESTAMPTZ | Data de atualização |

### Tabela: `key_results`

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| `id` | UUID | PK |
| `okr_id` | UUID | FK para okrs (CASCADE delete) |
| `title` | TEXT | Nome do KR |
| `type` | TEXT | `'numeric'`, `'percentage'`, `'currency'`, `'activity'` |
| `direction` | TEXT | `'increase'` ou `'decrease'` (opcional para activity) |
| `start_value` | NUMERIC | Valor inicial (baseline) |
| `current_value` | NUMERIC | Valor atual |
| `target_value` | NUMERIC | Meta a atingir |
| `unit` | TEXT | Unidade (ex: `leads`, `%`, `R$`) |
| `activity_done` | BOOLEAN | Se atividade está concluída |
| `status` | TEXT | `'verde'`, `'amarelo'`, `'vermelho'` (CALCULADO AUTO) |
| `description` | TEXT | Descrição/detalhes opcionais (**NOVO**) |
| `updated_at` | TIMESTAMPTZ | Data de atualização |

### Views e Funções

- **`okrs_with_progress`**: View com progresso calculado, contagem de KRs por cor, flag `is_overdue`, e `owner_avatar_url`.
- **`list_users_for_okr()`**: RPC que retorna usuários ativos com avatar.
- **`calculate_okr_progress(okr_id)`**: Função que calcula % de progresso do OKR.
- **`calculate_kr_status_auto(...)`**: Função que calcula status do KR baseado em progresso vs. tempo (**NOVO**).
- **Trigger `trigger_auto_update_kr_status`**: Atualiza `status` do KR automaticamente ao salvar (**NOVO**).

---

## 🔐 Controle de Acesso (RLS)

### Permissões por Role

| Role | Criar OKR | Editar OKR | Deletar OKR | Ver OKRs |
|------|-----------|------------|-------------|----------|
| **CEO (SUPER_ADMIN)** | ✅ Todos | ✅ Todos | ✅ Todos | ✅ Todos |
| **HEAD (ADMIN)** | ✅ Seu dept | ✅ Seu dept | ✅ Seu dept | ✅ Estratégicos + Seu dept |
| **Operacional (USER)** | ❌ Não | ❌ Não | ❌ Não | ✅ Apenas leitura |

### Regras de Negócio (RLS)

- **OKR Estratégico**: Apenas CEO pode criar/editar.
- **OKR Setorial**: HEAD do departamento pode criar/editar, mas apenas no seu próprio departamento.
- **Key Results**: Herdam as permissões do OKR pai.

---

## 🎨 Fluxos de Usuário

### 1. Criar Novo OKR

1. Usuário clica em "Criar Novo OKR" (se tiver permissão).
2. Formulário abre com campos vazios.
3. Preenche:
   - Objetivo (mínimo 10 caracteres)
   - Responsável (dropdown de usuários ativos)
   - Departamento
   - Período (início/fim, periodicidade)
4. Adiciona Key Results (1-5):
   - Título
   - Tipo (quantidade, %, R$, atividade)
   - Direção (aumentar/diminuir)
   - Valores (Inicial, Atual, Meta)
   - Descrição opcional (**NOVO**)
5. Clica em "Salvar Objetivo".
6. Backend:
   - Valida dados.
   - Cria OKR na tabela `okrs`.
   - Cria KRs na tabela `key_results`.
   - **Trigger calcula status automaticamente** (**NOVO**).
7. Dashboard atualiza com o novo OKR.

### 2. Sugerir KRs com IA

1. No formulário, usuário preenche o objetivo.
2. Clica em "Sugerir com IA".
3. Frontend:
   - Chama `krAIService.suggestKeyResults(objetivo)`.
   - Tenta OpenAI (GPT-4o-mini).
   - Se falhar, fallback para Gemini (gemini-2.0-flash ou 1.5-flash).
4. IA retorna 3-5 sugestões de KRs com:
   - Título, tipo, direção, valores, unidade, rationale.
5. Frontend limpa KRs existentes e insere as sugestões.
6. Usuário pode ajustar e salvar.

### 3. Editar OKR Existente

1. Usuário clica em um card de OKR no dashboard.
2. Formulário abre preenchido com dados do OKR.
3. Usuário altera campos (se tiver permissão).
4. **Se não alterar nada** e clicar em "X", fecha sem perguntar (**NOVO: usa `isDirty`**).
5. **Se alterar** e clicar em "X", pergunta "Tem certeza?...".
6. Ao salvar:
   - Atualiza OKR.
   - Atualiza/Cria/Deleta KRs conforme necessário.
   - Trigger recalcula status dos KRs.

### 4. Visualizar OKRs (Dashboard)

1. Usuário navega para `/okr`.
2. Dashboard lista OKRs (filtrados por permissões).
3. Filtros disponíveis:
   - Nível (Estratégico/Setorial)
   - Departamento
   - Busca por texto no objetivo
4. Cards mostram:
   - Badges de nível/departamento/atrasado.
   - Objetivo.
   - Lista de KRs com:
     - Título e descrição (truncada, tooltip no hover) (**NOVO**).
     - Progresso visual (barra colorida).
     - Valores atual vs. meta.
     - Status (bolinha verde/amarela/vermelha).
   - Avatar do responsável (**NOVO**).

---

## 🤖 Integração com IA

### Provedores Suportados

1. **OpenAI** (GPT-4o-mini) - Primário
2. **Gemini** (gemini-2.0-flash, gemini-1.5-flash) - Fallback

### Configuração de API Keys

**Fontes (ordem de prioridade)**:
1. Tabela `app_settings`:
   - `openai_api_key` (JSONB: `"sk-..."`)
   - `gemini_api_key` (JSONB: `"AIza..."`)
2. Variáveis de ambiente:
   - `VITE_OPENAI_API_KEY`
   - `VITE_GEMINI_API_KEY`
3. Config local:
   - `APP_CONFIG_LOCAL.OPENAI_API_KEY`
   - `APP_CONFIG_LOCAL.GEMINI_API_KEY`

**Proteções**:
- ✅ Bloqueio de placeholders (`SUBSTITUA`, `PLACEHOLDER`, `REPLACE`).
- ✅ Script SQL protegido: só atualiza se valor estiver vazio/placeholder.
- ✅ Normalização de keys (aceita string ou objeto `{apiKey}`).

### Formato de Sugestão

A IA retorna JSON:
```json
{
  "suggestions": [
    {
      "title": "Aumentar conversão SQL → Won",
      "type": "percentage",
      "direction": "increase",
      "start_value": 20,
      "target_value": 35,
      "unit": "%",
      "rationale": "Meta ambiciosa mas alcançável..."
    }
  ]
}
```

---

## 📊 Cálculo de Progresso e Status

### Progresso de KR (%)

**Para KRs numéricos (increase)**:
```
progress = ((atual - inicial) / (meta - inicial)) * 100
```

**Para KRs numéricos (decrease)**:
```
progress = ((inicial - atual) / (inicial - meta)) * 100
```

**Para atividades**:
```
progress = activity_done ? 100 : 0
```

### Status Automático de KR (Verde/Amarelo/Vermelho) ✨ NOVO

**Lógica**:
1. Calcula **tempo decorrido** do OKR (dias desde `start_date` até hoje).
2. Calcula **progresso esperado** = `(tempo_decorrido / total_dias) * 100`.
3. Calcula **progresso real** do KR (conforme fórmulas acima).
4. Calcula **performance ratio** = `(progresso_real / progresso_esperado) * 100`.
5. Critérios:
   - 🟢 **Verde**: Performance >= 70% do esperado
   - 🟡 **Amarelo**: Performance 40-70% do esperado
   - 🔴 **Vermelho**: Performance < 40% do esperado

**Exemplo**:
- OKR de 90 dias, hoje é o dia 45 (50% do tempo).
- Progresso esperado: 50%.
- KR atual: 30 de 100 → progresso real: 30%.
- Performance ratio: (30 / 50) * 100 = 60% → **Amarelo**.

**Ativação**:
- Rode `components/okr/sql/enable_auto_kr_status.sql` no Supabase.
- Status será calculado automaticamente ao salvar/atualizar KR (via trigger).

### Progresso de OKR (%)

```
progress_okr = AVG(progress de todos os KRs)
```

---

## 🎨 Interface (UI/UX)

### OKRFormSimple (Formulário)

**Layout**: 2 colunas responsivas
- **Esquerda**: Objetivo, botão de IA, metadados.
- **Direita**: Lista de Key Results.

**Campos**:
- Objetivo (textarea, mínimo 10 chars)
- Responsável (select de usuários com avatar)
- Departamento (select)
- Período (date range)
- Periodicidade (mensal/trimestral)

**Key Results** (até 5):
- Título (input)
- Tipo (select: quantidade, %, R$, atividade)
- Direção (select: aumentar/diminuir) - **com validação inline se vazio**
- Valores numéricos (DE, ATUAL, PARA):
  - ✨ **Formatação automática** (1.000.000,00)
  - ✨ **Prefixo R$** para moeda
  - ✨ **Sufixo %** para percentual
  - ✨ **Auto-seleção ao clicar** (facilita substituir zero)
- Unidade (texto livre para `numeric`)
- Descrição (opcional) ✨ **NOVO**
- Status: **Calculado automaticamente** (não editável) ✨ **NOVO**

**Melhorias UX Recentes**:
- ✅ Campo descrição com tooltip.
- ✅ Inputs formatados para moeda/número.
- ✅ `isDirty`: só pergunta "Tem certeza?" se houve alteração real.
- ✅ Validação inline (erros aparecem abaixo do campo, não em alert).
- ✅ AutoComplete off (sem sugestões intrusivas do browser).

### OKRCard (Card no Dashboard)

**Layout**:
- Conteúdo principal (esquerda): objetivo, badges, lista de KRs.
- Sidebar (direita): avatar do responsável, nome.

**KRs exibidos em lista vertical** ✨ **NOVO**:
- Status (bolinha colorida)
- Título
- Descrição (truncada, tooltip no hover) ✨ **NOVO**
- Valor atual vs. meta
- Barra de progresso colorida

**Melhorias de Layout**:
- ✅ Mudança de grid (2 colunas) para lista (mais legível).
- ✅ Avatar do responsável carregado de `profiles.avatar_url`.
- ✅ Fallback para iniciais se avatar não carregar.
- ✅ Bloco do responsável mais compacto (`p-4` em vez de `p-6`, `gap-2` em vez de `gap-3`).

---

## ⚙️ Regras de Negócio

### Validações

1. **Objetivo**: Mínimo 10 caracteres.
2. **Key Results**:
   - Mínimo 1, máximo 5 por OKR.
   - Título: mínimo 3 caracteres.
   - **Direção obrigatória** se tipo != activity (com mensagem inline se vazio).
   - **start_value obrigatório** se direction = 'decrease'.
   - **target_value obrigatório** se tipo != activity.
3. **Datas**: `start_date` <= `end_date`.

### Comportamentos Especiais

- **Atividades**: Não têm valores numéricos, apenas checkbox `activity_done`.
- **Percentual/Moeda**: Unidade (`%` ou `R$`) é preenchida automaticamente (campo hidden).
- **Status de KR**: Calculado automaticamente via trigger no backend ✨ **NOVO**.

---

## 🐛 Issues Conhecidos / Limitações

### 1. ❌ PostgREST Schema Cache

**Problema**: Ao adicionar colunas novas (ex: `description`), o PostgREST pode retornar erro `PGRST204 "Could not find column"` até recarregar o schema.

**Solução Aplicada**:
- `NOTIFY pgrst, 'reload schema';` após rodar migrations.
- Selects explícitos em vez de `*` para evitar conflito com cache.

**Status**: ✅ Resolvido.

### 2. ❌ Loop Infinito no AlwaysVisibleDebugPanel

**Problema**: `useEffect` com dependências dinâmicas (`user`, `hasDebugAccess`) chamava `addLog` (que dispara `setLogs`), causando re-render infinito.

**Solução Aplicada**:
- `useRef` para garantir que logs de inicialização rodem apenas uma vez.
- Remover `addLog` de handlers de teclado e checkAccess.
- Interceptação de console.error/warn com proteção contra loop.
- **Última solução**: Painel desabilitado temporariamente (`return null`).

**Status**: ✅ Desabilitado temporariamente. Revisar com calma antes de reativar.

### 3. ⚠️ API Keys Sobrescritas por Script SQL

**Problema**: Script `setup_ai_keys_rpc.sql` com `INSERT ... ON CONFLICT DO UPDATE` sobrescrevia keys reais com placeholders.

**Solução Aplicada**:
- Adicionada cláusula `WHERE app_settings.value IS NULL OR app_settings.value::text ILIKE '%SUBSTITUA%'`.
- Agora só atualiza se estiver vazio ou for placeholder.

**Status**: ✅ Resolvido.

### 4. ⚠️ Sessão Supabase Expirava ao Criar OKR

**Problema**: `supabase.auth.getUser()` retornava vazio mesmo com usuário logado no `DirectUserContext`.

**Solução Aplicada**:
- Garantir que login renove a sessão do Supabase e salve no `localStorage` (`ggv-supabase-auth-token`).
- Token persiste por padrão com `persistSession: true`.

**Status**: ✅ Resolvido (necessário login/logout uma vez).

### 5. ⚠️ Avatar do Google (403/404)

**Problema**: URL do Google Avatar (`lh3.googleusercontent.com`) retornava 403 em alguns contextos.

**Solução Aplicada**:
- Adicionado `referrerPolicy="no-referrer"` no `<img>`.
- Fallback para iniciais se imagem falhar (`onError`).

**Status**: ✅ Resolvido.

---

## ✨ Melhorias Implementadas (Esta Sessão)

### 1. ✅ Sugestão de KRs com IA

- Integração OpenAI + Gemini com fallback.
- Chaves de API com validação de placeholder.
- Prompt otimizado para gerar KRs SMART.

### 2. ✅ Avatares dos Responsáveis

- RPC `list_users_for_okr` retorna `avatar_url`.
- `OKRDashboard` faz match pelo nome e passa para `OKRCard`.
- Fallback para iniciais se avatar não carregar.

### 3. ✅ Descrições Opcionais em KRs

- Campo `description` na tabela `key_results`.
- Input opcional no formulário.
- Exibição truncada no card com tooltip.

### 4. ✅ Inputs Formatados (Moeda/Número)

- Componente `FormattedNumberInput`:
  - Formata milhar automaticamente (`1.200.000`).
  - Prefixo `R$` para currency.
  - Sufixo `%` para percentage.
  - Auto-seleção de valor ao clicar.
  - Aceita vírgula para decimais.

### 5. ✅ Status Automático de KRs

- Função SQL `calculate_kr_status_auto` com lógica de progresso vs. tempo.
- Trigger que calcula status ao salvar.
- Frontend não permite edição manual (campo hidden).

### 6. ✅ Layout de KRs em Lista Vertical

- Mudança de grid 2-col para lista.
- Mais escalável e legível.
- Linhas separadas com hover effect.

### 7. ✅ Validação Inline (Sem Alerts)

- Erros aparecem abaixo do campo com erro (ex: "Direção é obrigatória").
- Campo fica com borda vermelha.
- Sem popups intrusivos.

### 8. ✅ Proteção de API Keys

- Script SQL só atualiza se valor for placeholder.
- Validação de placeholder no frontend.
- Múltiplas fontes de fallback (DB → env → config local).

---

## 🚀 Próximas Melhorias Sugeridas

### 1. 📈 Dashboard Executivo

- Métricas agregadas:
  - Total de OKRs, % concluídos, % atrasados.
  - Progresso médio por departamento.
  - Top 3 piores performing OKRs.
- Gráficos visuais (donut, bar).

### 2. 🔗 Vinculação OKR ↔ Sprints

- Permitir criar sprints vinculadas a um OKR.
- Auto-atualizar progresso do OKR baseado nas sprints.
- Considerar iniciativas vs. impedimentos no cálculo de status.

### 3. 📅 Timeline / Gantt View

- Visualização de OKRs em linha do tempo.
- Identificar gaps ou sobreposições.

### 4. 📧 Notificações Automáticas

- Alertar responsável quando:
  - KR ficar amarelo/vermelho.
  - OKR estiver próximo do fim (7 dias antes).
  - KR não for atualizado há X dias.

### 5. 🔄 Histórico de Alterações

- Tabela `okr_audit_log` já existe (estrutura criada).
- Ativar trigger para logar mudanças em KRs.
- UI para visualizar histórico.

### 6. 📊 Exportação PDF/Excel

- Exportar OKR e KRs para PDF/Excel.
- Gráficos e progresso visual.

### 7. 🎨 Melhorias de UI

- Drag-and-drop para reordenar KRs.
- Tags/labels customizáveis para OKRs.
- Comentários/discussões por KR (mini-feed).

### 8. 🔍 Busca Avançada

- Filtro por responsável.
- Filtro por status (verde/amarelo/vermelho).
- Filtro por período.

### 9. 🤖 IA Avançada

- Sugestão de ajustes em KRs com base no progresso.
- Alertas proativos ("Este KR está atrasado, considere...").

---

## 🛠️ Como Testar

### Pré-requisitos

1. Banco de dados configurado:
   - Rodar `components/okr/sql/okr_v2_schema.sql` (se primeira vez).
   - Rodar `components/okr/sql/okr_v2_incremental_improvements.sql`.
   - Rodar `components/okr/sql/add_kr_description_manual.sql`.
   - Rodar `components/okr/sql/enable_auto_kr_status.sql`.
   - Atualizar API keys (`openai_api_key`, `gemini_api_key`) em `app_settings`.

2. Usuário com perfil adequado:
   ```sql
   UPDATE profiles 
   SET role = 'SUPER_ADMIN', department = 'geral', avatar_url = '<url>' 
   WHERE id = '<user_id>';
   ```

### Testes Manuais

1. **Criar OKR**:
   - Navegar para `/okr`.
   - Clicar em "Criar Novo OKR".
   - Preencher objetivo.
   - Clicar em "Sugerir com IA" (verificar se retorna sugestões).
   - Ajustar KRs manualmente.
   - Adicionar descrições.
   - Salvar.
   - Verificar se aparece no dashboard.

2. **Editar OKR**:
   - Clicar em um card.
   - Alterar valores atuais dos KRs.
   - Verificar se status muda automaticamente (se trigger ativo).
   - Salvar.
   - Verificar se atualiza no dashboard.

3. **Avatares**:
   - Verificar se avatar do responsável aparece no card.
   - Se não aparecer, verificar se `profiles.avatar_url` está preenchido.

4. **Inputs Formatados**:
   - Criar KR do tipo "Valor em R$".
   - Digitar `1200000` → deve formatar para `1.200.000`.
   - Prefixo `R$` deve aparecer.

5. **Status Automático**:
   - Criar KR com valores (ex: 0 → 100, atual: 30).
   - Salvar.
   - Verificar no banco se `status` foi calculado automaticamente.
   - Editar `current_value` para 80.
   - Salvar.
   - Verificar se status mudou (deve ir para verde).

---

## 📝 Logs e Debug

### Console Logs Importantes

- `🤖 IA - Iniciando sugestão de KRs para: ...`
- `✅ OPENAI/GEMINI - API Key encontrada.`
- `📝 Submitting OKR data: ...`
- `⚠️ Validation errors: ...`

### Debug Panel

**Status**: ❌ Temporariamente desabilitado (loop de renderização).

**Reativar quando corrigido**:
- Remover `return null` do `AlwaysVisibleDebugPanel.tsx`.

---

## 🚨 Problemas em Aberto

1. **AlwaysVisibleDebugPanel**: Loop infinito de renderização (desabilitado).
2. **FormattedNumberInput**: Cursor pode pular ao formatar durante digitação (mitigado mas não 100% perfeito).
3. **Avatar expiration**: URLs do Google podem expirar (usar fallback permanente ou storage próprio).
4. **Sprints**: Módulo de sprints ainda não integrado ao cálculo de status automático.

---

## 🎓 Aprendizados / Decisões Arquiteturais

1. **OKRs usam `owner` como texto livre** em vez de FK para `profiles` → mais flexível, mas dificulta joins. Solução: subquery na view para buscar avatar.
2. **Status calculado via trigger** em vez de computed column → CURRENT_DATE não é imutável, trigger é mais confiável.
3. **RLS por role + department** → CEO vê tudo, HEAD vê estratégico + seu dept, USER só leitura.
4. **IA com múltiplos provedores** → OpenAI primário, Gemini fallback, com validação de placeholder.
5. **Formatação de inputs no cliente** (não no server) → melhor UX, mas cuidado com cursor.

---

## 📚 Referências

- **OKR Framework**: https://www.whatmatters.com/
- **Zod Docs**: https://zod.dev/
- **React Hook Form**: https://react-hook-form.com/
- **Supabase RLS**: https://supabase.com/docs/guides/auth/row-level-security

---

**Fim da Documentação** 🎉

Para melhorias ou bugs, revisar este documento e abrir tarefas específicas.

