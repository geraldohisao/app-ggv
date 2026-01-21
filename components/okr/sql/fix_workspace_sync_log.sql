-- ============================================
-- CORRIGIR: workspace_sync_log
-- Adicionar colunas faltantes
-- ============================================

-- Ver estrutura atual
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'workspace_sync_log'
ORDER BY ordinal_position;

-- Adicionar colunas faltantes (se não existirem)
ALTER TABLE workspace_sync_log
ADD COLUMN IF NOT EXISTS google_id TEXT;

ALTER TABLE workspace_sync_log
ADD COLUMN IF NOT EXISTS email TEXT;

ALTER TABLE workspace_sync_log
ADD COLUMN IF NOT EXISTS action TEXT;

ALTER TABLE workspace_sync_log
ADD COLUMN IF NOT EXISTS success BOOLEAN DEFAULT TRUE;

ALTER TABLE workspace_sync_log
ADD COLUMN IF NOT EXISTS sync_data JSONB;

ALTER TABLE workspace_sync_log
ADD COLUMN IF NOT EXISTS error_message TEXT;

ALTER TABLE workspace_sync_log
ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

-- Adicionar índices
CREATE INDEX IF NOT EXISTS idx_workspace_sync_log_email 
ON workspace_sync_log(email);

CREATE INDEX IF NOT EXISTS idx_workspace_sync_log_created 
ON workspace_sync_log(created_at DESC);

-- Verificar estrutura final
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'workspace_sync_log'
ORDER BY ordinal_position;

DO $$
BEGIN
  RAISE NOTICE '✅ workspace_sync_log corrigida!';
  RAISE NOTICE '';
  RAISE NOTICE '📋 Colunas adicionadas:';
  RAISE NOTICE '  - google_id';
  RAISE NOTICE '  - email';
  RAISE NOTICE '  - action';
  RAISE NOTICE '  - success';
  RAISE NOTICE '  - sync_data';
  RAISE NOTICE '  - error_message';
  RAISE NOTICE '';
  RAISE NOTICE '🚀 Agora pode reimportar!';
END $$;

