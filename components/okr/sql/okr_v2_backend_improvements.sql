-- =============================================================
-- Backend improvements: profiles backfill + sample seeds + helper views/RPCs
-- Safe to run multiple times (idempotent-ish for inserts via ON CONFLICT DO NOTHING)
-- =============================================================

-- 1) Backfill profiles.role/department defaults if missing
UPDATE public.profiles
SET role = COALESCE(role, 'USER'),
    department = COALESCE(department, 'geral')
WHERE role IS NULL OR department IS NULL;

-- 2) Create minimal sample data (runs once)
-- Resolve user_id using auth.uid() or first profile id as fallback
WITH seed_user AS (
  SELECT COALESCE(auth.uid(), (SELECT id FROM public.profiles ORDER BY created_at LIMIT 1)) AS uid
)
-- Strategic OKR
INSERT INTO okrs (id, user_id, level, department, owner, objective, start_date, end_date, periodicity, status)
SELECT
  gen_random_uuid(),
  seed_user.uid,
  'estratégico',
  'geral',
  'CEO GGV',
  'Aumentar receita recorrente em 30% no Q1 2026',
  '2026-01-01',
  '2026-03-31',
  'trimestral',
  'em andamento'
FROM seed_user
WHERE seed_user.uid IS NOT NULL
ON CONFLICT DO NOTHING;

-- Setorial OKR (comercial)
WITH seed_user AS (
  SELECT COALESCE(auth.uid(), (SELECT id FROM public.profiles ORDER BY created_at LIMIT 1)) AS uid
)
INSERT INTO okrs (id, user_id, level, department, owner, objective, start_date, end_date, periodicity, status)
SELECT
  gen_random_uuid(),
  seed_user.uid,
  'setorial',
  'comercial',
  'Head Comercial',
  'Escalar operação de Closers com eficiência de 35% em conversão',
  '2026-01-01',
  '2026-03-31',
  'trimestral',
  'em andamento'
FROM seed_user
WHERE seed_user.uid IS NOT NULL
ON CONFLICT DO NOTHING;

-- Sample KRs for commercial OKR (link by latest setorial/comercial okr)
WITH c AS (
  SELECT id FROM okrs
  WHERE department = 'comercial' AND level = 'setorial'
  ORDER BY created_at DESC LIMIT 1
)
INSERT INTO key_results (id, okr_id, title, current_value, target_value, unit, status)
SELECT gen_random_uuid(), c.id, 'Taxa de conversão SQL → Won', 22, 35, '%', 'amarelo' FROM c
ON CONFLICT DO NOTHING;

WITH c AS (
  SELECT id FROM okrs
  WHERE department = 'comercial' AND level = 'setorial'
  ORDER BY created_at DESC LIMIT 1
)
INSERT INTO key_results (id, okr_id, title, current_value, target_value, unit, status)
SELECT gen_random_uuid(), c.id, 'Ticket Médio', 13500, 15000, 'R$', 'verde' FROM c
ON CONFLICT DO NOTHING;

-- Sample Sprint vinculada ao OKR comercial
WITH c AS (
  SELECT id FROM okrs
  WHERE department = 'comercial' AND level = 'setorial'
  ORDER BY created_at DESC LIMIT 1
), seed_user AS (
  SELECT COALESCE(auth.uid(), (SELECT id FROM public.profiles ORDER BY created_at LIMIT 1)) AS uid
)
INSERT INTO sprints (id, okr_id, type, department, title, description, start_date, end_date, status, created_by)
SELECT
  gen_random_uuid(),
  c.id,
  'semanal',
  'comercial',
  'Sprint Comercial – Semana 2/2026',
  'Foco em prospecção e follow-up',
  '2026-01-08',
  '2026-01-15',
  'em andamento',
  seed_user.uid
FROM c, seed_user
WHERE seed_user.uid IS NOT NULL
ON CONFLICT DO NOTHING;

-- Sample sprint items
WITH s AS (
  SELECT id FROM sprints
  WHERE department = 'comercial'
  ORDER BY created_at DESC LIMIT 1
)
INSERT INTO sprint_items (id, sprint_id, type, title, responsible, status, due_date)
SELECT gen_random_uuid(), s.id, 'iniciativa', 'Roleplay diário com time de Closers', 'João Sales', 'em andamento', '2026-01-12' FROM s
ON CONFLICT DO NOTHING;

WITH s AS (
  SELECT id FROM sprints
  WHERE department = 'comercial'
  ORDER BY created_at DESC LIMIT 1
)
INSERT INTO sprint_items (id, sprint_id, type, title, responsible, status)
SELECT gen_random_uuid(), s.id, 'impedimento', 'Atraso na entrega do novo CRM', 'TI', 'pendente' FROM s
ON CONFLICT DO NOTHING;

-- 3) Helper RPCs para filtros por departamento (opcionais)
create or replace function rpc_list_okrs_by_dept(dept text)
returns setof okrs_with_progress
language sql
security definer
set search_path = public
as $$
  select * from okrs_with_progress
  where department = rpc_list_okrs_by_dept.dept
  order by created_at desc;
$$;

create or replace function rpc_list_sprints_by_dept(dept text)
returns setof sprints_with_metrics
language sql
security definer
set search_path = public
as $$
  select * from sprints_with_metrics
  where department = rpc_list_sprints_by_dept.dept
  order by start_date desc;
$$;

grant execute on function rpc_list_okrs_by_dept(text) to authenticated, service_role;
grant execute on function rpc_list_sprints_by_dept(text) to authenticated, service_role;


