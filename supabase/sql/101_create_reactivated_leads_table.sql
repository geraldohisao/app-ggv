-- 101_create_reactivated_leads_table.sql
-- Criar tabela reactivated_leads para histórico de reativação com dados do N8N

-- 1. Criar tabela reactivated_leads
CREATE TABLE IF NOT EXISTS public.reactivated_leads (
    id SERIAL PRIMARY KEY,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    sdr TEXT NOT NULL,
    filter TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
    count_leads INTEGER DEFAULT 0,
    cadence TEXT,
    workflow_id TEXT,
    execution_id TEXT,
    n8n_data JSONB DEFAULT '{}',
    error_message TEXT,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Índices para performance
CREATE INDEX IF NOT EXISTS idx_reactivated_leads_sdr ON public.reactivated_leads(sdr);
CREATE INDEX IF NOT EXISTS idx_reactivated_leads_status ON public.reactivated_leads(status);
CREATE INDEX IF NOT EXISTS idx_reactivated_leads_created_at ON public.reactivated_leads(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_reactivated_leads_workflow_id ON public.reactivated_leads(workflow_id);

-- 3. Habilitar RLS
ALTER TABLE public.reactivated_leads ENABLE ROW LEVEL SECURITY;

-- 4. Políticas de segurança

-- Todos os usuários autenticados podem ver registros
DROP POLICY IF EXISTS "Authenticated users can view reactivated leads" ON public.reactivated_leads;
CREATE POLICY "Authenticated users can view reactivated leads" ON public.reactivated_leads
    FOR SELECT USING (auth.uid() IS NOT NULL);

-- Apenas admins podem inserir registros
DROP POLICY IF EXISTS "Admins can insert reactivated leads" ON public.reactivated_leads;
CREATE POLICY "Admins can insert reactivated leads" ON public.reactivated_leads
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role IN ('SUPER_ADMIN', 'ADMIN')
        )
    );

-- Apenas admins podem atualizar registros
DROP POLICY IF EXISTS "Admins can update reactivated leads" ON public.reactivated_leads;
CREATE POLICY "Admins can update reactivated leads" ON public.reactivated_leads
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role IN ('SUPER_ADMIN', 'ADMIN')
        )
    );

-- Service role pode fazer tudo (para webhooks N8N)
DROP POLICY IF EXISTS "Service role full access reactivated leads" ON public.reactivated_leads;
CREATE POLICY "Service role full access reactivated leads" ON public.reactivated_leads
    FOR ALL USING (true) WITH CHECK (true);

