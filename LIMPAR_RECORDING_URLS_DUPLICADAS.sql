-- 🧹 LIMPAR recording_url DUPLICADAS (Solução Temporária)
-- Problema: Múltiplas chamadas compartilham mesma URL de áudio

-- ====================================
-- 1. ESTATÍSTICAS DO PROBLEMA
-- ====================================

-- Quantas chamadas têm URLs duplicadas?
SELECT 
    COUNT(DISTINCT c.id) as chamadas_afetadas,
    COUNT(DISTINCT c.recording_url) as urls_duplicadas
FROM calls c
WHERE c.recording_url IN (
    SELECT recording_url
    FROM calls
    WHERE recording_url IS NOT NULL
    GROUP BY recording_url
    HAVING COUNT(*) > 1
);

-- ====================================
-- 2. BACKUP ANTES DE LIMPAR
-- ====================================

-- Criar backup das URLs que serão limpas
CREATE TABLE IF NOT EXISTS recording_urls_backup_20251110 AS
SELECT 
    id,
    enterprise,
    person,
    recording_url,
    duration,
    created_at
FROM calls
WHERE recording_url IN (
    SELECT recording_url
    FROM calls
    WHERE recording_url IS NOT NULL
    GROUP BY recording_url
    HAVING COUNT(*) > 1
);

-- Conferir backup
SELECT COUNT(*) as total_backup FROM recording_urls_backup_20251110;

-- ====================================
-- 3. LIMPAR recording_url DUPLICADAS
-- ====================================

-- ⚠️ ATENÇÃO: Isso vai remover os links de áudio!
-- MAS previne que áudio errado seja reproduzido

-- Opção A: Limpar TODAS as URLs duplicadas
UPDATE calls
SET recording_url = NULL
WHERE recording_url IN (
    SELECT recording_url
    FROM calls
    WHERE recording_url IS NOT NULL
    GROUP BY recording_url
    HAVING COUNT(*) > 1
);

-- Opção B: Manter apenas a PRIMEIRA chamada com cada URL
-- (Mais conservador - mantém pelo menos 1)
/*
WITH primeira_chamada AS (
    SELECT DISTINCT ON (recording_url) 
        id,
        recording_url
    FROM calls
    WHERE recording_url IS NOT NULL
    ORDER BY recording_url, created_at ASC
)
UPDATE calls
SET recording_url = NULL
WHERE recording_url IN (
    SELECT recording_url
    FROM calls
    WHERE recording_url IS NOT NULL
    GROUP BY recording_url
    HAVING COUNT(*) > 1
)
AND id NOT IN (SELECT id FROM primeira_chamada);
*/

-- ====================================
-- 4. CONFERIR RESULTADO
-- ====================================

-- Não deve retornar nenhuma linha
SELECT 
    recording_url,
    COUNT(*) as total
FROM calls 
WHERE recording_url IS NOT NULL
GROUP BY recording_url
HAVING COUNT(*) > 1;

-- Estatísticas finais
SELECT 
    COUNT(*) as total_chamadas,
    COUNT(recording_url) as com_audio,
    COUNT(*) - COUNT(recording_url) as sem_audio
FROM calls;

-- ====================================
-- 🔄 ROLLBACK (se necessário)
-- ====================================
/*
UPDATE calls c
SET recording_url = b.recording_url
FROM recording_urls_backup_20251110 b
WHERE c.id = b.id;

DROP TABLE recording_urls_backup_20251110;
*/


