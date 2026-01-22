# SQL Migrations Pendentes para Produção

Execute estas migrations no Supabase produção **APÓS** o deploy do código:

## Ordem de Execução (críticas primeiro)

### 1. Estrutura Básica de OKR
```sql
-- supabase/sql/ADICIONAR_RESPONSAVEL_KR.sql
-- Adiciona coluna responsible_user_id aos KRs
```

### 2. Direções de KR
```sql
-- supabase/sql/ADICIONAR_DIRECOES_KR.sql
-- Adiciona coluna direction (increase, decrease, at_least, etc.)
```

### 3. Ordenação
```sql
-- supabase/sql/ADICIONAR_ORDEM_KRS.sql
-- Adiciona coluna position aos KRs

-- supabase/sql/ADICIONAR_ORDEM_OKRS.sql
-- Adiciona coluna position aos OKRs
```

### 4. Cockpit (Dashboard Estratégico)
```sql
-- supabase/sql/ADD_SHOW_IN_COCKPIT.sql
-- Adiciona coluna show_in_cockpit para marcar KRs estratégicos
```

### 5. Sprints
```sql
-- supabase/sql/ADICIONAR_RESPONSAVEL_SPRINT.sql
-- Adiciona coluna responsible_user_id às sprints

-- supabase/sql/ADICIONAR_CAMPOS_IMPEDIMENTOS_DECISOES.sql
-- Adiciona impediment_status e decision_status

-- supabase/sql/VINCULAR_ITEMS_A_CHECKIN.sql
-- Adiciona coluna checkin_id aos sprint_items

-- supabase/sql/SPRINT_ITEM_SUGGESTIONS.sql
-- Cria tabela de sugestões de IA para sprint items
```

### 6. Check-ins
```sql
-- supabase/sql/CORRIGIR_RLS_SPRINT_CHECKINS.sql
-- Corrige Row Level Security dos check-ins

-- supabase/sql/ATUALIZAR_RLS_DELETE_SPRINT_CHECKINS.sql
-- Permite delete de check-ins (apenas CEO)
```

### 7. Tarefas Pessoais
```sql
-- supabase/sql/PERSONAL_TASKS.sql
-- Cria tabela de tarefas pessoais

-- supabase/sql/FIX_PERSONAL_TASKS_RLS.sql
-- Corrige RLS das tarefas

-- supabase/sql/FIX_PERSONAL_TASKS_RLS_ANON.sql
-- Permite acesso anônimo temporário (se necessário)
```

## Como Executar

1. Acessar Supabase Dashboard (mwlekwyxbfbxfxskywgx.supabase.co)
2. SQL Editor
3. Copiar e executar cada script NA ORDEM acima
4. Verificar sucesso (sem erros vermelhos)

## Fallbacks Implementados

O código tem fallbacks para colunas faltando:
- `show_in_cockpit`: retorna array vazio se coluna não existir
- `activity_progress`, `activity_done`: usa apenas campos básicos
- `responsible_user_id`: funciona sem a coluna (null)

Mas para funcionalidade completa, execute todas as migrations.
