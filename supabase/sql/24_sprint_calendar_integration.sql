-- 24_sprint_calendar_integration.sql
-- Sprint <-> Google Calendar + Meet Transcription Integration
-- Execute este script no SQL Editor do Supabase Dashboard

-- ============================================
-- TABELA 1: sprint_calendar_events
-- Armazena metadados do evento do Google Calendar associado a uma sprint
-- ============================================

CREATE TABLE IF NOT EXISTS public.sprint_calendar_events (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  sprint_id UUID NOT NULL REFERENCES public.sprints(id) ON DELETE CASCADE,
  
  -- Google Calendar metadata
  calendar_id TEXT NOT NULL DEFAULT 'primary', -- 'primary' = agenda principal do usuário
  event_id TEXT, -- ID do evento no Google Calendar (preenchido após criação)
  meet_link TEXT, -- Link do Google Meet gerado automaticamente
  
  -- Scheduling
  start_at TIMESTAMPTZ NOT NULL, -- Data/hora do início
  duration_minutes INTEGER NOT NULL DEFAULT 60, -- Duração em minutos
  recurrence_rrule TEXT, -- RRULE para recorrência (ex: RRULE:FREQ=WEEKLY;BYDAY=MO)
  timezone TEXT NOT NULL DEFAULT 'America/Sao_Paulo',
  
  -- Attendees (emails separados por vírgula)
  attendees_emails TEXT[], -- Array de e-mails dos convidados
  
  -- Sync status
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'synced', 'error', 'cancelled')),
  last_sync_error TEXT, -- Última mensagem de erro (se houver)
  last_synced_at TIMESTAMPTZ,
  
  -- Audit
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_sprint_calendar_events_sprint_id ON public.sprint_calendar_events(sprint_id);
CREATE INDEX IF NOT EXISTS idx_sprint_calendar_events_event_id ON public.sprint_calendar_events(event_id);
CREATE INDEX IF NOT EXISTS idx_sprint_calendar_events_status ON public.sprint_calendar_events(status);

-- Constraint: apenas um evento ativo por sprint
CREATE UNIQUE INDEX IF NOT EXISTS idx_sprint_calendar_events_unique_active 
  ON public.sprint_calendar_events(sprint_id) 
  WHERE status != 'cancelled';

-- RLS (Row Level Security)
ALTER TABLE public.sprint_calendar_events ENABLE ROW LEVEL SECURITY;

-- Política: usuários autenticados podem ver eventos das sprints que têm acesso
DROP POLICY IF EXISTS "Users can view sprint calendar events" ON public.sprint_calendar_events;
CREATE POLICY "Users can view sprint calendar events" ON public.sprint_calendar_events
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.sprints s
      WHERE s.id = sprint_id
      AND s.deleted_at IS NULL
    )
  );

-- Política: usuários autenticados podem criar/atualizar seus próprios eventos
DROP POLICY IF EXISTS "Users can manage own calendar events" ON public.sprint_calendar_events;
CREATE POLICY "Users can manage own calendar events" ON public.sprint_calendar_events
  FOR ALL
  TO authenticated
  USING (created_by = auth.uid())
  WITH CHECK (created_by = auth.uid());

-- Política: admins podem gerenciar todos os eventos
DROP POLICY IF EXISTS "Admins can manage all calendar events" ON public.sprint_calendar_events;
CREATE POLICY "Admins can manage all calendar events" ON public.sprint_calendar_events
  FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Service role full access
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sprint_calendar_events TO service_role;


-- ============================================
-- TABELA 2: sprint_transcript_imports
-- Rastreia importações de transcrições do Google Meet
-- ============================================

