-- 06_public_logo_urls.sql
-- RPC pública e segura para retornar apenas os logos salvos em app_settings.logo_urls

-- Função dedicada: não verifica is_admin(); expõe SOMENTE a chave 'logo_urls'
create or replace function public.get_logo_urls()
returns jsonb
language sql
stable
security definer
set search_path = public, auth
as $$
  select value from public.app_settings where key = 'logo_urls' limit 1;
$$;

grant execute on function public.get_logo_urls() to authenticated, service_role;

-- Rollback opcional
-- drop function if exists public.get_logo_urls();


