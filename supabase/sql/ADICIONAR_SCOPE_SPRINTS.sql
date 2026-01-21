-- Adiciona campo scope para diferenciar Sprint de Execução vs Governança
-- Baseado em consultoria OKR Master: separar operação de estratégia

-- Criar tipo ENUM para scope
do $$ 
begin
  if not exists (select 1 from pg_type where typname = 'sprint_scope') then
    create type sprint_scope as enum ('execucao', 'governanca');
  end if;
end $$;

-- Adicionar coluna scope com default 'execucao' para compatibilidade
alter table if exists public.sprints
  add column if not exists scope sprint_scope default 'execucao';

-- Criar índice para consultas por scope
create index if not exists idx_sprints_scope
  on public.sprints (scope);

-- Comentários para documentação
comment on column public.sprints.scope is 'Diferencia sprints de execução (operacional) de sprints de governança (estratégica)';
