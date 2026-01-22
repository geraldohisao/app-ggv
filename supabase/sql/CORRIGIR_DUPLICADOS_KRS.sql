-- Corrigir KRs duplicados por OKR (mantém 1, remove cópias sem check-ins)
-- Critério de duplicidade: okr_id + título + tipo + direção + unidade + meta + início + máximo + descrição
-- Mantém preferencialmente KR com check-ins; remove apenas duplicados sem check-ins

begin;

with kr_base as (
  select
    kr.id,
    kr.okr_id,
    coalesce(trim(lower(kr.title)), '') as title_key,
    kr.type,
    kr.direction,
    coalesce(kr.unit, '') as unit_key,
    kr.target_value,
    kr.start_value,
    kr.target_max,
    coalesce(kr.description, '') as description_key,
    kr.updated_at
  from key_results kr
),
kr_with_checkins as (
  select
    kb.*,
    (select count(*) from kr_checkins kc where kc.kr_id = kb.id) as checkins_count
  from kr_base kb
),
ranked as (
  select
    k.*,
    row_number() over (
      partition by okr_id, title_key, type, direction, unit_key, target_value, start_value, target_max, description_key
      order by
        case when checkins_count > 0 then 0 else 1 end,
        updated_at asc nulls last,
        id asc
    ) as rn
  from kr_with_checkins k
),
to_delete as (
  select id
  from ranked
  where rn > 1 and checkins_count = 0
)
delete from key_results
where id in (select id from to_delete);

commit;

-- Preview de grupos ainda duplicados (ex.: com check-ins em múltiplos KRs)
-- select
--   okr_id,
--   title_key,
--   type,
--   direction,
--   unit_key,
--   target_value,
--   start_value,
--   target_max,
--   description_key,
--   count(*) as qty,
--   sum(checkins_count) as total_checkins
-- from ranked
-- group by 1,2,3,4,5,6,7,8,9
-- having count(*) > 1
-- order by qty desc;
