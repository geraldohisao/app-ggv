-- ============================================
-- ADD SHOW_IN_COCKPIT FLAG TO KEY_RESULTS
-- ============================================
-- Esta coluna permite marcar KRs específicos para 
-- aparecerem no dashboard estratégico (Cockpit)
-- ============================================

-- 1. Adicionar coluna show_in_cockpit
ALTER TABLE key_results 
ADD COLUMN IF NOT EXISTS show_in_cockpit BOOLEAN DEFAULT false;

-- 2. Criar índice para consultas rápidas no Cockpit
CREATE INDEX IF NOT EXISTS idx_key_results_show_in_cockpit 
ON key_results (show_in_cockpit) 
WHERE show_in_cockpit = true;

-- 3. Comentário na coluna para documentação
COMMENT ON COLUMN key_results.show_in_cockpit IS 
'Flag para exibir este KR no dashboard estratégico (Cockpit). Apenas KRs marcados aparecem na visão executiva.';

-- ============================================
-- VERIFICAÇÃO
-- ============================================
SELECT 
    column_name, 
    data_type, 
    column_default
FROM information_schema.columns 
WHERE table_name = 'key_results' 
AND column_name = 'show_in_cockpit';
