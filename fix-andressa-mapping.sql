-- Script para corrigir o mapeamento da Andressa
-- Execute este script no Supabase SQL Editor

-- =========================================
-- ETAPA 1: VERIFICAR DADOS ATUAIS
-- =========================================

-- Verificar dados na tabela profiles
SELECT 'VERIFICANDO TABELA PROFILES' as status;
SELECT id, full_name, email, created_at 
FROM profiles 
WHERE full_name ILIKE '%andressa%' OR email ILIKE '%andressa%'
ORDER BY created_at DESC;

-- Verificar dados na tabela user_mapping
SELECT 'VERIFICANDO TABELA USER_MAPPING' as status;
SELECT agent_id, full_name, email, created_at 
FROM user_mapping 
WHERE full_name ILIKE '%andressa%' OR email ILIKE '%andressa%'
ORDER BY created_at DESC;

-- Verificar dados na tabela calls
SELECT 'VERIFICANDO TABELA CALLS' as status;
SELECT agent_id, sdr_name, sdr_id, created_at 
FROM calls 
WHERE sdr_name ILIKE '%andressa%' OR agent_id ILIKE '%andressa%'
ORDER BY created_at DESC
LIMIT 10;

-- =========================================
-- ETAPA 2: INSERIR/ATUALIZAR ANDRESSA
-- =========================================

-- Inserir Andressa na tabela user_mapping se não existir
INSERT INTO user_mapping (
    agent_id,
    full_name,
    email,
    created_at
)
VALUES (
    'Andressa',
    'Andressa',
    'andressa@grupo-ggv.com',
    now()
)
ON CONFLICT (agent_id) 
DO UPDATE SET 
    full_name = EXCLUDED.full_name,
    email = EXCLUDED.email;

-- =========================================
-- ETAPA 3: ATUALIZAR CHAMADAS DA ANDRESSA
-- =========================================

-- Atualizar chamadas que têm agent_id = 'Andressa' para usar o nome correto
UPDATE calls 
SET sdr_name = 'Andressa'
WHERE agent_id = 'Andressa' 
  AND (sdr_name IS NULL OR sdr_name != 'Andressa');

-- =========================================
-- ETAPA 4: VERIFICAÇÃO FINAL
-- =========================================

-- Verificar se a Andressa foi inserida corretamente
SELECT 'VERIFICAÇÃO FINAL - USER_MAPPING' as status;
SELECT agent_id, full_name, email 
FROM user_mapping 
WHERE full_name ILIKE '%andressa%' OR agent_id ILIKE '%andressa%';

-- Verificar chamadas da Andressa
SELECT 'VERIFICAÇÃO FINAL - CALLS' as status;
SELECT 
    agent_id,
    sdr_name,
    COUNT(*) as total_calls,
    MIN(created_at) as primeira_chamada,
    MAX(created_at) as ultima_chamada
FROM calls 
WHERE agent_id = 'Andressa' OR sdr_name ILIKE '%andressa%'
GROUP BY agent_id, sdr_name;

-- Resumo final
SELECT '🎉 MAPEAMENTO DA ANDRESSA CONCLUÍDO!' as message
UNION ALL
SELECT '✅ Andressa inserida na tabela user_mapping'
UNION ALL
SELECT '✅ Chamadas atualizadas com nome correto'
UNION ALL
SELECT '✅ Sistema pronto para uso!';
