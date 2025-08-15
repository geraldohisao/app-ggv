-- 06b_logo_settings_fixes.sql
-- Idempotente: garante grants/policies e RPCs para fluxo de logos baseado em RLS

-- Grants mínimos no schema/tabela
grant usage on schema public to authenticated, service_role;
grant select, insert, update, delete on table public.app_settings to authenticated, service_role;

-- RLS ON e policies
alter table public.app_settings enable row level security;

drop policy if exists "app_settings admin all" on public.app_settings;
drop policy if exists "app_settings write admin" on public.app_settings;
drop policy if exists "app_settings read admin" on public.app_settings;

-- Escrita apenas admin (INSERT/UPDATE/DELETE)
create policy "app_settings write admin"
on public.app_settings
for all
using (public.is_admin())
with check (public.is_admin());

-- Leitura direta opcional apenas admin (para depurar)
create policy "app_settings read admin"
on public.app_settings
for select
using (public.is_admin());

-- RPC de leitura (Security Definer) – retorna somente logo_urls
create or replace function public.get_logo_urls()
returns jsonb
language sql
stable
security definer
set search_path = public, auth
as $$
  select value from public.app_settings where key = 'logo_urls' limit 1;
$$;

revoke all on function public.get_logo_urls() from public;
grant execute on function public.get_logo_urls() to anon, authenticated, service_role;

-- RPC de escrita (Security Invoker) – autorização via RLS
create or replace function public.set_logo_urls(p_grupo text, p_inteligencia text)
returns void
language sql
security invoker
set search_path = public
as $$
  insert into public.app_settings(key, value, created_at, updated_at)
  values (
    'logo_urls',
    jsonb_build_object(
      'grupoGGVLogoUrl', p_grupo,
      'ggvInteligenciaLogoUrl', p_inteligencia
    ),
    now(), now()
  )
  on conflict (key) do update
  set value = excluded.value,
      updated_at = now();
$$;

grant execute on function public.set_logo_urls(text, text) to authenticated, service_role;

-- Ferramenta de diagnóstico: quem sou eu?
create or replace function public.whoami()
returns jsonb
language plpgsql
security invoker
set search_path = public, auth
as $$
declare uid uuid := auth.uid();
begin
  return jsonb_build_object(
    'auth_uid', coalesce(uid::text, 'null'),
    'is_admin', public.is_admin(),
    'db_user', current_user,
    'has_dml_on_app_settings', has_table_privilege(current_user, 'public.app_settings', 'INSERT, UPDATE, DELETE')
  );
end; $$;

grant execute on function public.whoami() to authenticated, service_role;