-- 5. Função para buscar histórico de reativação com paginação
CREATE OR REPLACE FUNCTION public.get_reactivated_leads_history(
    p_page INTEGER DEFAULT 1,
    p_limit INTEGER DEFAULT 10,
    p_sdr TEXT DEFAULT NULL,
    p_status TEXT DEFAULT NULL
)
RETURNS TABLE (
    id INTEGER,
    created_at TIMESTAMPTZ,
    sdr TEXT,
    filter TEXT,
    status TEXT,
    count_leads INTEGER,
    cadence TEXT,
    workflow_id TEXT,
    execution_id TEXT,
    n8n_data JSONB,
    error_message TEXT,
    updated_at TIMESTAMPTZ,
    total_count BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
    offset_val INTEGER;
    total_records BIGINT;
BEGIN
    -- Calcular offset
    offset_val := (p_page - 1) * p_limit;
    
    -- Contar total de registros
    SELECT COUNT(*) INTO total_records
    FROM public.reactivated_leads rl
    WHERE (p_sdr IS NULL OR rl.sdr = p_sdr)
    AND (p_status IS NULL OR rl.status = p_status);
    
    -- Retornar registros paginados
    RETURN QUERY
    SELECT 
        rl.id,
        rl.created_at,
        rl.sdr,
        rl.filter,
        rl.status,
        rl.count_leads,
        rl.cadence,
        rl.workflow_id,
        rl.execution_id,
        rl.n8n_data,
        rl.error_message,
        rl.updated_at,
        total_records
    FROM public.reactivated_leads rl
    WHERE (p_sdr IS NULL OR rl.sdr = p_sdr)
    AND (p_status IS NULL OR rl.status = p_status)
    ORDER BY rl.created_at DESC
    LIMIT p_limit
    OFFSET offset_val;
END;
$$;

-- Grant para função
GRANT EXECUTE ON FUNCTION public.get_reactivated_leads_history(INTEGER, INTEGER, TEXT, TEXT) TO authenticated, service_role;

-- 6. Função para inserir/atualizar registro de reativação
CREATE OR REPLACE FUNCTION public.upsert_reactivated_lead(
    p_sdr TEXT,
    p_filter TEXT,
    p_status TEXT,
    p_count_leads INTEGER DEFAULT 0,
    p_cadence TEXT DEFAULT NULL,
    p_workflow_id TEXT DEFAULT NULL,
    p_execution_id TEXT DEFAULT NULL,
    p_n8n_data JSONB DEFAULT '{}',
    p_error_message TEXT DEFAULT NULL
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
    record_id INTEGER;
BEGIN
    -- Se temos workflow_id, tentar atualizar registro existente
    IF p_workflow_id IS NOT NULL THEN
        UPDATE public.reactivated_leads 
        SET 
            status = p_status,
            count_leads = COALESCE(p_count_leads, count_leads),
            execution_id = COALESCE(p_execution_id, execution_id),
            n8n_data = COALESCE(p_n8n_data, n8n_data),
            error_message = p_error_message,
            updated_at = NOW()
        WHERE workflow_id = p_workflow_id
        RETURNING id INTO record_id;
        
        -- Se encontrou e atualizou, retornar o ID
        IF record_id IS NOT NULL THEN
            RETURN record_id;
        END IF;
    END IF;
    
    -- Caso contrário, inserir novo registro
    INSERT INTO public.reactivated_leads (
        sdr,
        filter,
        status,
        count_leads,
        cadence,
        workflow_id,
        execution_id,
        n8n_data,
        error_message,
        created_at,
        updated_at
    ) VALUES (
        p_sdr,
        p_filter,
        p_status,
        p_count_leads,
        p_cadence,
        p_workflow_id,
        p_execution_id,
        p_n8n_data,
        p_error_message,
        NOW(),
        NOW()
    )
    RETURNING id INTO record_id;
    
    RETURN record_id;
END;
$$;

-- Grant para função
GRANT EXECUTE ON FUNCTION public.upsert_reactivated_lead(TEXT, TEXT, TEXT, INTEGER, TEXT, TEXT, TEXT, JSONB, TEXT) TO authenticated, service_role;

-- 7. Trigger para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION public.update_reactivated_leads_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS reactivated_leads_updated_at ON public.reactivated_leads;
CREATE TRIGGER reactivated_leads_updated_at
    BEFORE UPDATE ON public.reactivated_leads
    FOR EACH ROW
    EXECUTE FUNCTION public.update_reactivated_leads_updated_at();

-- 8. Comentários para documentação
COMMENT ON TABLE public.reactivated_leads IS 'Histórico de reativação de leads com dados do N8N';
COMMENT ON COLUMN public.reactivated_leads.sdr IS 'Nome do SDR responsável pela reativação';
COMMENT ON COLUMN public.reactivated_leads.filter IS 'Filtro usado na reativação (ex: Lista de reativação - Topo de funil)';
COMMENT ON COLUMN public.reactivated_leads.status IS 'Status da reativação: pending, processing, completed, failed';
COMMENT ON COLUMN public.reactivated_leads.count_leads IS 'Quantidade de leads processados';
COMMENT ON COLUMN public.reactivated_leads.cadence IS 'Cadência utilizada na reativação';
COMMENT ON COLUMN public.reactivated_leads.workflow_id IS 'ID do workflow N8N';
COMMENT ON COLUMN public.reactivated_leads.execution_id IS 'ID da execução N8N';
COMMENT ON COLUMN public.reactivated_leads.n8n_data IS 'Dados completos retornados pelo N8N';
COMMENT ON FUNCTION public.get_reactivated_leads_history(INTEGER, INTEGER, TEXT, TEXT) IS 'Busca histórico de reativação com paginação e filtros';
COMMENT ON FUNCTION public.upsert_reactivated_lead(TEXT, TEXT, TEXT, INTEGER, TEXT, TEXT, TEXT, JSONB, TEXT) IS 'Insere ou atualiza registro de reativação';
