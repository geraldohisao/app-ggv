-- 21_automation_history.sql
-- Tabela para armazenar histórico de automações N8N

-- 1. Criar tabela de histórico de automações
CREATE TABLE IF NOT EXISTS public.automation_history (
    id TEXT PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    user_email TEXT NOT NULL,
    user_role TEXT NOT NULL DEFAULT 'USER',
    automation_type TEXT NOT NULL DEFAULT 'reativacao_leads',
    filtro TEXT NOT NULL,
    proprietario TEXT NOT NULL,
    cadencia TEXT NOT NULL,
    numero_negocio INTEGER NOT NULL DEFAULT 1,
    status TEXT NOT NULL DEFAULT 'started' CHECK (status IN ('started', 'completed', 'failed', 'cancelled')),
    error_message TEXT,
    n8n_response JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Índices para performance
CREATE INDEX IF NOT EXISTS idx_automation_history_user_id ON public.automation_history(user_id);
CREATE INDEX IF NOT EXISTS idx_automation_history_status ON public.automation_history(status);
CREATE INDEX IF NOT EXISTS idx_automation_history_workflow_id ON public.automation_history USING GIN ((n8n_response->>'workflowId'));
CREATE INDEX IF NOT EXISTS idx_automation_history_created_at ON public.automation_history(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_automation_history_real ON public.automation_history USING GIN ((n8n_response->>'real'));

-- 3. Habilitar RLS
ALTER TABLE public.automation_history ENABLE ROW LEVEL SECURITY;

-- 4. Políticas de segurança

-- Usuários podem ver apenas seus próprios registros
DROP POLICY IF EXISTS "Users can view own automation history" ON public.automation_history;
CREATE POLICY "Users can view own automation history" ON public.automation_history
    FOR SELECT USING (
        auth.uid() = user_id OR 
        public.is_admin()
    );

-- Usuários autenticados podem inserir registros
DROP POLICY IF EXISTS "Authenticated users can insert automation history" ON public.automation_history;
CREATE POLICY "Authenticated users can insert automation history" ON public.automation_history
    FOR INSERT WITH CHECK (
        auth.uid() = user_id OR 
        auth.uid() IS NOT NULL
    );

-- Usuários podem atualizar apenas seus próprios registros
DROP POLICY IF EXISTS "Users can update own automation history" ON public.automation_history;
CREATE POLICY "Users can update own automation history" ON public.automation_history
    FOR UPDATE USING (
        auth.uid() = user_id OR 
        public.is_admin()
    ) WITH CHECK (
        auth.uid() = user_id OR 
        public.is_admin()
    );

-- Service role pode fazer tudo (para webhooks N8N)
DROP POLICY IF EXISTS "Service role full access" ON public.automation_history;
CREATE POLICY "Service role full access" ON public.automation_history
    FOR ALL USING (true) WITH CHECK (true);

-- 5. Função para buscar histórico com paginação
CREATE OR REPLACE FUNCTION public.get_automation_history(
    p_page INTEGER DEFAULT 1,
    p_limit INTEGER DEFAULT 10,
    p_user_id UUID DEFAULT NULL
)
RETURNS TABLE (
    id TEXT,
    user_id UUID,
    user_email TEXT,
    user_role TEXT,
    automation_type TEXT,
    filtro TEXT,
    proprietario TEXT,
    cadencia TEXT,
    numero_negocio INTEGER,
    status TEXT,
    error_message TEXT,
    n8n_response JSONB,
    created_at TIMESTAMPTZ,
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
    
    -- Contar total de registros (respeitando RLS)
    SELECT COUNT(*) INTO total_records
    FROM public.automation_history ah
    WHERE (
        p_user_id IS NULL OR ah.user_id = p_user_id
    ) AND (
        auth.uid() = ah.user_id OR 
        public.is_admin() OR
        ah.user_id IS NULL -- Registros sem usuário (callbacks diretos do N8N)
    );
    
    -- Retornar registros paginados
    RETURN QUERY
    SELECT 
        ah.id,
        ah.user_id,
        ah.user_email,
        ah.user_role,
        ah.automation_type,
        ah.filtro,
        ah.proprietario,
        ah.cadencia,
        ah.numero_negocio,
        ah.status,
        ah.error_message,
        ah.n8n_response,
        ah.created_at,
        ah.updated_at,
        total_records
    FROM public.automation_history ah
    WHERE (
        p_user_id IS NULL OR ah.user_id = p_user_id
    ) AND (
        auth.uid() = ah.user_id OR 
        public.is_admin() OR
        ah.user_id IS NULL -- Registros sem usuário (callbacks diretos do N8N)
    )
    ORDER BY ah.created_at DESC
    LIMIT p_limit
    OFFSET offset_val;
END;
$$;

-- Grant para função
GRANT EXECUTE ON FUNCTION public.get_automation_history(INTEGER, INTEGER, UUID) TO authenticated, service_role;

-- 6. Função para salvar registro de automação
CREATE OR REPLACE FUNCTION public.save_automation_record(
    p_id TEXT,
    p_user_id UUID,
    p_user_email TEXT,
    p_user_role TEXT,
    p_automation_type TEXT,
    p_filtro TEXT,
    p_proprietario TEXT,
    p_cadencia TEXT,
    p_numero_negocio INTEGER,
    p_status TEXT,
    p_n8n_response JSONB
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
    record_id TEXT;
BEGIN
    -- Inserir ou atualizar registro
    INSERT INTO public.automation_history (
        id,
        user_id,
        user_email,
        user_role,
        automation_type,
        filtro,
        proprietario,
        cadencia,
        numero_negocio,
        status,
        n8n_response,
        created_at,
        updated_at
    ) VALUES (
        p_id,
        p_user_id,
        p_user_email,
        p_user_role,
        p_automation_type,
        p_filtro,
        p_proprietario,
        p_cadencia,
        p_numero_negocio,
        p_status,
        p_n8n_response,
        NOW(),
        NOW()
    )
    ON CONFLICT (id) DO UPDATE SET
        status = EXCLUDED.status,
        n8n_response = EXCLUDED.n8n_response,
        updated_at = NOW()
    RETURNING id INTO record_id;
    
    RETURN record_id;
END;
$$;

-- Grant para função
GRANT EXECUTE ON FUNCTION public.save_automation_record(TEXT, UUID, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, INTEGER, TEXT, JSONB) TO authenticated, service_role;

-- 7. Trigger para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION public.update_automation_history_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS automation_history_updated_at ON public.automation_history;
CREATE TRIGGER automation_history_updated_at
    BEFORE UPDATE ON public.automation_history
    FOR EACH ROW
    EXECUTE FUNCTION public.update_automation_history_updated_at();

-- 8. Comentários para documentação
COMMENT ON TABLE public.automation_history IS 'Histórico de execuções de automações N8N';
COMMENT ON COLUMN public.automation_history.id IS 'ID único do registro (formato: real_timestamp_random)';
COMMENT ON COLUMN public.automation_history.n8n_response IS 'Resposta completa do N8N incluindo workflowId, executionId, status, etc.';
COMMENT ON COLUMN public.automation_history.status IS 'Status atual da automação: started, completed, failed, cancelled';
COMMENT ON FUNCTION public.get_automation_history(INTEGER, INTEGER, UUID) IS 'Busca histórico de automações com paginação respeitando RLS';
COMMENT ON FUNCTION public.save_automation_record(TEXT, UUID, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, INTEGER, TEXT, JSONB) IS 'Salva ou atualiza registro de automação';
