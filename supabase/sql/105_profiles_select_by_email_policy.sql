-- ============================================
-- Fix: permitir SELECT do próprio profile por email
-- Data: 2026-01-27
--
-- Contexto:
-- Em alguns ambientes, `profiles.id` não coincide com `auth.uid()`
-- (ex.: profiles gerados via workspace sync com UUID próprio + UNIQUE(email)).
-- Isso faz o app não conseguir ler `department/cargo/user_function` no login real,
-- escondendo módulos (fica só Diagnóstico/Organograma).
--
-- Solução:
-- Adicionar policy de SELECT por match de email do JWT.
-- ============================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Profiles self read by email" ON public.profiles;
CREATE POLICY "Profiles self read by email"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  lower(coalesce(email, '')) = lower(coalesce(auth.jwt() ->> 'email', ''))
);

COMMENT ON POLICY "Profiles self read by email" ON public.profiles IS
'Permite que o usuário autenticado leia seu profile quando profiles.id != auth.uid(), usando match de email do JWT.';

