-- 24_debug_logs.sql
-- Tabela para persistência de logs de console de todos os usuários

create table if not exists public.debug_logs (
  id bigserial primary key,
  created_at timestamptz not null default now(),
  level text not null check (level in ('info','warn','error','debug','success')),
  category text default 'console',
  message text not null,
  data jsonb not null default '{}',
  source text,
  url text,
  app_version text,
  session_id text,
  user_email text,
  user_role text,
  user_id uuid references auth.users(id) on delete set null
);

create index if not exists idx_debug_logs_created_at on public.debug_logs (created_at desc);
create index if not exists idx_debug_logs_level on public.debug_logs (level);
create index if not exists idx_debug_logs_user_email on public.debug_logs (user_email);

alter table public.debug_logs enable row level security;

-- Inserção: qualquer usuário autenticado pode inserir
drop policy if exists "Users can insert debug logs" on public.debug_logs;
create policy "Users can insert debug logs" on public.debug_logs
  for insert to authenticated
  with check (true);

-- Leitura: usuário vê os próprios logs; admins veem todos
drop policy if exists "Users can view own debug logs" on public.debug_logs;
create policy "Users can view own debug logs" on public.debug_logs
  for select
  using (
    (auth.uid() = user_id)
    or public.is_admin()
    or (current_setting('request.jwt.claims', true)::jsonb ->> 'email') = user_email
  );

comment on table public.debug_logs is 'Logs de console persistidos do app, por usuário e nível';
comment on column public.debug_logs.session_id is 'ID lógico para sessão do cliente (local)';

-- Mensagem de sucesso
select 'Tabela debug_logs criada/atualizada com sucesso!' as status;


