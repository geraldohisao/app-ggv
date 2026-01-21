-- Adiciona vínculo opcional de decisões com OKR e KR

alter table if exists public.sprint_items
  add column if not exists okr_id uuid references public.okrs(id) on delete set null,
  add column if not exists kr_id uuid references public.key_results(id) on delete set null;

-- Índices para consultas por OKR/KR
create index if not exists idx_sprint_items_okr_id
  on public.sprint_items (okr_id);

create index if not exists idx_sprint_items_kr_id
  on public.sprint_items (kr_id);

