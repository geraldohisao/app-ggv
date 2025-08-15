-- Função admin (adicione emails conforme necessário)
create or replace function public.is_admin()
returns boolean
language sql
stable
set search_path = public, auth
as $$
  select exists(
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role in ('SUPER_ADMIN','ADMIN')
  );
$$;

grant execute on function public.is_admin() to authenticated, service_role;

-- RLS para knowledge_documents / knowledge_overview
alter table public.knowledge_documents enable row level security;
alter table public.knowledge_overview enable row level security;

-- Policies: owner
drop policy if exists "KD owner all" on public.knowledge_documents;
create policy "KD owner all" on public.knowledge_documents
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "KO owner all" on public.knowledge_overview;
create policy "KO owner all" on public.knowledge_overview
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Admin full access
drop policy if exists "KD admin all" on public.knowledge_documents;
create policy "KD admin all" on public.knowledge_documents
  for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists "KO admin all" on public.knowledge_overview;
create policy "KO admin all" on public.knowledge_overview
  for all using (public.is_admin()) with check (public.is_admin());


