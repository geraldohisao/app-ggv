-- 09_sector_rag_functions.sql
-- Função RAG que inclui setores de atuação (documentos públicos)

-- Função de match que inclui documentos do usuário + setores públicos
create or replace function public.kd_match_with_sectors(
  query_embedding vector(768),
  top_k int default 5
)
returns table (
  id uuid,
  name text,
  content text,
  score float4,
  created_at timestamptz,
  is_sector boolean
)
language sql
stable
security invoker
set search_path = public
as $$
  -- Combinar documentos do usuário + setores públicos
  select
    k.id,
    k.name,
    k.content,
    1 - (k.embedding <=> query_embedding) as score,
    k.created_at,
    (k.name like 'SETOR:%') as is_sector
  from public.knowledge_documents k
  where (
    k.user_id = auth.uid()                    -- documentos do usuário
    OR (k.user_id IS NULL AND k.name like 'SETOR:%')  -- setores públicos
  )
  order by k.embedding <=> query_embedding    -- menor distância = mais próximo
  limit greatest(top_k, 0)
$$;

grant execute on function public.kd_match_with_sectors(vector, int) to authenticated;
grant execute on function public.kd_match_with_sectors(vector, int) to service_role;

-- Função específica para buscar apenas setores (para debug/admin)
create or replace function public.sectors_match(
  query_embedding vector(768),
  top_k int default 3
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
    1 - (k.embedding <=> query_embedding) as score,
    k.created_at
  from public.knowledge_documents k
  where k.user_id IS NULL AND k.name like 'SETOR:%'
  order by k.embedding <=> query_embedding
  limit greatest(top_k, 0)
$$;

grant execute on function public.sectors_match(vector, int) to authenticated;
grant execute on function public.sectors_match(vector, int) to service_role;
