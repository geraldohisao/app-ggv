-- ============================================
-- OKR: adicionar campo description
-- Data: 2026-01-28
-- Objetivo: permitir detalhar o OKR além do título (objective)
-- ============================================

ALTER TABLE public.okrs
ADD COLUMN IF NOT EXISTS description TEXT;

COMMENT ON COLUMN public.okrs.description IS
'Descrição do OKR (contexto/escopo/definição). Campo para esclarecer o objetivo além do título.';

