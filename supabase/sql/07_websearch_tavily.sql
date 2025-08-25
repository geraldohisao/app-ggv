-- 07_websearch_tavily.sql (idempotente)
-- TAVILY_API_KEY em app_settings + flags padrão de Web Search

-- tabela já deve existir; criar se faltar
create table if not exists public.app_settings (
  key text primary key,
  value jsonb not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- trigger updated_at (idempotente)
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at := now(); return new; end;
$$;

drop trigger if exists trg_app_settings_updated on public.app_settings;
create trigger trg_app_settings_updated
before update on public.app_settings
for each row execute function public.set_updated_at();

-- RLS (já existente no projeto, garantir escrita apenas admin)
alter table public.app_settings enable row level security;
-- manter policies existentes

-- seeds idempotentes
insert into public.app_settings(key, value)
select 'USE_WEB_SEARCH', 'true'::jsonb
where not exists (select 1 from public.app_settings where key='USE_WEB_SEARCH');

insert into public.app_settings(key, value)
select 'WEB_TOPK', '2'::jsonb
where not exists (select 1 from public.app_settings where key='WEB_TOPK');

insert into public.app_settings(key, value)
select 'WEB_TIMEOUT_MS', '5000'::jsonb
where not exists (select 1 from public.app_settings where key='WEB_TIMEOUT_MS');

-- setar a sua chave Tavily (substituir aqui no SQL OU usar a UI/admin):
-- Exemplo (opcional):
-- NUNCA comitar chaves reais. Valor inicial vazio por padrão.
insert into public.app_settings(key, value)
values ('TAVILY_API_KEY', to_jsonb(''::text))
on conflict (key) do nothing;


