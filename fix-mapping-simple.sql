-- Script Simples para Corrigir Mapeamento de Usuários
-- Cole este script diretamente no SQL Editor do Supabase

-- Verificar usuários reais na tabela profiles
SELECT 'USUÁRIOS REAIS' as status;
SELECT id, full_name, email FROM profiles WHERE full_name IS NOT NULL ORDER BY full_name;

-- Limpar user_mapping atual
DELETE FROM user_mapping;

-- Inserir usuários reais no user_mapping
INSERT INTO user_mapping (agent_id, full_name, email, created_at)
SELECT 
    p.id::TEXT,
    p.full_name,
    p.email,
    NOW()
FROM profiles p
WHERE p.full_name IS NOT NULL 
  AND p.full_name != ''
  AND p.full_name NOT LIKE 'Usuário%';

-- Atualizar chamadas da Andressa
UPDATE calls 
SET agent_id = (SELECT id::TEXT FROM profiles WHERE full_name ILIKE '%andressa%' LIMIT 1),
    sdr_name = 'Andressa'
WHERE agent_id IN ('1018', 'Andressa') OR sdr_name ILIKE '%andressa%';

-- Atualizar chamadas da Isabel
UPDATE calls 
SET agent_id = (SELECT id::TEXT FROM profiles WHERE full_name ILIKE '%isabel%' LIMIT 1),
    sdr_name = (SELECT full_name FROM profiles WHERE full_name ILIKE '%isabel%' LIMIT 1)
WHERE agent_id IN ('1003', 'Isabel') OR sdr_name ILIKE '%isabel%';

-- Atualizar chamadas da Mariana
UPDATE calls 
SET agent_id = (SELECT id::TEXT FROM profiles WHERE full_name ILIKE '%mariana%' LIMIT 1),
    sdr_name = (SELECT full_name FROM profiles WHERE full_name ILIKE '%mariana%' LIMIT 1)
WHERE agent_id IN ('1011', 'Mariana') OR sdr_name ILIKE '%mariana%';

-- Atualizar chamadas da Camila
UPDATE calls 
SET agent_id = (SELECT id::TEXT FROM profiles WHERE full_name ILIKE '%camila%' LIMIT 1),
    sdr_name = (SELECT full_name FROM profiles WHERE full_name ILIKE '%camila%' LIMIT 1)
WHERE agent_id IN ('1001', 'Camila') OR sdr_name ILIKE '%camila%';

-- Atualizar chamadas da Lô-Ruama
UPDATE calls 
SET agent_id = (SELECT id::TEXT FROM profiles WHERE full_name ILIKE '%ruama%' LIMIT 1),
    sdr_name = (SELECT full_name FROM profiles WHERE full_name ILIKE '%ruama%' LIMIT 1)
WHERE agent_id IN ('1017', 'Lo-Ruama') OR sdr_name ILIKE '%ruama%';

-- Atualizar função get_mapped_users para usar apenas profiles
CREATE OR REPLACE FUNCTION get_mapped_users()
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
    ORDER BY call_counts.total DESC NULLS LAST, p.full_name ASC;
END;
$$ LANGUAGE plpgsql;

-- Verificar resultado final
SELECT 'RESULTADO FINAL' as status;
SELECT * FROM get_mapped_users();

-- Testar chamadas da Andressa
SELECT 'CHAMADAS DA ANDRESSA' as status;
SELECT COUNT(*) as total_calls, agent_id, sdr_name
FROM calls 
WHERE agent_id = (SELECT id::TEXT FROM profiles WHERE full_name ILIKE '%andressa%' LIMIT 1)
GROUP BY agent_id, sdr_name;
