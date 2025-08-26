-- Tabelas de Scorecards
create table if not exists public.scorecards (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  conversation_type text,
  active boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.scorecard_criteria (
  id uuid primary key default uuid_generate_v4(),
  scorecard_id uuid not null references public.scorecards(id) on delete cascade,
  category text default 'Geral',
  text text not null,
  weight int not null default 10,
  order_index int not null default 0,
  archived boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.scorecards enable row level security;
alter table public.scorecard_criteria enable row level security;

-- Políticas: authenticated pode ler e editar (simples para início)
do $$ begin
  if not exists (select 1 from pg_policies where policyname = 'scorecards_read' and tablename='scorecards') then
    create policy scorecards_read on public.scorecards for select using (auth.role() = 'authenticated');
  end if;
  if not exists (select 1 from pg_policies where policyname = 'scorecards_write' and tablename='scorecards') then
    create policy scorecards_write on public.scorecards for insert with check (auth.role() = 'authenticated');
  end if;
  if not exists (select 1 from pg_policies where policyname = 'scorecards_update' and tablename='scorecards') then
    create policy scorecards_update on public.scorecards for update using (auth.role() = 'authenticated');
  end if;
  if not exists (select 1 from pg_policies where policyname = 'criteria_read' and tablename='scorecard_criteria') then
    create policy criteria_read on public.scorecard_criteria for select using (auth.role() = 'authenticated');
  end if;
  if not exists (select 1 from pg_policies where policyname = 'criteria_write' and tablename='scorecard_criteria') then
    create policy criteria_write on public.scorecard_criteria for insert with check (auth.role() = 'authenticated');
  end if;
  if not exists (select 1 from pg_policies where policyname = 'criteria_update' and tablename='scorecard_criteria') then
    create policy criteria_update on public.scorecard_criteria for update using (auth.role() = 'authenticated');
  end if;
end $$;

create index if not exists idx_criteria_scorecard on public.scorecard_criteria(scorecard_id);


