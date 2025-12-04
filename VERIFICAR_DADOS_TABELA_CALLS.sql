-- 🔍 VERIFICAR como dados estão armazenados na tabela calls

-- ====================================
-- 1. VER ESTRUTURA DA TABELA
-- ====================================
SELECT 
    column_name,
    data_type,
    character_maximum_length
FROM information_schema.columns
WHERE table_name = 'calls'
  AND column_name IN ('transcription', 'recording_url', 'audio_bucket', 'audio_path')
ORDER BY ordinal_position;

-- ====================================
-- 2. EXEMPLO DE DADOS REAIS
-- ====================================
SELECT 
    id,
    enterprise,
    person,
    -- Transcrição (armazenada NO banco)
    LENGTH(transcription) as transcription_length,
    LEFT(transcription, 100) as transcription_preview,
    
    -- Áudio (URL externa)
    recording_url,
    
    -- Outros campos de áudio (se existirem)
    audio_bucket,
    audio_path,
    
    created_at
FROM calls 
WHERE id = '7275b82c-ee5f-4ded-90d7-4b43beffa8b0';

-- ====================================
-- 3. COMPARAR CHAMADAS COM MESMA URL
-- ====================================
-- Pegar recording_url da query acima e substituir abaixo:
/*
SELECT 
    id,
    enterprise,
    person,
    LEFT(transcription, 80) as transcription_preview,
    created_at
FROM calls 
WHERE recording_url = 'COLE_A_URL_AQUI'
ORDER BY created_at;
*/

-- ====================================
-- CONCLUSÃO:
-- ====================================
/*
- transcription: Salva DENTRO do PostgreSQL (TEXT)
- recording_url: Link para arquivo EXTERNO no CDN

Cada chamada tem SUA transcrição única
Mas múltiplas chamadas podem ter MESMA recording_url

Quando arquivo .mp3 é sobrescrito no CDN:
- Transcrição no banco não muda ✅
- URL no banco não muda ✅
- Mas arquivo .mp3 físico muda! ❌
*/


