-- Tabela de resultados de scorecard por call/critério
create table if not exists public.call_scores (
  id uuid primary key default uuid_generate_v4(),
  call_id uuid not null references public.calls(id) on delete cascade,
  scorecard_id uuid not null references public.scorecards(id) on delete cascade,
  criterion_id uuid not null references public.scorecard_criteria(id) on delete cascade,
  score int not null, -- 0, 5, 10
  justification text,
  created_at timestamptz default now()
);

alter table public.call_scores enable row level security;
do $$ begin
  if not exists (select 1 from pg_policies where policyname='call_scores_read' and tablename='call_scores') then
    create policy call_scores_read on public.call_scores for select using (auth.role()='authenticated');
  end if;
  if not exists (select 1 from pg_policies where policyname='call_scores_write' and tablename='call_scores') then
    create policy call_scores_write on public.call_scores for insert with check (auth.role()='authenticated');
  end if;
end $$;

create index if not exists idx_call_scores_call on public.call_scores(call_id);
create index if not exists idx_call_scores_scorecard on public.call_scores(scorecard_id);


