-- Script para criar a tabela error_events no Supabase
-- Execute este script no SQL Editor do Supabase Dashboard

-- 22_error_events.sql
-- Error events storage for client/server incidents, grouped by hash

CREATE TABLE IF NOT EXISTS public.error_events (
  id BIGSERIAL PRIMARY KEY,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  incident_hash TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT,
  url TEXT,
  user_email TEXT,
  user_role TEXT,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  user_agent TEXT,
  app_version TEXT,
  stack TEXT,
  component_stack TEXT,
  status_code INTEGER,
  context JSONB NOT NULL DEFAULT '{}'
);

-- Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_error_events_created_at ON public.error_events (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_error_events_incident_hash ON public.error_events (incident_hash);

-- Habilitar RLS (Row Level Security)
ALTER TABLE public.error_events ENABLE ROW LEVEL SECURITY;

-- Política para permitir inserção de usuários autenticados
DROP POLICY IF EXISTS "Users can insert error events" ON public.error_events;
CREATE POLICY "Users can insert error events" ON public.error_events
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Política para permitir visualização de próprios eventos ou admins
DROP POLICY IF EXISTS "Users can view own error events" ON public.error_events;
CREATE POLICY "Users can view own error events" ON public.error_events
  FOR SELECT
  USING (
    (auth.uid() = user_id)
    OR public.is_admin()
    OR (current_setting('request.jwt.claims', true)::jsonb ->> 'email') = user_email
  );

-- Conceder permissões para service_role (para operações server-side)
GRANT INSERT, SELECT, UPDATE, DELETE ON public.error_events TO service_role;
GRANT USAGE ON SEQUENCE public.error_events_id_seq TO service_role;

-- Adicionar comentários para documentação
COMMENT ON TABLE public.error_events IS 'Incidentes de erro client/server, agrupados por incident_hash';
COMMENT ON COLUMN public.error_events.incident_hash IS 'Hash estável para agrupar ocorrências similares';

-- Verificar se a tabela foi criada
SELECT 'Tabela error_events criada com sucesso!' as status;
