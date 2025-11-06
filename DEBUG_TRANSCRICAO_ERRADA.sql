-- 🚨 DEBUG URGENTE: Transcrição/Análise de outra chamada

-- 1. VERIFICAR dados da chamada que você abriu
SELECT 
    id,
    enterprise,
    person,
    sdr_name,
    duration,
    duration_formated,
    LEFT(transcription, 200) as transcription_preview,
    created_at
FROM calls 
WHERE id = '9671164a-d697-41a2-abc2-22cbf2117370';

-- 2. VERIFICAR se a análise pertence a esta chamada
SELECT 
    ca.id as analysis_id,
    ca.call_id,
    ca.final_grade,
    ca.overall_score,
    ca.max_possible_score,
    ca.created_at as analysis_date,
    c.enterprise,
    c.person
FROM call_analysis ca
LEFT JOIN calls c ON c.id = ca.call_id
WHERE ca.call_id = '9671164a-d697-41a2-abc2-22cbf2117370';

-- 3. BUSCAR transcrição que menciona "Intercom" e "Well"
SELECT 
    id,
    enterprise,
    person,
    sdr_name,
    duration,
    LEFT(transcription, 200) as transcription_preview
FROM calls 
WHERE transcription ILIKE '%Well%'
  AND transcription ILIKE '%Intercom%'
  AND transcription ILIKE '%Mariana%'
LIMIT 5;

-- 4. VERIFICAR se existe análise duplicada ou trocada
SELECT 
    ca.id as analysis_id,
    ca.call_id,
    c1.enterprise as empresa_analise,
    c1.person as pessoa_analise,
    ca.final_grade
FROM call_analysis ca
LEFT JOIN calls c1 ON c1.id = ca.call_id
WHERE ca.call_id != '9671164a-d697-41a2-abc2-22cbf2117370'
  AND c1.transcription ILIKE '%Well%'
  AND c1.transcription ILIKE '%Intercom%'
LIMIT 5;

-- 5. TESTAR função get_call_detail
SELECT * FROM get_call_detail('9671164a-d697-41a2-abc2-22cbf2117370');

-- 6. VERIFICAR se há problema de JOIN na função
-- (Verificar código SQL da função get_call_detail)

-- 7. VERIFICAR análises recentes desta chamada específica
SELECT 
    ca.*,
    c.enterprise,
    c.person,
    LEFT(c.transcription, 100) as transcription_preview
FROM call_analysis ca
INNER JOIN calls c ON c.id = ca.call_id
WHERE ca.call_id = '9671164a-d697-41a2-abc2-22cbf2117370';

