-- 🧹 LIMPAR ANÁLISES DE CHAMADAS < 3 MINUTOS (180s)
-- Data: 05/11/2025
-- Motivo: Correção do limite mínimo de 60s para 180s

-- 1. VERIFICAR quantas análises serão afetadas
SELECT 
    COUNT(*) as total_analises_curtas,
    MIN(c.duration) as menor_duracao,
    MAX(c.duration) as maior_duracao,
    AVG(c.duration)::int as media_duracao
FROM calls c
INNER JOIN call_analysis ca ON ca.call_id = c.id
WHERE c.duration < 180;

-- 2. LISTAR exemplos para conferir
SELECT 
    c.id,
    c.duration as duracao_segundos,
    CONCAT(
        LPAD((c.duration / 60)::text, 2, '0'), ':', 
        LPAD((c.duration % 60)::text, 2, '0')
    ) as duracao_formatada,
    c.enterprise as empresa,
    ca.final_grade as nota,
    ca.overall_score as pontuacao,
    ca.max_possible_score as pontuacao_maxima,
    ca.created_at as data_analise
FROM calls c
INNER JOIN call_analysis ca ON ca.call_id = c.id
WHERE c.duration < 180
ORDER BY c.duration DESC
LIMIT 20;

-- 3. VERIFICAR POR FAIXA DE DURAÇÃO
SELECT 
    faixa_duracao,
    total,
    nota_media
FROM (
    SELECT 
        CASE 
            WHEN c.duration < 60 THEN '< 1 min'
            WHEN c.duration < 120 THEN '1-2 min'
            WHEN c.duration < 180 THEN '2-3 min'
        END as faixa_duracao,
        CASE 
            WHEN c.duration < 60 THEN 1
            WHEN c.duration < 120 THEN 2
            WHEN c.duration < 180 THEN 3
        END as ordem,
        COUNT(*) as total,
        AVG(ca.final_grade)::numeric(3,1) as nota_media
    FROM calls c
    INNER JOIN call_analysis ca ON ca.call_id = c.id
    WHERE c.duration < 180
    GROUP BY 
        CASE 
            WHEN c.duration < 60 THEN '< 1 min'
            WHEN c.duration < 120 THEN '1-2 min'
            WHEN c.duration < 180 THEN '2-3 min'
        END,
        CASE 
            WHEN c.duration < 60 THEN 1
            WHEN c.duration < 120 THEN 2
            WHEN c.duration < 180 THEN 3
        END
) subquery
ORDER BY ordem;

-- ========================================
-- ⚠️ BACKUP ANTES DE DELETAR!
-- ========================================

-- 4. CRIAR BACKUP das análises que serão deletadas
CREATE TABLE IF NOT EXISTS call_analysis_backup_20251105 AS
SELECT ca.*, c.duration, c.enterprise
FROM call_analysis ca
INNER JOIN calls c ON ca.call_id = c.id
WHERE c.duration < 180;

-- Conferir backup
SELECT COUNT(*) as registros_no_backup FROM call_analysis_backup_20251105;

-- ========================================
-- ⚠️ DELETAR ANÁLISES CURTAS
-- ========================================

-- 5. DELETAR análises de chamadas < 3 minutos
-- ⚠️ ATENÇÃO: Ação irreversível! Backup feito acima.
DELETE FROM call_analysis ca
USING calls c
WHERE ca.call_id = c.id
AND c.duration < 180;

-- Deve retornar: DELETE X (onde X é o número de registros deletados)

-- ========================================
-- ✅ CONFERIR RESULTADO
-- ========================================

-- 6. CONFERIR que não há mais análises curtas
SELECT COUNT(*) as analises_curtas_restantes
FROM call_analysis ca
INNER JOIN calls c ON ca.call_id = c.id
WHERE c.duration < 180;
-- Deve retornar: 0

-- 7. ESTATÍSTICAS FINAIS
SELECT 
    (SELECT COUNT(*) FROM call_analysis) as total_analises_apos,
    (SELECT COUNT(*) FROM call_analysis_backup_20251105) as total_deletadas,
    ROUND(
        (SELECT COUNT(*) FROM call_analysis_backup_20251105)::numeric / 
        ((SELECT COUNT(*) FROM call_analysis) + (SELECT COUNT(*) FROM call_analysis_backup_20251105))::numeric * 100, 
        2
    ) as percentual_deletado;

-- ========================================
-- 🔄 ROLLBACK (se necessário)
-- ========================================

-- Se precisar reverter, execute:
/*
INSERT INTO call_analysis 
SELECT 
    id, call_id, scorecard_id, scorecard_name, 
    overall_score, max_possible_score, final_grade,
    general_feedback, strengths, improvements, confidence,
    criteria_analysis, created_at, processing_time_ms
FROM call_analysis_backup_20251105;

-- Depois delete o backup:
DROP TABLE call_analysis_backup_20251105;
*/

