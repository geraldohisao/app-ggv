-- Adiciona campos específicos para Check-ins de Sprints de Governança
-- Fase 4: Check-ins diferenciados por scope

-- Adicionar campos de governança à tabela sprint_checkins
alter table if exists public.sprint_checkins
  add column if not exists learnings text,
  add column if not exists okr_misalignments text,
  add column if not exists keep_doing text,
  add column if not exists stop_doing text,
  add column if not exists adjust_doing text,
  add column if not exists strategic_recommendations text,
  add column if not exists identified_risks text;

-- Comentários para documentação
comment on column public.sprint_checkins.learnings is 'O que aprendemos neste ciclo? (Governança)';
comment on column public.sprint_checkins.okr_misalignments is 'Quais OKRs estão desalinhados da realidade? (Governança)';
comment on column public.sprint_checkins.keep_doing is 'O que manter? (Governança)';
comment on column public.sprint_checkins.stop_doing is 'O que parar? (Governança)';
comment on column public.sprint_checkins.adjust_doing is 'O que ajustar? (Governança)';
comment on column public.sprint_checkins.strategic_recommendations is 'Recomendações para o próximo ciclo (Governança)';
comment on column public.sprint_checkins.identified_risks is 'Riscos identificados (Governança)';
