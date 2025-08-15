-- Plataforma GGV - Tabela e RPCs para Logos da Marca
-- Execute este script no SQL Editor do seu projeto Supabase

-- 1) Tabela dedicada (singleton) para armazenar os URLs dos logos
create table if not exists public.platform_logos (
  id int primary key check (id = 1),
  grupo_ggv_logo_url text not null,
  ggv_inteligencia_logo_url text not null,
  updated_at timestamptz default now()
);

-- Garantir linha única (id = 1) com valores iniciais
insert into public.platform_logos (id, grupo_ggv_logo_url, ggv_inteligencia_logo_url)
select 1,
       'https://ggvinteligencia.com.br/wp-content/uploads/2025/08/Logo-Grupo-GGV-Preto_Vertical-1.png',
       'https://ggvinteligencia.com.br/wp-content/uploads/2023/12/image_1.svg'
where not exists (select 1 from public.platform_logos where id = 1);

-- 2) RLS e políticas
alter table public.platform_logos enable row level security;

-- Todos autenticados podem ler
drop policy if exists "PL read" on public.platform_logos;
create policy "PL read" on public.platform_logos
  for select using (true);

-- Apenas admin pode inserir/atualizar
drop policy if exists "PL admin write" on public.platform_logos;
create policy "PL admin write" on public.platform_logos
  for all using (public.is_admin()) with check (public.is_admin());

-- 3) RPC para obter logos (retorna camelCase esperado pelo front)
create or replace function public.get_platform_logos()
returns jsonb
language sql stable security definer
set search_path = public, auth
as $$
  select jsonb_build_object(
    'grupoGGVLogoUrl', grupo_ggv_logo_url,
    'ggvInteligenciaLogoUrl', ggv_inteligencia_logo_url
  )
  from public.platform_logos where id = 1;
$$;

grant execute on function public.get_platform_logos() to authenticated, service_role;

-- 4) RPC para definir logos (somente admin)
create or replace function public.set_platform_logos(
  p_grupo text,
  p_inteligencia text
)
returns void
language plpgsql security definer
set search_path = public, auth
as $$
begin
  if not public.is_admin() then
    raise exception 'Permissão negada';
  end if;
  insert into public.platform_logos (id, grupo_ggv_logo_url, ggv_inteligencia_logo_url)
  values (1, p_grupo, p_inteligencia)
  on conflict (id) do update
  set grupo_ggv_logo_url = excluded.grupo_ggv_logo_url,
      ggv_inteligencia_logo_url = excluded.ggv_inteligencia_logo_url,
      updated_at = now();
end;
$$;

grant execute on function public.set_platform_logos(text, text) to authenticated, service_role;

-- 5) Compatibilidade: manter RPC de leitura antiga apontando para nova tabela (opcional)
create or replace function public.get_logo_urls()
returns jsonb
language sql stable security definer
set search_path = public, auth
as $$
  select public.get_platform_logos();
$$;

grant execute on function public.get_logo_urls() to authenticated, service_role;


