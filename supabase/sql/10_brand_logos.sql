-- 10_brand_logos.sql
-- Armazena URLs fixas de logos e expõe leitura simples

create table if not exists public.brand_logos (
  key text primary key,
  url text not null,
  updated_at timestamptz default now()
);

-- Seed dos dois logos (idempotente)
insert into public.brand_logos(key, url)
values
  ('grupo_ggv', 'https://ggvinteligencia.com.br/wp-content/uploads/2025/08/Logo-Grupo-GGV-Preto-Vertical-1.png'),
  ('ggv_inteligencia', 'https://ggvinteligencia.com.br/wp-content/uploads/2023/12/image-1.svg')
on conflict (key) do update set url = excluded.url, updated_at = now();

-- RLS: liberar somente leitura para clientes; nenhuma policy de escrita
alter table public.brand_logos enable row level security;
drop policy if exists "BL read all" on public.brand_logos;
create policy "BL read all" on public.brand_logos for select using (true);

-- RPC de leitura única (opcional, mais eficiente para o front)
create or replace function public.get_brand_logos()
returns jsonb
language sql stable security definer
set search_path = public, auth
as $$
  select jsonb_build_object(
    'grupoGGV', coalesce((select url from public.brand_logos where key='grupo_ggv' limit 1), ''),
    'ggvInteligencia', coalesce((select url from public.brand_logos where key='ggv_inteligencia' limit 1), '')
  );
$$;

grant select on table public.brand_logos to anon, authenticated, service_role;
grant execute on function public.get_brand_logos() to anon, authenticated, service_role;


