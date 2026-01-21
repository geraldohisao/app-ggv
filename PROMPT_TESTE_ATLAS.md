# 🤖 Prompt para Atlas - Testes Automatizados do Módulo OKR e Sprints

**Objetivo:** Validar implementação completa do sistema OKR e Sprints (MVP + Fase 2)

---

## 📋 PROMPT PARA ATLAS

```
Você é um testador automatizado especializado em aplicações React/TypeScript com Supabase.

Analise e teste o Módulo de OKR e Sprints da aplicação localizada em:
- Pasta principal: /Users/geraldohisao/Projects/app-ggv/components/okr/

### CONTEXTO DO SISTEMA

Este é um sistema de gestão de OKRs (Objectives and Key Results) integrado com Sprints (ciclos de execução). O sistema possui:

1. **OKRs**: Objetivos estratégicos com Key Results mensuráveis
2. **Sprints**: Ciclos de execução (semanal/mensal/trimestral)
3. **Sprint Items**: Iniciativas, impedimentos, decisões, atividades, marcos
4. **Check-ins**: Sistema de registro periódico (Fase 2 - recém implementado)

### ESTRUTURA DE ARQUIVOS A TESTAR

```
components/okr/
├── components/
│   ├── okr/
│   │   ├── OKRCard.tsx
│   │   ├── OKRForm.tsx
│   │   └── OKRFormSimple.tsx
│   ├── sprint/
│   │   ├── SprintCard.tsx
│   │   ├── SprintForm.tsx
│   │   ├── SprintItemForm.tsx
│   │   └── SprintItemRow.tsx
│   ├── checkin/ (FASE 2 - NOVO)
│   │   ├── KRCheckinQuickForm.tsx
│   │   ├── KRIndicatorBlock.tsx
│   │   ├── SprintCheckinForm.tsx
│   │   └── SprintCheckinList.tsx
│   └── shared/
│       ├── Toast.tsx
│       ├── LoadingState.tsx
│       └── ResponsibleSelect.tsx
├── pages/
│   ├── OKRDashboard.tsx
│   ├── SprintList.tsx
│   └── SprintDetailStyled.tsx
├── services/
│   ├── okr.service.ts
│   ├── sprint.service.ts
│   └── checkin.service.ts (FASE 2 - NOVO)
├── store/
│   ├── okrStore.ts
│   └── sprintStore.ts
├── types/
│   ├── okr.types.ts
│   ├── sprint.types.ts
│   └── checkin.types.ts (FASE 2 - NOVO)
└── hooks/
    └── useOKRUsers.ts
