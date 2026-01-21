-- Adiciona colunas para lixeira (soft delete) em sprints
-- Mantém registro por pelo menos 30 dias (não remove dados)

alter table if exists public.sprints
  add column if not exists deleted_at timestamptz,
  add column if not exists deleted_by uuid,
  add column if not exists deleted_reason text;

-- Índice simples para filtros por lixeira
create index if not exists idx_sprints_deleted_at
  on public.sprints (deleted_at);

