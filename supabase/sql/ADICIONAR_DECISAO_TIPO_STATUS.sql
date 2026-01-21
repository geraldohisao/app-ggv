-- Adiciona campos específicos para Decisões Estratégicas
-- Fase 3: Tipo de decisão + Status de execução

-- Criar ENUMs para tipos de decisão
do $$ 
begin
  if not exists (select 1 from pg_type where typname = 'decision_type') then
    create type decision_type as enum (
      'ajuste_okr',
      'priorizacao',
      'alocacao_recursos',
      'cancelamento_pivot',
      'estrategica',
      'tatica'
    );
  end if;
end $$;

-- Criar ENUM para status da decisão
do $$ 
begin
  if not exists (select 1 from pg_type where typname = 'decision_status') then
    create type decision_status as enum (
      'decidido',
      'em_execucao',
      'concluido',
      'cancelado'
    );
  end if;
end $$;

-- Adicionar colunas específicas para decisões
alter table if exists public.sprint_items
  add column if not exists decision_type decision_type,
  add column if not exists decision_status decision_status default 'decidido',
  add column if not exists decision_impact text,
  add column if not exists decision_deadline date;

-- Índice para consultas por tipo de decisão
create index if not exists idx_sprint_items_decision_type
  on public.sprint_items (decision_type) where type = 'decisão';

-- Índice para consultas por status de decisão
create index if not exists idx_sprint_items_decision_status
  on public.sprint_items (decision_status) where type = 'decisão';

-- Comentários para documentação
comment on column public.sprint_items.decision_type is 'Tipo de decisão estratégica (ajuste OKR, priorização, alocação, etc)';
comment on column public.sprint_items.decision_status is 'Status de execução da decisão (decidido, em execução, concluído, cancelado)';
comment on column public.sprint_items.decision_impact is 'Descrição do impacto esperado da decisão';
comment on column public.sprint_items.decision_deadline is 'Prazo alvo para execução da decisão';
