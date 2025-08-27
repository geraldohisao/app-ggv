-- Script Direto para Corrigir Usuários Duplicados
-- Cole este script completo no SQL Editor do Supabase

-- Limpar tabelas existentes
DROP TABLE IF EXISTS manual_user_mapping CASCADE;
DELETE FROM user_mapping;

-- Criar tabela de mapeamento limpa
CREATE TABLE manual_user_mapping (
    voip_code TEXT PRIMARY KEY,
    real_name TEXT NOT NULL,
    profile_uuid TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Inserir mapeamentos diretos
INSERT INTO manual_user_mapping (voip_code, real_name, profile_uuid) VALUES
('1018', 'Andressa', (SELECT id::TEXT FROM profiles WHERE full_name ILIKE '%andressa%' LIMIT 1)),
('1003', 'Isabel Pestilho', (SELECT id::TEXT FROM profiles WHERE full_name ILIKE '%isabel%' LIMIT 1)),
('1011', 'Mariana', (SELECT id::TEXT FROM profiles WHERE full_name ILIKE '%mariana%' LIMIT 1)),
('1001', 'Camila Ataliba', (SELECT id::TEXT FROM profiles WHERE full_name ILIKE '%camila%' LIMIT 1)),
('1017', 'Lô-Ruama Oliveira', (SELECT id::TEXT FROM profiles WHERE full_name ILIKE '%ruama%' LIMIT 1));

-- Atualizar chamadas com códigos 1018 para Andressa
UPDATE calls 
SET agent_id = (SELECT profile_uuid FROM manual_user_mapping WHERE voip_code = '1018'),
    sdr_name = 'Andressa'
WHERE agent_id = '1018' OR sdr_name ILIKE '%andressa%';

-- Atualizar chamadas com códigos 1003 para Isabel
UPDATE calls 
SET agent_id = (SELECT profile_uuid FROM manual_user_mapping WHERE voip_code = '1003'),
    sdr_name = 'Isabel Pestilho'
WHERE agent_id = '1003' OR sdr_name ILIKE '%isabel%';

-- Atualizar chamadas com códigos 1011 para Mariana
UPDATE calls 
SET agent_id = (SELECT profile_uuid FROM manual_user_mapping WHERE voip_code = '1011'),
    sdr_name = 'Mariana'
WHERE agent_id = '1011' OR sdr_name ILIKE '%mariana%';

-- Atualizar chamadas com códigos 1001 para Camila
UPDATE calls 
SET agent_id = (SELECT profile_uuid FROM manual_user_mapping WHERE voip_code = '1001'),
    sdr_name = 'Camila Ataliba'
WHERE agent_id = '1001' OR sdr_name ILIKE '%camila%';

-- Atualizar chamadas com códigos 1017 para Lô-Ruama
UPDATE calls 
SET agent_id = (SELECT profile_uuid FROM manual_user_mapping WHERE voip_code = '1017'),
    sdr_name = 'Lô-Ruama Oliveira'
WHERE agent_id = '1017' OR sdr_name ILIKE '%ruama%';

-- Criar função única para usuários
CREATE OR REPLACE FUNCTION get_unique_users_with_calls()
RETURNS TABLE(
    id TEXT,
    name TEXT,
    email TEXT,
    call_count BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.id::TEXT as id,
        p.full_name as name,
        p.email,
        COALESCE(call_counts.total, 0) as call_count
    FROM profiles p
    LEFT JOIN (
        SELECT 
            agent_id,
            COUNT(*) as total
        FROM calls 
        WHERE agent_id IS NOT NULL
        GROUP BY agent_id
    ) call_counts ON p.id::TEXT = call_counts.agent_id
    WHERE p.full_name IS NOT NULL 
      AND p.full_name != ''
      AND p.full_name NOT LIKE 'Usuário%'
      AND call_counts.total > 0
    ORDER BY call_counts.total DESC, p.full_name ASC;
END;
$$ LANGUAGE plpgsql;

-- Dar permissões
GRANT EXECUTE ON FUNCTION get_unique_users_with_calls() TO authenticated;

-- Verificar resultado
SELECT 'USUÁRIOS ÚNICOS' as status;
SELECT * FROM get_unique_users_with_calls();

-- Verificar chamadas da Camila
SELECT 'CHAMADAS DA CAMILA' as status;
SELECT COUNT(*) as total_chamadas
FROM calls 
WHERE agent_id = (SELECT profile_uuid FROM manual_user_mapping WHERE real_name = 'Camila Ataliba');

SELECT 'CONCLUÍDO!' as status;
