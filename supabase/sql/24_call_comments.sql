create table if not exists public.call_comments (
  id uuid primary key default uuid_generate_v4(),
  call_id uuid not null references public.calls(id) on delete cascade,
  author_id uuid not null,
  author_name text,
  text text not null,
  at_seconds int default 0,
  created_at timestamptz default now()
);

alter table public.call_comments enable row level security;

do $$ begin
  if not exists (select 1 from pg_policies where policyname='call_comments_read' and tablename='call_comments') then
    create policy call_comments_read on public.call_comments for select using (auth.role()='authenticated');
  end if;
  if not exists (select 1 from pg_policies where policyname='call_comments_insert' and tablename='call_comments') then
    create policy call_comments_insert on public.call_comments for insert with check (auth.role()='authenticated');
  end if;
  if not exists (select 1 from pg_policies where policyname='call_comments_update_own' and tablename='call_comments') then
    create policy call_comments_update_own on public.call_comments for update using (auth.uid() = author_id) with check (auth.uid() = author_id);
  end if;
end $$;

create index if not exists idx_call_comments_call on public.call_comments(call_id);


