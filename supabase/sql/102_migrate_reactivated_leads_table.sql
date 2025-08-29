-- 102_migrate_reactivated_leads_table.sql
-- Migração para adicionar colunas faltantes na tabela reactivated_leads

-- 1. Verificar se a tabela existe e adicionar colunas faltantes
DO $$
BEGIN
    -- Adicionar coluna workflow_id se não existir
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'reactivated_leads' 
        AND column_name = 'workflow_id'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE public.reactivated_leads ADD COLUMN workflow_id TEXT;
        RAISE NOTICE 'Coluna workflow_id adicionada';
    ELSE
        RAISE NOTICE 'Coluna workflow_id já existe';
    END IF;

    -- Adicionar coluna execution_id se não existir
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'reactivated_leads' 
        AND column_name = 'execution_id'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE public.reactivated_leads ADD COLUMN execution_id TEXT;
        RAISE NOTICE 'Coluna execution_id adicionada';
    ELSE
        RAISE NOTICE 'Coluna execution_id já existe';
    END IF;

    -- Adicionar coluna n8n_data se não existir
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'reactivated_leads' 
        AND column_name = 'n8n_data'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE public.reactivated_leads ADD COLUMN n8n_data JSONB DEFAULT '{}';
        RAISE NOTICE 'Coluna n8n_data adicionada';
    ELSE
        RAISE NOTICE 'Coluna n8n_data já existe';
    END IF;

    -- Adicionar coluna error_message se não existir
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'reactivated_leads' 
        AND column_name = 'error_message'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE public.reactivated_leads ADD COLUMN error_message TEXT;
        RAISE NOTICE 'Coluna error_message adicionada';
    ELSE
        RAISE NOTICE 'Coluna error_message já existe';
    END IF;

    -- Adicionar coluna cadence se não existir
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'reactivated_leads' 
        AND column_name = 'cadence'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE public.reactivated_leads ADD COLUMN cadence TEXT;
        RAISE NOTICE 'Coluna cadence adicionada';
    ELSE
        RAISE NOTICE 'Coluna cadence já existe';
    END IF;

    -- Verificar se coluna status tem constraint correto
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.check_constraints cc
        JOIN information_schema.constraint_column_usage ccu ON cc.constraint_name = ccu.constraint_name
        WHERE ccu.table_name = 'reactivated_leads' 
        AND ccu.column_name = 'status'
        AND cc.check_clause LIKE '%pending%'
        AND table_schema = 'public'
    ) THEN
        -- Remover constraint antigo se existir
        ALTER TABLE public.reactivated_leads DROP CONSTRAINT IF EXISTS reactivated_leads_status_check;
        
        -- Adicionar novo constraint
        ALTER TABLE public.reactivated_leads ADD CONSTRAINT reactivated_leads_status_check 
        CHECK (status IN ('pending', 'processing', 'completed', 'failed'));
        
        RAISE NOTICE 'Constraint de status atualizado';
    ELSE
        RAISE NOTICE 'Constraint de status já correto';
    END IF;

END $$;

-- 2. Criar índices se não existirem
CREATE INDEX IF NOT EXISTS idx_reactivated_leads_sdr ON public.reactivated_leads(sdr);
CREATE INDEX IF NOT EXISTS idx_reactivated_leads_status ON public.reactivated_leads(status);
CREATE INDEX IF NOT EXISTS idx_reactivated_leads_created_at ON public.reactivated_leads(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_reactivated_leads_workflow_id ON public.reactivated_leads(workflow_id);

-- 3. Habilitar RLS se não estiver habilitado
ALTER TABLE public.reactivated_leads ENABLE ROW LEVEL SECURITY;

-- 4. Recriar políticas de segurança (DROP IF EXISTS + CREATE)

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

-- 5. Recriar função para buscar histórico de reativação com paginação
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

-- 6. Recriar função para inserir/atualizar registro de reativação
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

-- 7. Recriar trigger para atualizar updated_at automaticamente
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

-- 8. Atualizar comentários para documentação
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

-- 9. Verificar estrutura final da tabela
DO $$
DECLARE
    col_count INTEGER;
    col_name TEXT;
BEGIN
    SELECT COUNT(*) INTO col_count
    FROM information_schema.columns 
    WHERE table_name = 'reactivated_leads' 
    AND table_schema = 'public';
    
    RAISE NOTICE 'Tabela reactivated_leads possui % colunas', col_count;
    
    -- Listar colunas existentes
    FOR col_name IN 
        SELECT column_name FROM information_schema.columns 
        WHERE table_name = 'reactivated_leads' 
        AND table_schema = 'public'
        ORDER BY ordinal_position
    LOOP
        RAISE NOTICE 'Coluna: %', col_name;
    END LOOP;
    
    RAISE NOTICE 'Migração da tabela reactivated_leads concluída com sucesso!';
END $$;
