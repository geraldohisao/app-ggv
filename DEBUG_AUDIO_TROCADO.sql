-- 🚨 DEBUG CRÍTICO: Áudio Trocado (URL aponta para outra chamada)

-- ====================================
-- 1. DADOS DA CHAMADA PROBLEMÁTICA
-- ====================================
SELECT 
    id,
    enterprise,
    person,
    duration,
    duration_formated,
    recording_url,
    LEFT(transcription, 200) as transcription_preview,
    created_at
FROM calls 
WHERE id = '7275b82c-ee5f-4ded-90d7-4b43beffa8b0';

-- ====================================
-- 2. VERIFICAR SE OUTRAS CHAMADAS TÊM MESMA URL
-- ====================================
-- Pegar recording_url da query acima e buscar:
-- SUBSTITUA 'URL_DO_AUDIO' pela URL retornada acima
/*
SELECT 
    id,
    enterprise,
    person,
    duration,
    recording_url,
    LEFT(transcription, 100) as transcription_preview
FROM calls 
WHERE recording_url = 'URL_DO_AUDIO'
ORDER BY created_at;
*/

-- ====================================
-- 3. PROCURAR PADRÃO DE URLs DUPLICADAS
-- ====================================
SELECT 
    recording_url,
    COUNT(*) as total_chamadas,
    STRING_AGG(DISTINCT enterprise, ', ') as empresas_diferentes,
    STRING_AGG(DISTINCT person, ', ') as pessoas_diferentes
FROM calls 
WHERE recording_url IS NOT NULL 
  AND recording_url != ''
GROUP BY recording_url
HAVING COUNT(*) > 1
ORDER BY COUNT(*) DESC
LIMIT 20;

-- ====================================
-- 4. VERIFICAR CHAMADAS COM ÁUDIO DUPLICADO
-- ====================================
WITH duplicated_urls AS (
    SELECT recording_url
    FROM calls 
    WHERE recording_url IS NOT NULL 
      AND recording_url != ''
    GROUP BY recording_url
    HAVING COUNT(*) > 1
)
SELECT 
    c.id,
    c.enterprise,
    c.person,
    c.duration,
    c.recording_url,
    c.created_at
FROM calls c
INNER JOIN duplicated_urls du ON c.recording_url = du.recording_url
ORDER BY c.recording_url, c.created_at
LIMIT 50;

-- ====================================
-- 5. ANÁLISE DESTA CHAMADA
-- ====================================
SELECT 
    ca.id as analysis_id,
    ca.call_id,
    ca.final_grade,
    ca.scorecard_name,
    ca.created_at
FROM call_analysis ca
WHERE ca.call_id = '7275b82c-ee5f-4ded-90d7-4b43beffa8b0';

-- ====================================
-- INTERPRETAÇÃO:
-- ====================================
/*
Se Query 3 retornar resultados:
→ Há múltiplas chamadas usando a mesma URL de áudio
→ Bug de importação/sincronização de dados
→ Precisa limpar/corrigir URLs duplicadas

Se Query 3 retornar vazio:
→ URL é única
→ Mas áudio não bate com transcrição
→ Problema na geração/upload do áudio
*/

