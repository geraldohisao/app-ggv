-- 06_logo_settings_invoker.sql
-- Simplifica salvamento de logos: função INVOKER + RLS faz a autorização

-- Tabela (já existente)
create table if not exists public.app_settings (
  key text primary key,
  value jsonb not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Trigger updated_at
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end; $$;

drop trigger if exists trg_app_settings_updated on public.app_settings;
create trigger trg_app_settings_updated
before update on public.app_settings
for each row execute function public.set_updated_at();

-- RLS: escrever apenas admin; leitura de logos via RPC dedicada
alter table public.app_settings enable row level security;

drop policy if exists "app_settings admin all" on public.app_settings;
drop policy if exists "app_settings write admin" on public.app_settings;
drop policy if exists "app_settings read admin" on public.app_settings;

-- Escrever (INSERT/UPDATE/DELETE): somente admin
create policy "app_settings write admin"
on public.app_settings
for all
using (public.is_admin())
with check (public.is_admin());

-- (Opcional) leitura direta só para admin; para logos usamos RPC definer que retorna só 'logo_urls'
create policy "app_settings read admin"
on public.app_settings
for select
using (public.is_admin());

-- RPC de leitura (mantida): expõe somente 'logo_urls'
create or replace function public.get_logo_urls()
returns jsonb
language sql
stable
security definer
set search_path = public, auth
as $$
  select value
  from public.app_settings
  where key = 'logo_urls'
  limit 1
$$;

revoke all on function public.get_logo_urls() from public;
grant execute on function public.get_logo_urls() to anon, authenticated, service_role;

-- NOVA RPC de escrita: sem is_admin() aqui; rely on table RLS
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


