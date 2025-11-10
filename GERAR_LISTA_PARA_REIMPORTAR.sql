-- 📋 GERAR LISTA DE CHAMADAS PARA RE-IMPORTAR ÁUDIOS
-- Use esta lista para solicitar à API4COM/Chatwoot

-- ====================================
-- 1. ESTATÍSTICAS
-- ====================================
SELECT 
    COUNT(*) as total_sem_audio,
    MIN(created_at) as chamada_mais_antiga,
    MAX(created_at) as chamada_mais_recente
FROM calls 
WHERE recording_url IS NULL;

-- ====================================
-- 2. LISTA PARA SOLICITAR À API4COM
-- ====================================
-- Formato: ID | Empresa | Data | Telefone

SELECT 
    id,
    enterprise,
    person,
    from_number,
    to_number,
    created_at,
    duration
FROM calls 
WHERE recording_url IS NULL
ORDER BY created_at DESC;

-- ====================================
-- 3. EXPORTAR APENAS IDs (CSV simples)
-- ====================================
-- Cole os IDs em planilha para enviar à API4COM
SELECT id FROM calls WHERE recording_url IS NULL ORDER BY created_at DESC;

-- ====================================
-- 4. CHAMADAS RECENTES (Última semana)
-- ====================================
-- Priorizar chamadas recentes para re-importação
SELECT 
    id,
    enterprise,
    person,
    created_at,
    from_number,
    to_number
FROM calls 
WHERE recording_url IS NULL
  AND created_at >= NOW() - INTERVAL '7 days'
ORDER BY created_at DESC;

-- ====================================
-- 5. CHAMADAS COM ANÁLISE (Prioridade alta)
-- ====================================
-- Estas têm análise, seria bom ter áudio também
SELECT 
    c.id,
    c.enterprise,
    c.person,
    c.created_at,
    ca.final_grade
FROM calls c
INNER JOIN call_analysis ca ON ca.call_id = c.id
WHERE c.recording_url IS NULL
ORDER BY ca.final_grade DESC, c.created_at DESC
LIMIT 100;

-- ====================================
-- COMO USAR:
-- ====================================
/*
1. Execute query 2 ou 3 para pegar lista de IDs
2. Exporte para CSV ou copie os IDs
3. Envie para suporte API4COM/Chatwoot solicitando:
   
   "Olá, precisamos re-importar áudios de chamadas.
    Segue lista de IDs que precisam de recording_url:
    
    - 99bd7686-d1c3-4940-86ba-b1af7e78124d
    - 5dcaace9-6f34-4113-8616-6665d763ea19
    - ...
    
    Podem fornecer URLs corretas das gravações?"

4. Quando receberem URLs, atualizar banco:
   UPDATE calls SET recording_url = 'URL_NOVA' WHERE id = 'ID_CHAMADA';
*/

