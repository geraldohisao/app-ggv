-- ============================================
-- Evolução: Sprints Guiadas e Vínculo com OKR
-- ============================================

-- 1. Tabela pivot para vincular Sprints a múltiplos OKRs (Máximo recomendado: 3)
CREATE TABLE IF NOT EXISTS sprint_okrs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sprint_id UUID NOT NULL REFERENCES sprints(id) ON DELETE CASCADE,
  okr_id UUID NOT NULL REFERENCES okrs(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(sprint_id, okr_id)
);

-- 2. Tabela de Check-ins de Key Results no contexto da Sprint
-- Isso permite registrar a evolução do KR semanalmente/mensalmente atrelado ao ritual
CREATE TABLE IF NOT EXISTS kr_checkins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sprint_id UUID NOT NULL REFERENCES sprints(id) ON DELETE CASCADE,
  kr_id UUID NOT NULL REFERENCES key_results(id) ON DELETE CASCADE,
  value NUMERIC NOT NULL,
  previous_value NUMERIC,
  comment TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Índices para performance
CREATE INDEX IF NOT EXISTS idx_sprint_okrs_sprint_id ON sprint_okrs(sprint_id);
CREATE INDEX IF NOT EXISTS idx_sprint_okrs_okr_id ON sprint_okrs(okr_id);
CREATE INDEX IF NOT EXISTS idx_kr_checkins_sprint_id ON kr_checkins(sprint_id);
CREATE INDEX IF NOT EXISTS idx_kr_checkins_kr_id ON kr_checkins(kr_id);

-- 4. Comentários para documentação
COMMENT ON TABLE sprint_okrs IS 'Associação entre Sprints de Gestão e OKRs Focados';
COMMENT ON TABLE kr_checkins IS 'Histórico de evolução dos KRs registrado durante as reuniões de Sprint';
COMMENT ON COLUMN kr_checkins.value IS 'Valor do KR registrado no momento desta Sprint';
