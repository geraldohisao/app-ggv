-- 🔧 Sistema de Fila para Automações
-- Evitar execuções simultâneas e controlar ordem de execução

-- 1. Criar função para verificar se há automação em andamento
CREATE OR REPLACE FUNCTION check_automation_in_progress()
RETURNS BOOLEAN AS $$
DECLARE
    active_count INTEGER;
BEGIN
    -- Verificar se há registros com status 'pending' ou 'processing' nos últimos 30 minutos
    SELECT COUNT(*)::INTEGER INTO active_count
    FROM public.reactivated_leads 
    WHERE status IN ('pending', 'processing')
      AND created_at > NOW() - INTERVAL '30 minutes';
    
    -- Retornar TRUE se há automação ativa
    RETURN active_count > 0;
END;
$$ LANGUAGE plpgsql;

-- 2. Criar função para verificar se usuário pode executar automação
CREATE OR REPLACE FUNCTION can_user_execute_automation(p_sdr TEXT)
RETURNS TABLE(
    can_execute BOOLEAN,
    message TEXT,
    last_execution TIMESTAMPTZ,
    status TEXT
) AS $$
DECLARE
    automation_in_progress BOOLEAN;
    user_last_execution RECORD;
BEGIN
    -- Verificar se há automação geral em andamento
    SELECT check_automation_in_progress() INTO automation_in_progress;
    
    -- Buscar última execução do usuário
    SELECT 
        r.status,
        r.created_at,
        r.sdr
    INTO user_last_execution
    FROM public.reactivated_leads r
    WHERE r.sdr = p_sdr
    ORDER BY r.created_at DESC
    LIMIT 1;
    
    -- Lógica de validação
    IF automation_in_progress THEN
        -- Há automação em andamento
        can_execute := FALSE;
        message := 'Há uma automação em andamento. Aguarde a conclusão antes de executar outra.';
        last_execution := user_last_execution.created_at;
        status := user_last_execution.status;
    ELSIF user_last_execution.status = 'pending' THEN
        -- Usuário tem automação pendente
        can_execute := FALSE;
        message := 'Você tem uma automação pendente. Aguarde a conclusão.';
        last_execution := user_last_execution.created_at;
        status := user_last_execution.status;
    ELSIF user_last_execution.created_at > NOW() - INTERVAL '5 minutes' THEN
        -- Execução muito recente (cooldown)
        can_execute := FALSE;
        message := 'Aguarde 5 minutos entre execuções de automação.';
        last_execution := user_last_execution.created_at;
        status := user_last_execution.status;
    ELSE
        -- Pode executar
        can_execute := TRUE;
        message := 'Automação pode ser executada.';
        last_execution := user_last_execution.created_at;
        status := user_last_execution.status;
    END IF;
    
    RETURN NEXT;
END;
$$ LANGUAGE plpgsql;

-- 3. Criar função para marcar automação como iniciada (com lock)
CREATE OR REPLACE FUNCTION start_automation_with_lock(
    p_sdr TEXT,
    p_filter TEXT,
    p_cadence TEXT,
    p_workflow_id TEXT DEFAULT NULL
)
RETURNS TABLE(
    success BOOLEAN,
    record_id BIGINT,
    message TEXT
) AS $$
DECLARE
    can_execute_result RECORD;
    new_record_id BIGINT;
BEGIN
    -- Verificar se pode executar
    SELECT * INTO can_execute_result 
    FROM can_user_execute_automation(p_sdr) 
    LIMIT 1;
    
    IF NOT can_execute_result.can_execute THEN
        -- Não pode executar
        success := FALSE;
        record_id := NULL;
        message := can_execute_result.message;
        RETURN NEXT;
        RETURN;
    END IF;
    
    -- Pode executar - criar registro com lock
    INSERT INTO public.reactivated_leads (
        sdr,
        filter,
        status,
        count_leads,
        cadence,
        workflow_id,
        created_at,
        updated_at
    ) VALUES (
        p_sdr,
        p_filter,
        'pending',
        0,
        p_cadence,
        p_workflow_id,
        NOW(),
        NOW()
    ) RETURNING id INTO new_record_id;
    
    -- Retornar sucesso
    success := TRUE;
    record_id := new_record_id;
    message := 'Automação iniciada com sucesso.';
    RETURN NEXT;
END;
$$ LANGUAGE plpgsql;

-- 4. Criar função para finalizar automação
CREATE OR REPLACE FUNCTION complete_automation(
    p_record_id BIGINT,
    p_count_leads INTEGER DEFAULT 1,
    p_execution_id TEXT DEFAULT NULL,
    p_n8n_data JSONB DEFAULT '{}'::jsonb
)
RETURNS BOOLEAN AS $$
BEGIN
    UPDATE public.reactivated_leads 
    SET 
        status = 'completed',
        count_leads = p_count_leads,
        execution_id = p_execution_id,
        n8n_data = p_n8n_data,
        updated_at = NOW()
    WHERE id = p_record_id
      AND status = 'pending';
    
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql;

-- 5. Criar função para limpar automações órfãs (mais de 30 minutos pendentes)
CREATE OR REPLACE FUNCTION cleanup_orphaned_automations()
RETURNS INTEGER AS $$
DECLARE
    cleaned_count INTEGER;
BEGIN
    UPDATE public.reactivated_leads 
    SET 
        status = 'failed',
        error_message = 'Timeout - automação não concluída em 30 minutos',
        updated_at = NOW()
    WHERE status = 'pending'
      AND created_at < NOW() - INTERVAL '30 minutes';
    
    GET DIAGNOSTICS cleaned_count = ROW_COUNT;
    RETURN cleaned_count;
END;
$$ LANGUAGE plpgsql;

-- 6. Testar o sistema
SELECT 'TESTE 1: Verificar se Hiara pode executar automação' as teste;
SELECT * FROM can_user_execute_automation('Hiara Saienne');

SELECT 'TESTE 2: Verificar se há automação em progresso' as teste;
SELECT check_automation_in_progress() as automation_in_progress;

SELECT 'TESTE 3: Limpar automações órfãs' as teste;
SELECT cleanup_orphaned_automations() as cleaned_count;

-- 7. Mostrar status atual de todas as automações
SELECT 
    'STATUS ATUAL DAS AUTOMAÇÕES:' as info,
    sdr,
    status,
    created_at,
    updated_at,
    EXTRACT(EPOCH FROM (NOW() - created_at))/60 as minutes_ago
FROM public.reactivated_leads 
WHERE created_at > NOW() - INTERVAL '2 hours'
ORDER BY created_at DESC;
