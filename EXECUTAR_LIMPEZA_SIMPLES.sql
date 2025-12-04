-- 🧹 LIMPEZA SIMPLES - Análises < 180s
-- Versão simplificada para execução rápida

-- ========================================
-- 1️⃣ VERIFICAÇÃO INICIAL
-- ========================================

-- Quantas análises serão deletadas?
SELECT 
    COUNT(*) as total_a_deletar,
    MIN(c.duration) as menor_duracao_s,
    MAX(c.duration) as maior_duracao_s
FROM calls c
INNER JOIN call_analysis ca ON ca.call_id = c.id
WHERE c.duration < 180;

-- ========================================
-- 2️⃣ BACKUP AUTOMÁTICO
-- ========================================

-- Criar backup antes de deletar
CREATE TABLE IF NOT EXISTS call_analysis_backup_20251105 AS
SELECT ca.*, c.duration, c.enterprise
FROM call_analysis ca
INNER JOIN calls c ON ca.call_id = c.id
WHERE c.duration < 180;

-- Conferir backup
SELECT COUNT(*) as registros_backup FROM call_analysis_backup_20251105;

-- ========================================
-- 3️⃣ DELETAR ANÁLISES CURTAS
-- ========================================

-- ⚠️ ATENÇÃO: Ação irreversível! Backup feito acima.
DELETE FROM call_analysis ca
USING calls c
WHERE ca.call_id = c.id
AND c.duration < 180;

-- ========================================
-- 4️⃣ CONFERIR RESULTADO
-- ========================================

-- Deve retornar 0
SELECT COUNT(*) as analises_curtas_restantes
FROM call_analysis ca
INNER JOIN calls c ON ca.call_id = c.id
WHERE c.duration < 180;

-- Estatísticas finais
SELECT 
    (SELECT COUNT(*) FROM call_analysis) as total_analises_apos,
    (SELECT COUNT(*) FROM call_analysis_backup_20251105) as total_deletadas;

-- ========================================
-- ✅ PRONTO!
-- ========================================

-- Se tudo OK, pode deletar o backup:
-- DROP TABLE call_analysis_backup_20251105;

-- Se precisar reverter (ROLLBACK):
/*
INSERT INTO call_analysis 
SELECT 
    id, call_id, scorecard_id, scorecard_name, 
    overall_score, max_possible_score, final_grade,
    general_feedback, strengths, improvements, confidence,
    criteria_analysis, created_at, processing_time_ms
FROM call_analysis_backup_20251105;

DROP TABLE call_analysis_backup_20251105;
*/