CREATE TABLE IF NOT EXISTS public.sprint_transcript_imports (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  sprint_id UUID NOT NULL REFERENCES public.sprints(id) ON DELETE CASCADE,
  checkin_id UUID REFERENCES public.sprint_checkins(id) ON DELETE SET NULL, -- Vinculado após aceite
  
  -- Google Drive/Docs metadata
  calendar_event_id UUID REFERENCES public.sprint_calendar_events(id) ON DELETE SET NULL,
  drive_file_id TEXT, -- ID do arquivo no Google Drive
  docs_url TEXT, -- URL do Google Docs com a transcrição
  source_title TEXT, -- Título do documento/arquivo original
  
  -- Conteúdo
  raw_text TEXT NOT NULL, -- Texto bruto da transcrição
  
  -- Status do aceite
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
  decided_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  decided_at TIMESTAMPTZ,
  rejection_reason TEXT, -- Motivo da rejeição (opcional)
  
  -- Audit
  imported_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_sprint_transcript_imports_sprint_id ON public.sprint_transcript_imports(sprint_id);
CREATE INDEX IF NOT EXISTS idx_sprint_transcript_imports_checkin_id ON public.sprint_transcript_imports(checkin_id);
CREATE INDEX IF NOT EXISTS idx_sprint_transcript_imports_status ON public.sprint_transcript_imports(status);
CREATE INDEX IF NOT EXISTS idx_sprint_transcript_imports_drive_file_id ON public.sprint_transcript_imports(drive_file_id);

-- RLS (Row Level Security)
ALTER TABLE public.sprint_transcript_imports ENABLE ROW LEVEL SECURITY;

-- Política: usuários autenticados podem ver imports das sprints que têm acesso
DROP POLICY IF EXISTS "Users can view transcript imports" ON public.sprint_transcript_imports;
CREATE POLICY "Users can view transcript imports" ON public.sprint_transcript_imports
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.sprints s
      WHERE s.id = sprint_id
      AND s.deleted_at IS NULL
    )
  );

-- Política: usuários autenticados podem criar imports
DROP POLICY IF EXISTS "Users can create transcript imports" ON public.sprint_transcript_imports;
CREATE POLICY "Users can create transcript imports" ON public.sprint_transcript_imports
  FOR INSERT
  TO authenticated
  WITH CHECK (imported_by = auth.uid());

-- Política: usuários podem atualizar seus próprios imports ou os que importaram
DROP POLICY IF EXISTS "Users can update own transcript imports" ON public.sprint_transcript_imports;
CREATE POLICY "Users can update own transcript imports" ON public.sprint_transcript_imports
  FOR UPDATE
  TO authenticated
  USING (imported_by = auth.uid() OR decided_by IS NULL)
  WITH CHECK (true);

-- Política: admins podem gerenciar todos os imports
DROP POLICY IF EXISTS "Admins can manage all transcript imports" ON public.sprint_transcript_imports;
CREATE POLICY "Admins can manage all transcript imports" ON public.sprint_transcript_imports
  FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Service role full access
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sprint_transcript_imports TO service_role;


-- ============================================
-- TRIGGERS: Atualizar updated_at automaticamente
-- ============================================

-- Trigger para sprint_calendar_events
CREATE OR REPLACE FUNCTION update_sprint_calendar_events_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_update_sprint_calendar_events_updated_at ON public.sprint_calendar_events;
CREATE TRIGGER trg_update_sprint_calendar_events_updated_at
  BEFORE UPDATE ON public.sprint_calendar_events
  FOR EACH ROW
  EXECUTE FUNCTION update_sprint_calendar_events_updated_at();

-- Trigger para sprint_transcript_imports
CREATE OR REPLACE FUNCTION update_sprint_transcript_imports_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_update_sprint_transcript_imports_updated_at ON public.sprint_transcript_imports;
CREATE TRIGGER trg_update_sprint_transcript_imports_updated_at
  BEFORE UPDATE ON public.sprint_transcript_imports
  FOR EACH ROW
  EXECUTE FUNCTION update_sprint_transcript_imports_updated_at();


-- ============================================
-- COMENTÁRIOS PARA DOCUMENTAÇÃO
-- ============================================

COMMENT ON TABLE public.sprint_calendar_events IS 'Eventos do Google Calendar associados a sprints para agendamento de rituais';
COMMENT ON COLUMN public.sprint_calendar_events.event_id IS 'ID do evento retornado pelo Google Calendar API após criação';
COMMENT ON COLUMN public.sprint_calendar_events.meet_link IS 'Link do Google Meet gerado automaticamente com conferenceData';
COMMENT ON COLUMN public.sprint_calendar_events.recurrence_rrule IS 'Regra de recorrência no formato RRULE (RFC 5545)';
COMMENT ON COLUMN public.sprint_calendar_events.attendees_emails IS 'Array de e-mails dos convidados para o evento';

COMMENT ON TABLE public.sprint_transcript_imports IS 'Importações de transcrições do Google Meet para check-ins de sprint';
COMMENT ON COLUMN public.sprint_transcript_imports.raw_text IS 'Texto bruto da transcrição importada do Google Meet/Docs';
COMMENT ON COLUMN public.sprint_transcript_imports.status IS 'Status do aceite: pending (aguardando), accepted (aceito pelo usuário), rejected (rejeitado)';
COMMENT ON COLUMN public.sprint_transcript_imports.checkin_id IS 'Referência ao check-in onde a transcrição foi aplicada após aceite';
