-- Setup de gerenciamento de usuários (listar usuários do Auth e definir roles/funções)
-- Execute no SQL Editor do seu projeto Supabase com um usuário/postgres com permissão

-- 1) Tabela user_functions (função/função comercial)
create table if not exists public.user_functions (
  user_id uuid primary key references auth.users(id) on delete cascade,
  function text check (function in ('SDR','Closer','Gestor'))
);

alter table public.user_functions enable row level security;

-- Permitir que admins/super_admins leiam e escrevam
drop policy if exists "Admins manage user_functions" on public.user_functions;
create policy "Admins manage user_functions" on public.user_functions
  for all
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role in ('SUPER_ADMIN','ADMIN')
    )
  ) with check (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role in ('SUPER_ADMIN','ADMIN')
    )
  );

-- 2) Ampliar schema de profiles com colunas auxiliares (nome/email) se ainda não existirem
do $$ begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='profiles' and column_name='email'
  ) then
    alter table public.profiles add column email text;
  end if;
  if not exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='profiles' and column_name='name'
  ) then
    alter table public.profiles add column name text;
  end if;
end $$;

-- 3) RPC para listar usuários do Auth (id, email, name)
-- Requer role de serviço ou execução como security definer
create or replace function public.admin_list_users()
returns table (
  id uuid,
  email text,
  name text
) as $$
begin
  -- Permissão somente a ADMIN/SUPER_ADMIN
  if not exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role in ('SUPER_ADMIN','ADMIN')
  ) then
    raise exception 'Permissão negada';
  end if;

  return query
  select u.id,
         coalesce(u.email, '-') as email,
         coalesce(u.raw_user_meta_data->>'full_name', u.raw_user_meta_data->>'name', u.raw_user_meta_data->>'user_name', 'Sem Nome') as name
  from auth.users u
  order by u.created_at desc;
end;
$$ language plpgsql security definer set search_path = public, auth;

grant execute on function public.admin_list_users() to authenticated, service_role;

-- 3b) RPC consolidada: lista usuários do Auth + role (profiles) + function (user_functions)
drop function if exists public.admin_list_users_full();
create or replace function public.admin_list_users_full()
returns table (
  id uuid,
  email text,
  name text,
  role text,
  function text
) as $$
begin
  if not exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role in ('SUPER_ADMIN','ADMIN')
  ) then
    raise exception 'Permissão negada';
  end if;

  return query
  select u.id,
         coalesce(u.email, '-') as email,
         coalesce(
           u.raw_user_meta_data->>'full_name',
           u.raw_user_meta_data->>'name',
           u.raw_user_meta_data->>'user_name',
           'Sem Nome'
         ) as name,
         coalesce(p.role, 'USER') as role,
         f.function as function
  from auth.users u
  left join public.profiles p on p.id = u.id
  left join public.user_functions f on f.user_id = u.id
  order by u.created_at desc;
end;
$$ language plpgsql security definer set search_path = public, auth;

grant execute on function public.admin_list_users_full() to authenticated, service_role;

-- 7) Backfill: garantir que todos os usuários existentes no Auth tenham um perfil (USER por padrão)
insert into public.profiles (id, role, email, name)
select
  u.id,
  'USER' as role,
  u.email,
  coalesce(u.raw_user_meta_data->>'full_name', u.raw_user_meta_data->>'name', u.raw_user_meta_data->>'user_name') as name
from auth.users u
left join public.profiles p on p.id = u.id
where p.id is null;

-- (REMOVIDO) RPC de sincronização não é necessária; perfis são criados por trigger no primeiro login

-- 9) RPCs focadas para o frontend: leitura/atualização rápidas de profiles
drop function if exists public.admin_list_profiles();
create or replace function public.admin_list_profiles()
returns table (id uuid, email text, name text, role text, user_function text)
language plpgsql security definer set search_path = public, auth
as $$
begin
  if not exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('SUPER_ADMIN','ADMIN')) then
    raise exception 'Permissão negada';
  end if;
  return query
  select p.id, p.email, p.name, p.role, p.user_function
  from public.profiles p
  order by p.created_at desc;
end;
$$;

grant execute on function public.admin_list_profiles() to authenticated, service_role;

drop function if exists public.admin_update_profile(uuid, text, text);
create or replace function public.admin_update_profile(p_id uuid, p_role text, p_function text)
returns void
language plpgsql security definer set search_path = public, auth
as $$
begin
  if not exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('SUPER_ADMIN','ADMIN')) then
    raise exception 'Permissão negada';
  end if;
  update public.profiles
    set role = coalesce(p_role, role),
        user_function = coalesce(p_function, user_function)
  where id = p_id;
end;
$$;

grant execute on function public.admin_update_profile(uuid, text, text) to authenticated, service_role;

-- 4) Policies para profiles permitir leitura a admins de todos os perfis (já existe select próprio nos hooks)
drop policy if exists "Admins can read all profiles" on public.profiles;
create policy "Admins can read all profiles" on public.profiles
  for select using (
    -- O próprio pode ler pelo policy padrão OU admins podem ler todos
    (auth.uid() = id) or exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role in ('SUPER_ADMIN','ADMIN')
    )
  );

-- 5) Upsert de roles por admins
drop policy if exists "Admins can upsert profiles role" on public.profiles;
create policy "Admins can upsert profiles role" on public.profiles
  for insert with check (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('SUPER_ADMIN','ADMIN'))
  );

create policy if not exists "Admins can update profiles role" on public.profiles
  for update using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('SUPER_ADMIN','ADMIN'))
  );

-- 4b) Simplificação: centralizar função (SDR/Closer/Gestor) e role em profiles
-- Adicionar coluna user_function em profiles, se não existir
alter table public.profiles add column if not exists user_function text check (user_function in ('SDR','Closer','Gestor'));

-- Política para admins atualizarem user_function
drop policy if exists "Admins can update profiles function" on public.profiles;
create policy "Admins can update profiles function" on public.profiles
  for update using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('SUPER_ADMIN','ADMIN'))
  );

-- 6) Testes rápidos (opcional)
-- select * from public.admin_list_users() limit 5;