```

### TESTES A REALIZAR

## 1. VALIDAÇÃO DE ESTRUTURA

### 1.1 Verificar Imports e Exports
- [ ] Todos os componentes têm imports corretos
- [ ] Não há imports circulares
- [ ] Todos os tipos TypeScript estão definidos
- [ ] Exports nomeados estão corretos

### 1.2 Verificar Types e Interfaces
- [ ] okr.types.ts: OKR, KeyResult, enums (OKRLevel, Department, etc)
- [ ] sprint.types.ts: Sprint, SprintItem, SprintWithItems
- [ ] checkin.types.ts: KRCheckin, SprintCheckin, SprintTemplate
- [ ] Schemas Zod estão corretos e completos
- [ ] Não há tipos `any` sem necessidade

### 1.3 Verificar Conformidade TypeScript
- [ ] Nenhum erro de TypeScript
- [ ] Todos os props têm interfaces definidas
- [ ] Funções têm tipos de retorno explícitos
- [ ] Async functions retornam Promise<T>

## 2. VALIDAÇÃO DE COMPONENTES

### 2.1 OKRForm.tsx
- [ ] Sistema de collapse/expand funciona
- [ ] Botões "Expandir Todos" / "Recolher Todos" existem
- [ ] Validação com Zod está configurada
- [ ] Campos obrigatórios têm asterisco vermelho
- [ ] Mensagens de erro aparecem inline
- [ ] Toast é usado (não alert)
- [ ] Novo KR é automaticamente expandido ao adicionar

### 2.2 SprintForm.tsx
- [ ] Validação de datas (início < fim)
- [ ] Seleção de OKRs funciona (máx 3)
- [ ] Filtra OKRs por departamento
- [ ] Toast é usado (não alert)
- [ ] Campos de data têm cursor pointer
- [ ] Confirmação ao fechar sem salvar

### 2.3 SprintItemForm.tsx
- [ ] Campo de data funciona corretamente
- [ ] Texto de ajuda explica como usar
- [ ] Botão X para limpar data
- [ ] ResponsibleSelect tem 3 modos
- [ ] Validação de título (min 3 caracteres)
- [ ] Toast com mensagens específicas
- [ ] Fallback de colunas está implementado

### 2.4 SprintDetailStyled.tsx
- [ ] Importa componentes de check-in corretamente
- [ ] Botão "Registrar Check-in" está em destaque
- [ ] KRIndicatorBlock é renderizado
- [ ] SprintCheckinList é renderizado
- [ ] Toggle "Mostrar Concluídos" funciona
- [ ] Estado showCompletedItems existe
- [ ] Função refreshSprint existe

### 2.5 SprintItemRow.tsx
- [ ] Checkbox grande e clicável
- [ ] Título fica riscado quando concluído
- [ ] Botões de ação no hover
- [ ] Animações de transição
- [ ] Cores diferentes para status
- [ ] Badge de carry-over aparece quando is_carry_over = true

### 2.6 KRIndicatorBlock.tsx (NOVO - FASE 2)
- [ ] Carrega KRs da sprint corretamente
- [ ] Mostra barra de progresso
- [ ] Botão "Atualizar" inline
- [ ] Expande form ao clicar
- [ ] Chama checkinService.getSprintKRs()
- [ ] Chama checkinService.createKRCheckin()
- [ ] Recarrega após atualização

### 2.7 KRCheckinQuickForm.tsx (NOVO - FASE 2)
- [ ] Input de valor numérico
- [ ] Mostra valor anterior
- [ ] Calcula e mostra delta
- [ ] Seletor de confiança
- [ ] Campo de comentário
- [ ] Validação de valor
- [ ] Toast ao salvar

### 2.8 SprintCheckinForm.tsx (NOVO - FASE 2)
- [ ] 4 campos estruturados (achievements, blockers, decisions, next_focus)
- [ ] Seletor de saúde (verde/amarelo/vermelho)
- [ ] Campo health_reason obrigatório se não verde
- [ ] Métricas calculadas automaticamente
- [ ] Validação com Zod
- [ ] Toast ao salvar
- [ ] Trata erro de check-in duplicado

### 2.9 SprintCheckinList.tsx (NOVO - FASE 2)
- [ ] Lista check-ins da sprint
- [ ] Expansível (clique para ver detalhes)
- [ ] Mostra badge de saúde
- [ ] Mostra métricas resumidas
- [ ] Estado vazio amigável
- [ ] Loading state

## 3. VALIDAÇÃO DE SERVIÇOS

### 3.1 okr.service.ts
- [ ] Funções CRUD completas (create, update, delete, get, list)
- [ ] createOKR aceita KRs como parâmetro
- [ ] updateOKR atualiza KRs também
- [ ] Tratamento de erro com try/catch
- [ ] Logs adequados (console.log/error)

### 3.2 sprint.service.ts
- [ ] getSprintById tem cache (Map)
- [ ] Cache TTL = 10000ms (10s)
- [ ] Queries paralelas (Promise.allSettled)
- [ ] Select otimizado (não usa '*')
- [ ] invalidateSprintCache existe
- [ ] createSprintItem tem fallback de colunas
- [ ] updateSprintItem invalida cache
- [ ] deleteSprintItem invalida cache
- [ ] Logging de performance (console.log)

### 3.3 checkin.service.ts (NOVO - FASE 2)
- [ ] createKRCheckin está implementado
- [ ] listKRCheckins está implementado
- [ ] getKREvolution está implementado
- [ ] createSprintCheckin calcula métricas automaticamente
- [ ] listSprintCheckins está implementado
- [ ] getSprintKRs busca sem JSON snapshot
- [ ] Tratamento de erro adequado
- [ ] Logs de debugging

## 4. VALIDAÇÃO DE STORES (ZUSTAND)

### 4.1 okrStore.ts
- [ ] Estado: okrs, selectedOKR, loading, error
- [ ] Ação fetchOKRs existe
- [ ] Ação createOKR existe e atualiza estado
- [ ] Ação updateOKR existe
- [ ] Ação deleteOKR existe

### 4.2 sprintStore.ts
- [ ] Estado: sprints, selectedSprint, loading, error
- [ ] fetchSprintById tem parâmetro skipCache
- [ ] Verifica se sprint já está no store (otimização)
- [ ] createSprint atualiza estado
- [ ] updateSprint atualiza estado
- [ ] finalizeAndCreateNext existe

## 5. VALIDAÇÃO DE LÓGICA DE NEGÓCIO

### 5.1 Validações Zod
- [ ] okrFormSchema valida OKR completo
- [ ] key_results array tem min(1)
- [ ] sprintFormSchema valida datas
- [ ] sprintCheckinSchema valida check-in
- [ ] Mensagens de erro são em português

### 5.2 Cálculos
- [ ] calculateProgress em checkin.types.ts:
  - Trata direction = 'increase' corretamente
  - Trata direction = 'decrease' corretamente
  - Limita entre 0 e 100
- [ ] calculateMetricsFromItems calcula corretamente:
  - initiatives_completed
  - carry_over_pct
  - completion_rate

### 5.3 Fallback de Colunas (sprint.service.ts)
- [ ] createSprintItem tenta com fullData primeiro
- [ ] Se erro de coluna, tenta com minimalData
- [ ] Se ainda erro, tenta com superMinimalData
- [ ] Logs indicam qual nível de fallback foi usado

## 6. VALIDAÇÃO DE UX/UI

### 6.1 Sistema de Toasts
- [ ] useToast hook existe em Toast.tsx
- [ ] ToastContainer renderiza toasts
- [ ] Toasts têm 4 tipos (success, error, warning, info)
- [ ] Auto-fechamento após 4s
- [ ] Cores corretas por tipo
- [ ] Ícones corretos (✅ ❌ ⚠️ ℹ️)

### 6.2 Campos Obrigatórios
- [ ] Asteriscos vermelhos em todos os campos obrigatórios
- [ ] Mensagens de erro abaixo dos campos
- [ ] Bordas vermelhas em campos com erro

### 6.3 Loading States
- [ ] Skeleton loading em KRIndicatorBlock
- [ ] LoadingState component usado
- [ ] Botões mostram "Salvando..." quando submitting
- [ ] Botões ficam disabled durante submit

### 6.4 Estados Vazios
- [ ] Mensagens amigáveis quando não há dados
- [ ] Botão de ação sugerido
- [ ] Ícone ou emoji ilustrativo

## 7. VALIDAÇÃO DE PERFORMANCE

### 7.1 Cache
- [ ] sprintCache é um Map
- [ ] CACHE_TTL está definido
- [ ] getSprintById verifica cache antes de buscar
- [ ] Cache é invalidado ao criar/atualizar/deletar

### 7.2 Queries Otimizadas
- [ ] Promise.allSettled usado (não Promise.all)
- [ ] Select específico (não '*')
- [ ] Índices corretos sugeridos no SQL
- [ ] Apenas queries essenciais (removeu sprint_okrs e kr_checkins que não existiam)

### 7.3 Re-renders
- [ ] useState usado adequadamente
- [ ] useEffect com dependencies corretas
- [ ] Não há loops infinitos de re-render

## 8. VALIDAÇÃO DA FASE 2 (CHECK-INS)

### 8.1 SQL (FASE2_CHECKINS_CORRETO.sql)
- [ ] Tabela kr_checkins tem campo direction
- [ ] Trigger process_kr_checkin existe
- [ ] Trigger lê previous_value ANTES de atualizar (BEFORE INSERT)
- [ ] Trigger update_kr_after_checkin existe (AFTER INSERT)
- [ ] Tabela sprint_checkins tem UNIQUE(sprint_id, checkin_date)
- [ ] Tabela sprint_templates existe e está separada
- [ ] Campo direction foi adicionado em key_results
- [ ] Função calculate_kr_progress trata increase e decrease

### 8.2 Types (checkin.types.ts)
- [ ] KRCheckin interface existe
- [ ] SprintCheckin interface existe
- [ ] SprintTemplate interface existe
- [ ] calculateProgress function trata direction
- [ ] getHealthColor, getHealthEmoji existem
- [ ] calculateMetricsFromItems existe

### 8.3 Service (checkin.service.ts)
- [ ] createKRCheckin implementado corretamente
- [ ] listKRCheckins implementado
- [ ] createSprintCheckin calcula métricas de sprintItems
- [ ] getSprintKRs busca via query (não JSON)
- [ ] Tratamento de erro específico para UNIQUE constraint

### 8.4 Componentes de Check-in
- [ ] KRCheckinQuickForm renderiza corretamente
- [ ] KRIndicatorBlock carrega KRs
- [ ] SprintCheckinForm tem 4 campos estruturados
- [ ] SprintCheckinList mostra histórico
- [ ] Todos usam useToast para feedback

### 8.5 Integração em SprintDetailStyled
- [ ] Importa os 3 componentes de checkin
- [ ] Renderiza KRIndicatorBlock
- [ ] Renderiza SprintCheckinList
- [ ] Botão "Registrar Check-in" existe e é destacado
- [ ] showCheckinForm state existe
- [ ] Modal de checkin abre ao clicar
- [ ] refreshSprint é chamado após ações

### 8.6 Toggle de Concluídos
- [ ] showCompletedItems state existe
- [ ] visibleInitiatives é filtrado corretamente
- [ ] Botão mostra contador de concluídos
- [ ] Botão alterna entre "Mostrar" e "Ocultar"
- [ ] Estado vazio mostra mensagem apropriada

## 9. VALIDAÇÃO DE INTEGRAÇÃO

### 9.1 OKR → Sprint
- [ ] Sprint pode ter okr_id (FK para okrs)
- [ ] Sprint pode ter okr_ids array (via sprint_okrs)
- [ ] SprintForm permite selecionar até 3 OKRs
- [ ] getSprintKRs busca KRs dos OKRs vinculados

### 9.2 Sprint → Items
- [ ] Sprint tem items (array de SprintItem)
- [ ] getSprintItemsByType agrupa por tipo
- [ ] Cascade delete funciona

### 9.3 KR → Check-ins
- [ ] createKRCheckin atualiza key_results.current_value
- [ ] Trigger calcula previous_value corretamente
- [ ] Histórico de check-ins é mantido

### 9.4 Sprint → Check-ins
- [ ] createSprintCheckin recebe sprintItems
- [ ] Métricas são calculadas automaticamente
- [ ] Constraint UNIQUE previne duplicatas

## 10. TESTES DE FLUXO COMPLETO

### 10.1 Criar OKR com KRs
Simule:
1. Abrir OKRForm
2. Preencher dados
3. Adicionar 3 KRs
4. Validar que pelo menos 1 KR é obrigatório
5. Validar que título do KR é obrigatório
6. Salvar
7. Verificar se createOKR é chamado
8. Verificar se toast de sucesso aparece

### 10.2 Criar Sprint Vinculada
Simule:
1. Abrir SprintForm
2. Selecionar departamento
3. Filtro de OKRs funciona
4. Selecionar 2 OKRs
5. Preencher título e datas
6. Validar data início < fim
7. Salvar
8. Verificar se createSprint é chamado

### 10.3 Adicionar Iniciativa
Simule:
1. Abrir SprintItemForm (tipo: iniciativa)
2. Preencher título
3. Selecionar responsável interno
4. Definir data limite
5. Salvar
6. Verificar fallback de colunas se necessário
7. Toast de sucesso
8. Item aparece na lista

### 10.4 Atualizar KR (NOVO - FASE 2)
Simule:
1. Abrir sprint com OKR vinculado
2. Ver bloco "Indicadores do Ciclo"
3. Clicar "Atualizar" em um KR
4. Form inline expande
5. Preencher novo valor
6. Adicionar comentário
7. Salvar
8. Verificar createKRCheckin é chamado
9. Progresso atualiza

### 10.5 Registrar Check-in (NOVO - FASE 2)
Simule:
1. Clicar botão "Registrar Check-in do Ciclo"
2. Modal abre
3. Métricas automáticas aparecem preenchidas
4. Preencher 4 campos estruturados
5. Selecionar saúde
6. Se amarelo/vermelho, motivo é obrigatório
7. Salvar
8. Toast de sucesso
9. Check-in aparece na lista

### 10.6 Toggle Concluídos (NOVO - FASE 2)
Simule:
1. Marcar 2 iniciativas como concluídas
2. Botão "Mostrar Concluídos (2)" aparece
3. Por padrão, concluídos estão ocultos
4. Clicar no botão
5. Concluídos aparecem riscados
6. Clicar novamente
7. Concluídos somem

## 11. VALIDAÇÃO DE PERFORMANCE

### 11.1 Cache
- [ ] Primeira abertura: log mostra tempo (ex: 500-700ms)
- [ ] Segunda abertura (mesma sprint): log mostra "cache (instantânea)"
- [ ] Cache é invalidado ao atualizar item
- [ ] Cache expira após 10s

### 11.2 Queries
- [ ] getSprintById usa Promise.allSettled
- [ ] Não há queries sequenciais desnecessárias
- [ ] Select não usa '*' (usa campos específicos)

## 12. VALIDAÇÃO DE ERROS E EDGE CASES

### 12.1 Tratamento de Erros
- [ ] Try/catch em todas as async functions
- [ ] Erros são logados no console
- [ ] Toasts mostram mensagens de erro amigáveis
- [ ] Códigos de erro do Supabase são tratados (23502, 23503, etc)

### 12.2 Estados Vazios
- [ ] Sprint sem items mostra mensagem apropriada
- [ ] Sprint sem OKR não quebra (KRs não aparecem)
- [ ] Sem check-ins mostra estado vazio
- [ ] Loading states são exibidos

### 12.3 Validações
- [ ] Campos obrigatórios são validados
- [ ] Números negativos são aceitos onde apropriado
- [ ] Datas inválidas são rejeitadas
- [ ] Strings vazias são tratadas corretamente

## 13. VERIFICAÇÕES ESPECÍFICAS DO FEEDBACK DO ESPECIALISTA

### 13.1 Template Separado
- [ ] sprint_templates é tabela própria (não misturada em sprints)
- [ ] sprints.template_id aponta para sprint_templates
- [ ] Template não tem start_date/end_date

### 13.2 Trigger de KR Corrigido
- [ ] Trigger process_kr_checkin é BEFORE INSERT
- [ ] Lê current_value do KR ANTES de INSERT
- [ ] Salva em previous_value
- [ ] Trigger update_kr_after_checkin é AFTER INSERT
- [ ] Atualiza key_results.current_value DEPOIS

### 13.3 Direction em KRs
- [ ] Campo direction existe em key_results
- [ ] Valores permitidos: 'increase' | 'decrease'
- [ ] Cálculo de progresso trata ambos:
  - increase: (value / target) * 100
  - decrease: ((target - value) / target) * 100

### 13.4 Sem JSON Snapshot
- [ ] sprint_checkins NÃO tem campo krs_snapshot JSONB
- [ ] getSprintKRs faz query em tempo real
- [ ] Não persiste JSON, renderiza via query

### 13.5 Constraint UNIQUE
- [ ] sprint_checkins tem UNIQUE(sprint_id, checkin_date)
- [ ] createSprintCheckin trata erro 23505 (duplicate)
- [ ] Mensagem amigável: "Já existe check-in hoje"

### 13.6 Rotate Limpo
- [ ] finalizeAndCreateNext NÃO usa {...sprint}
- [ ] Cria objeto novo com campos explícitos
- [ ] Não copia status, datas, id antigos
- [ ] Copia apenas: type, department, title, description, template_id

## 14. ANÁLISE DE CÓDIGO

### 14.1 Best Practices
- [ ] Componentes têm uma responsabilidade única
- [ ] Funções são pequenas e focadas
- [ ] Nomes descritivos (não genéricos)
- [ ] Comentários onde necessário
- [ ] Sem código duplicado

### 14.2 React Patterns
- [ ] Hooks usados corretamente
- [ ] useEffect com dependencies corretas
- [ ] Estados locais vs globais apropriados
- [ ] Event handlers nomeados adequadamente

### 14.3 Acessibilidade
- [ ] Botões têm labels
- [ ] Inputs têm labels
- [ ] title/aria-label onde apropriado
- [ ] Cores têm contraste adequado

## 15. RELATÓRIO ESPERADO

Ao finalizar os testes, forneça um relatório com:

### ✅ Aprovado
- Lista de testes que passaram
- Pontos fortes da implementação

### ⚠️ Avisos
- Potenciais melhorias
- Sugestões de otimização
- Code smells (se houver)

### ❌ Falhas
- Testes que falharam
- Erros encontrados
- Bugs críticos
- Inconsistências

### 📊 Métricas
- Total de arquivos analisados
- Total de componentes testados
- Cobertura de tipos (%)
- Erros de TypeScript
- Warnings de lint

### 💡 Recomendações
- Melhorias de código
- Refatorações sugeridas
- Testes unitários faltando
- Documentação adicional necessária

---

## INSTRUÇÕES ESPECÍFICAS

1. **Seja Detalhado**: Para cada falha, indique arquivo, linha e motivo
2. **Seja Construtivo**: Sugira correções para problemas encontrados
3. **Priorize**: Separe crítico vs warning vs nice-to-have
4. **Valide SQL**: Verifique se o script SQL é executável e correto
5. **Verifique Consistência**: Nomes, padrões, estruturas devem ser consistentes

---

## FOCO ESPECIAL

### ⭐ Prioridade ALTA
1. Validar correções do especialista OKR Master
2. Verificar trigger de KR (bug critical)
3. Validar integração de check-ins
4. Verificar fallback de colunas

### ⭐ Prioridade MÉDIA
1. Validar UX (toasts, loading, empty states)
2. Verificar performance (cache, queries paralelas)
3. Validar types e schemas Zod

### ⭐ Prioridade BAIXA
1. Code style
2. Comentários
3. Acessibilidade

---

EXECUTE ANÁLISE COMPLETA E FORNEÇA RELATÓRIO DETALHADO.
```

---

## 📄 Como Usar Este Prompt

1. Copie TODO o conteúdo acima (da seção "Você é um testador..." até "EXECUTE ANÁLISE COMPLETA")
2. Cole em uma nova conversa com o Atlas
3. Aguarde o relatório completo
4. Corrija problemas identificados
5. Execute testes manuais complementares

---

**O Atlas vai validar:**
- ✅ ~40 componentes e arquivos
- ✅ ~100 pontos de verificação
- ✅ Estrutura, lógica, UX, performance
- ✅ Conformidade com feedback do especialista

**Relatório esperado em:** 5-10 minutos

---

**Copie o prompt acima e cole para o Atlas!** 🤖✨
