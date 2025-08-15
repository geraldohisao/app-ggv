-- 06c_logo_settings_assert.sql
-- Ajustes mínimos para garantir funcionamento das RPCs de logos

-- Grants essenciais
grant usage on schema public to authenticated, service_role;
grant select, insert, update, delete on table public.app_settings to authenticated, service_role;

-- RLS e policies focadas
alter table public.app_settings enable row level security;

drop policy if exists "app_settings write admin" on public.app_settings;
drop policy if exists "app_settings read admin" on public.app_settings;

create policy "app_settings write admin" on public.app_settings
  for all using (public.is_admin()) with check (public.is_admin());

create policy "app_settings read admin" on public.app_settings
  for select using (public.is_admin());

-- RPCs: apenas assert (recria idempotente com semântica correta)
create or replace function public.get_logo_urls()
returns jsonb
language sql stable security definer
set search_path = public, auth
as $$ select value from public.app_settings where key='logo_urls' limit 1; $$;
revoke all on function public.get_logo_urls() from public;
grant execute on function public.get_logo_urls() to anon, authenticated, service_role;

create or replace function public.set_logo_urls(p_grupo text, p_inteligencia text)
returns void
language sql security invoker set search_path = public
as $$
  insert into public.app_settings(key, value, created_at, updated_at)
  values ('logo_urls', jsonb_build_object('grupoGGVLogoUrl', p_grupo, 'ggvInteligenciaLogoUrl', p_inteligencia), now(), now())
  on conflict (key) do update set value = excluded.value, updated_at = now();
$$;
grant execute on function public.set_logo_urls(text, text) to authenticated, service_role;


