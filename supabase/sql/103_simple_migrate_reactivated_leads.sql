-- 103_simple_migrate_reactivated_leads.sql
-- Migração simplificada para adicionar colunas faltantes na tabela reactivated_leads

-- 1. Adicionar colunas faltantes (uma por vez para evitar erros)
ALTER TABLE public.reactivated_leads ADD COLUMN IF NOT EXISTS workflow_id TEXT;
ALTER TABLE public.reactivated_leads ADD COLUMN IF NOT EXISTS execution_id TEXT;
ALTER TABLE public.reactivated_leads ADD COLUMN IF NOT EXISTS n8n_data JSONB DEFAULT '{}';
ALTER TABLE public.reactivated_leads ADD COLUMN IF NOT EXISTS error_message TEXT;
ALTER TABLE public.reactivated_leads ADD COLUMN IF NOT EXISTS cadence TEXT;

-- 2. Atualizar constraint de status se necessário
ALTER TABLE public.reactivated_leads DROP CONSTRAINT IF EXISTS reactivated_leads_status_check;
ALTER TABLE public.reactivated_leads ADD CONSTRAINT reactivated_leads_status_check 
CHECK (status IN ('pending', 'processing', 'completed', 'failed'));

-- 3. Criar índices
CREATE INDEX IF NOT EXISTS idx_reactivated_leads_sdr ON public.reactivated_leads(sdr);
CREATE INDEX IF NOT EXISTS idx_reactivated_leads_status ON public.reactivated_leads(status);
CREATE INDEX IF NOT EXISTS idx_reactivated_leads_created_at ON public.reactivated_leads(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_reactivated_leads_workflow_id ON public.reactivated_leads(workflow_id);

-- 4. Habilitar RLS
ALTER TABLE public.reactivated_leads ENABLE ROW LEVEL SECURITY;

-- 5. Políticas de segurança
DROP POLICY IF EXISTS "Authenticated users can view reactivated leads" ON public.reactivated_leads;
CREATE POLICY "Authenticated users can view reactivated leads" ON public.reactivated_leads
    FOR SELECT USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Admins can insert reactivated leads" ON public.reactivated_leads;
CREATE POLICY "Admins can insert reactivated leads" ON public.reactivated_leads
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role IN ('SUPER_ADMIN', 'ADMIN')
        )
    );

DROP POLICY IF EXISTS "Admins can update reactivated leads" ON public.reactivated_leads;
CREATE POLICY "Admins can update reactivated leads" ON public.reactivated_leads
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role IN ('SUPER_ADMIN', 'ADMIN')
        )
    );

DROP POLICY IF EXISTS "Service role full access reactivated leads" ON public.reactivated_leads;
CREATE POLICY "Service role full access reactivated leads" ON public.reactivated_leads
    FOR ALL USING (true) WITH CHECK (true);

-- 6. Função para buscar histórico
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
    offset_val := (p_page - 1) * p_limit;
    
    SELECT COUNT(*) INTO total_records
    FROM public.reactivated_leads rl
    WHERE (p_sdr IS NULL OR rl.sdr = p_sdr)
    AND (p_status IS NULL OR rl.status = p_status);
    
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

GRANT EXECUTE ON FUNCTION public.get_reactivated_leads_history(INTEGER, INTEGER, TEXT, TEXT) TO authenticated, service_role;

-- 7. Função para inserir/atualizar
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
        
        IF record_id IS NOT NULL THEN
            RETURN record_id;
        END IF;
    END IF;
    
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

GRANT EXECUTE ON FUNCTION public.upsert_reactivated_lead(TEXT, TEXT, TEXT, INTEGER, TEXT, TEXT, TEXT, JSONB, TEXT) TO authenticated, service_role;

-- 8. Trigger para updated_at
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

-- 9. Comentários
COMMENT ON TABLE public.reactivated_leads IS 'Histórico de reativação de leads com dados do N8N';
COMMENT ON COLUMN public.reactivated_leads.workflow_id IS 'ID do workflow N8N';
COMMENT ON COLUMN public.reactivated_leads.execution_id IS 'ID da execução N8N';
COMMENT ON COLUMN public.reactivated_leads.n8n_data IS 'Dados completos retornados pelo N8N';

-- Verificação final simples
SELECT 'Migração concluída! Tabela possui ' || COUNT(*) || ' colunas.' as resultado
FROM information_schema.columns 
WHERE table_name = 'reactivated_leads' 
AND table_schema = 'public';
