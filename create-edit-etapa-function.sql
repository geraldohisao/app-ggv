-- 🔧 CRIAR: Função edit_call_etapa
-- Script para criar a função que permite editar a etapa (call_type) das ligações

-- 1. Remover função existente primeiro
DROP FUNCTION IF EXISTS public.edit_call_etapa CASCADE;

-- 2. Criar função edit_call_etapa
CREATE OR REPLACE FUNCTION public.edit_call_etapa(
    call_id_param UUID,
    new_etapa TEXT
)
RETURNS TABLE (
    success BOOLEAN,
    message TEXT,
    call_id UUID,
    old_etapa TEXT,
    new_etapa_value TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    old_call_type TEXT;
    updated_rows INTEGER;
BEGIN
    -- Verificar se a ligação existe
    SELECT call_type INTO old_call_type
    FROM calls 
    WHERE id = call_id_param;
    
    IF old_call_type IS NULL THEN
        RETURN QUERY SELECT FALSE, 'Ligação não encontrada', call_id_param, NULL::TEXT, new_etapa;
        RETURN;
    END IF;
    
    -- Atualizar call_type
    UPDATE calls 
    SET 
        call_type = new_etapa,
        updated_at = NOW()
    WHERE id = call_id_param;
    
    -- Verificar se a atualização funcionou
    GET DIAGNOSTICS updated_rows = ROW_COUNT;
    
    IF updated_rows > 0 THEN
        RETURN QUERY SELECT TRUE, 'Etapa atualizada com sucesso', call_id_param, old_call_type, new_etapa;
    ELSE
        RETURN QUERY SELECT FALSE, 'Erro ao atualizar etapa', call_id_param, old_call_type, new_etapa;
    END IF;
END;
$$;

-- 2. Conceder permissões
GRANT EXECUTE ON FUNCTION public.edit_call_etapa(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.edit_call_etapa(UUID, TEXT) TO service_role;

-- 3. Testar a função com a ligação da Hiara
SELECT 'Testando função edit_call_etapa:' as info;

-- Primeiro, verificar a ligação atual da Hiara
SELECT 'Ligação atual da Hiara:' as info;
SELECT 
    c.id,
    c.call_type,
    c.agent_id,
    c.created_at
FROM calls c
WHERE c.agent_id = 'Hiara Saienne'
ORDER BY c.created_at DESC
LIMIT 1;

-- Testar a função (comentado para não alterar dados)
-- SELECT * FROM edit_call_etapa('495aca80-b525-41e6-836e-0e9208e6c73b', 'Ligação');

-- 4. Verificar se a função foi criada
SELECT 'Função edit_call_etapa criada:' as info;
SELECT 
    routine_name,
    routine_type,
    data_type
FROM information_schema.routines 
WHERE routine_name = 'edit_call_etapa'
AND routine_schema = 'public';
