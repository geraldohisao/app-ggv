-- 08_rag_functions.sql
-- Habilitar funções RAG com RLS e performance (idempotente)

-- 1) Função de match para documentos (RAG), respeitando RLS (security invoker)
create or replace function public.kd_match(
  query_embedding vector(768),
  top_k int default 5
)
returns table (
  id uuid,
  name text,
  content text,
  score float4,
  created_at timestamptz
)
language sql
stable
security invoker
set search_path = public
as $$
  select
    k.id,
    k.name,
    k.content,
    1 - (k.embedding <=> query_embedding) as score,  -- cosine similarity
    k.created_at
  from public.knowledge_documents k
  where k.user_id = auth.uid()              -- respeita RLS do owner (security invoker)
  order by k.embedding <=> query_embedding  -- menor distância = mais próximo
  limit greatest(top_k, 0)
$$;

grant execute on function public.kd_match(vector, int) to authenticated;
grant execute on function public.kd_match(vector, int) to service_role;

-- 2) Função de match para overview (bloco livre)
create or replace function public.ko_match(
  query_embedding vector(768),
  top_k int default 3
)
returns table (
  id uuid,
  title text,
  content text,
  score float4,
  created_at timestamptz
)
language sql
stable
security invoker
set search_path = public
as $$
  select
    o.id,
    o.title,
    o.content,
    1 - (o.embedding <=> query_embedding) as score,
    o.created_at
  from public.knowledge_overview o
  where o.user_id = auth.uid()
  order by o.embedding <=> query_embedding
  limit greatest(top_k, 0)
$$;

grant execute on function public.ko_match(vector, int) to authenticated;
grant execute on function public.ko_match(vector, int) to service_role;

-- 3) Seed opcional para flag de embeddings remotos (apenas se ausente)
insert into public.app_settings(key, value)
select 'USE_REMOTE_EMBEDDINGS', to_jsonb(false)
where not exists (
  select 1 from public.app_settings where key = 'USE_REMOTE_EMBEDDINGS'
);

-- 4) Preferências para busca web (idempotente)
insert into public.app_settings(key, value)
select 'USE_WEB_SEARCH', to_jsonb(false)
where not exists (select 1 from public.app_settings where key = 'USE_WEB_SEARCH');

insert into public.app_settings(key, value)
select 'WEB_CONTEXT_HINT', to_jsonb(''::text)
where not exists (select 1 from public.app_settings where key = 'WEB_CONTEXT_HINT');

insert into public.app_settings(key, value)
select 'WEB_TOPK', to_jsonb(2)
where not exists (select 1 from public.app_settings where key = 'WEB_TOPK');

insert into public.app_settings(key, value)
select 'WEB_TIMEOUT_MS', to_jsonb(5000)
where not exists (select 1 from public.app_settings where key = 'WEB_TIMEOUT_MS');

-- Google CSE credenciais (opcionais; manter vazias se não for usar)
insert into public.app_settings(key, value)
select 'G_CSE_API_KEY', to_jsonb(''::text)
where not exists (select 1 from public.app_settings where key = 'G_CSE_API_KEY');

insert into public.app_settings(key, value)
select 'G_CSE_CX', to_jsonb(''::text)
where not exists (select 1 from public.app_settings where key = 'G_CSE_CX');

-- 5) ANALYZE recomendado (executar manualmente após carga de dados)
-- analyze public.knowledge_documents;
-- analyze public.knowledge_overview;

-- (Opcional) Rollback das funções RAG
-- drop function if exists public.kd_match(vector, int);
-- drop function if exists public.ko_match(vector, int);


