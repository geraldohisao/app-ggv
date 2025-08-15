-- 09_vector_health.sql
-- RPCs idempotentes para diagnóstico de vetor/pgvector

-- 1) Stats por usuário (RLS-safe)
create or replace function public.vector_health_stats()
returns table (
  docs_count int,
  overview_count int
)
language sql
stable
security invoker
set search_path = public
as $$
  select
    (select count(*) from public.knowledge_documents  where user_id = auth.uid())::int as docs_count,
    (select count(*) from public.knowledge_overview   where user_id = auth.uid())::int as overview_count
$$;

grant execute on function public.vector_health_stats() to authenticated;
grant execute on function public.vector_health_stats() to service_role;

-- 2) EXPLAIN da busca (apenas admin)
create or replace function public.vector_health_explain()
returns text
language sql
stable
security definer
set search_path = public, extensions
as $$
  select (
    case
      when not public.is_admin() then raise_exception('Permissão negada')
      else (
        select string_agg(p, E'\n') from (
          explain (format text)
          select id
          from public.knowledge_documents
          where user_id = auth.uid() and embedding is not null
          order by embedding <=> (
            select embedding from public.knowledge_documents where embedding is not null limit 1
          )
          limit 5
        ) as t(p)
      )
    end
  );
$$;

grant execute on function public.vector_health_explain() to authenticated;
grant execute on function public.vector_health_explain() to service_role;

-- 3) Versão do pgvector (best effort)
create or replace function public.vector_pgvector_version()
returns text
language sql
stable
security definer
set search_path = public, extensions
as $$
  select extversion from pg_extension where extname = 'vector' limit 1;
$$;

grant execute on function public.vector_pgvector_version() to authenticated;
grant execute on function public.vector_pgvector_version() to service_role;

-- Rollback opcional (comentado)
-- drop function if exists public.vector_health_stats();
-- drop function if exists public.vector_health_explain();
-- drop function if exists public.vector_pgvector_version();


