-- =========================================
-- SCHEMA PARA SISTEMA DE GERENCIAMENTO DE OS
-- (Ordens de Serviço com Assinatura Eletrônica)
-- =========================================
-- Inspirado em ClickSign e Autentique
-- Execute este script no SQL Editor do Supabase

-- Habilitar extensões necessárias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =========================================
-- 1. TABELA DE ORDENS DE SERVIÇO
-- =========================================

CREATE TABLE IF NOT EXISTS service_orders (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    
    -- Informações básicas do documento
    title TEXT NOT NULL,
    description TEXT,
    
    -- Arquivo PDF
    file_name TEXT NOT NULL,
    file_path TEXT NOT NULL,                    -- Caminho no bucket do Supabase Storage
    file_size BIGINT,                           -- Tamanho em bytes
    file_url TEXT,                              -- URL pública (se aplicável)
    file_hash TEXT,                             -- Hash SHA-256 do arquivo para integridade
    
    -- Status e controle
    status TEXT NOT NULL DEFAULT 'DRAFT' CHECK (
        status IN ('DRAFT', 'PENDING', 'PARTIAL_SIGNED', 'COMPLETED', 'CANCELLED', 'EXPIRED')
    ),
    
    -- Criador
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_by_name TEXT,                       -- Cache do nome para performance
    
    -- Contadores (denormalizado para performance)
    total_signers INTEGER DEFAULT 0,
    signed_count INTEGER DEFAULT 0,
    
    -- Controle de tempo
    expires_at TIMESTAMP WITH TIME ZONE,        -- Data de expiração do documento
    completed_at TIMESTAMP WITH TIME ZONE,      -- Data de conclusão (todos assinaram)
    
    -- Metadados
    metadata JSONB DEFAULT '{}',                -- Campos extras flexíveis
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =========================================
-- 2. TABELA DE ASSINANTES
-- =========================================

CREATE TABLE IF NOT EXISTS os_signers (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    
    -- Relacionamento com OS
    os_id UUID REFERENCES service_orders(id) ON DELETE CASCADE NOT NULL,
    
    -- Informações do assinante
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    role TEXT DEFAULT 'Colaborador',            -- Ex: "Colaborador", "Gestor", "Testemunha"
    
    -- Status da assinatura
    status TEXT NOT NULL DEFAULT 'PENDING' CHECK (
        status IN ('PENDING', 'SIGNED', 'REFUSED', 'EXPIRED')
    ),
    
    -- Dados da assinatura
    signed_at TIMESTAMP WITH TIME ZONE,
    ip_address INET,                            -- IP de onde foi assinado
    user_agent TEXT,                            -- Navegador/dispositivo usado
    signature_hash TEXT,                        -- Hash da assinatura digital
    signature_data JSONB,                       -- Dados extras da assinatura
    
    -- Ordem de assinatura (para fluxos sequenciais)
    order_index INTEGER DEFAULT 0,
    
    -- Notificações
    last_reminder_sent_at TIMESTAMP WITH TIME ZONE,
    reminder_count INTEGER DEFAULT 0,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =========================================
-- 3. TABELA DE HISTÓRICO/AUDITORIA
-- =========================================

CREATE TABLE IF NOT EXISTS os_audit_log (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    
    -- Relacionamento
    os_id UUID REFERENCES service_orders(id) ON DELETE CASCADE,
    signer_id UUID REFERENCES os_signers(id) ON DELETE CASCADE,
    
    -- Evento
    event_type TEXT NOT NULL,                   -- Ex: "created", "sent", "signed", "viewed", "downloaded"
    event_description TEXT,
    
    -- Contexto
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    user_name TEXT,
    ip_address INET,
    user_agent TEXT,
    
    -- Dados extras
    metadata JSONB DEFAULT '{}',
    
    -- Timestamp
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =========================================
-- 4. ÍNDICES PARA PERFORMANCE
-- =========================================

-- Índices para service_orders
CREATE INDEX IF NOT EXISTS idx_service_orders_status ON service_orders(status);
CREATE INDEX IF NOT EXISTS idx_service_orders_created_by ON service_orders(created_by);
CREATE INDEX IF NOT EXISTS idx_service_orders_created_at ON service_orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_service_orders_expires_at ON service_orders(expires_at);

-- Índices para os_signers
CREATE INDEX IF NOT EXISTS idx_os_signers_os_id ON os_signers(os_id);
CREATE INDEX IF NOT EXISTS idx_os_signers_email ON os_signers(email);
CREATE INDEX IF NOT EXISTS idx_os_signers_status ON os_signers(status);
CREATE INDEX IF NOT EXISTS idx_os_signers_os_status ON os_signers(os_id, status);

-- Índices para os_audit_log
CREATE INDEX IF NOT EXISTS idx_os_audit_log_os_id ON os_audit_log(os_id);
CREATE INDEX IF NOT EXISTS idx_os_audit_log_event_type ON os_audit_log(event_type);
CREATE INDEX IF NOT EXISTS idx_os_audit_log_created_at ON os_audit_log(created_at DESC);

-- =========================================
-- 5. ROW LEVEL SECURITY (RLS)
-- =========================================

-- Habilitar RLS em todas as tabelas
ALTER TABLE service_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE os_signers ENABLE ROW LEVEL SECURITY;
ALTER TABLE os_audit_log ENABLE ROW LEVEL SECURITY;

-- Políticas para service_orders
-- Admins e Super Admins podem ver tudo
CREATE POLICY "Admins can view all service orders" 
    ON service_orders FOR SELECT 
    USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role IN ('ADMIN', 'SUPER_ADMIN')
        )
    );

-- Usuários podem ver OS que criaram
CREATE POLICY "Users can view own service orders" 
    ON service_orders FOR SELECT 
    USING (created_by = auth.uid());

-- Assinantes podem ver OS onde estão incluídos
CREATE POLICY "Signers can view their service orders" 
    ON service_orders FOR SELECT 
    USING (
        EXISTS (
            SELECT 1 FROM os_signers 
            WHERE os_signers.os_id = service_orders.id 
            AND os_signers.email = (SELECT email FROM auth.users WHERE id = auth.uid())
        )
    );

-- Admins podem criar, atualizar e deletar
CREATE POLICY "Admins can manage service orders" 
    ON service_orders FOR ALL 
    USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role IN ('ADMIN', 'SUPER_ADMIN')
        )
    );

-- Políticas para os_signers
CREATE POLICY "Users can view signers of their OS" 
    ON os_signers FOR SELECT 
    USING (
        EXISTS (
            SELECT 1 FROM service_orders 
            WHERE service_orders.id = os_signers.os_id 
            AND (
                service_orders.created_by = auth.uid()
                OR EXISTS (
                    SELECT 1 FROM profiles 
                    WHERE profiles.id = auth.uid() 
                    AND profiles.role IN ('ADMIN', 'SUPER_ADMIN')
                )
            )
        )
    );

-- Assinantes podem ver e atualizar seus próprios registros
CREATE POLICY "Signers can view and update own records" 
    ON os_signers FOR ALL 
    USING (
        email = (SELECT email FROM auth.users WHERE id = auth.uid())
    );

-- Admins podem gerenciar todos os signers
CREATE POLICY "Admins can manage all signers" 
    ON os_signers FOR ALL 
    USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role IN ('ADMIN', 'SUPER_ADMIN')
        )
    );

-- Políticas para os_audit_log
CREATE POLICY "Admins can view all audit logs" 
    ON os_audit_log FOR SELECT 
    USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role IN ('ADMIN', 'SUPER_ADMIN')
        )
    );

CREATE POLICY "Service role can insert audit logs" 
    ON os_audit_log FOR INSERT 
    WITH CHECK (true);

-- =========================================
-- 6. FUNÇÕES PARA AUTOMAÇÃO
-- =========================================

-- Função para atualizar o campo updated_at automaticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers para updated_at
CREATE TRIGGER update_service_orders_updated_at 
    BEFORE UPDATE ON service_orders 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_os_signers_updated_at 
    BEFORE UPDATE ON os_signers 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Função para atualizar contadores de assinaturas
CREATE OR REPLACE FUNCTION update_os_signature_counts()
RETURNS TRIGGER AS $$
BEGIN
    -- Atualiza o contador de assinados
    UPDATE service_orders
    SET 
        signed_count = (
            SELECT COUNT(*) 
            FROM os_signers 
            WHERE os_id = NEW.os_id AND status = 'SIGNED'
        ),
        total_signers = (
            SELECT COUNT(*) 
            FROM os_signers 
            WHERE os_id = NEW.os_id
        )
    WHERE id = NEW.os_id;
    
    -- Se todos assinaram, marca como completado
    UPDATE service_orders
    SET 
        status = 'COMPLETED',
        completed_at = NOW()
    WHERE 
        id = NEW.os_id 
        AND signed_count = total_signers 
        AND total_signers > 0
        AND status != 'COMPLETED';
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para atualizar contadores quando uma assinatura é criada/atualizada
CREATE TRIGGER update_signature_counts_on_change
    AFTER INSERT OR UPDATE ON os_signers
    FOR EACH ROW
    EXECUTE FUNCTION update_os_signature_counts();

-- Função para registrar eventos de auditoria
CREATE OR REPLACE FUNCTION log_os_event(
    p_os_id UUID,
    p_event_type TEXT,
    p_event_description TEXT DEFAULT NULL,
    p_signer_id UUID DEFAULT NULL,
    p_metadata JSONB DEFAULT '{}'
)
RETURNS UUID AS $$
DECLARE
    v_log_id UUID;
    v_user_name TEXT;
BEGIN
    -- Pega o nome do usuário atual
    SELECT name INTO v_user_name
    FROM profiles
    WHERE id = auth.uid();
    
    -- Insere o log
    INSERT INTO os_audit_log (
        os_id,
        signer_id,
        event_type,
        event_description,
        user_id,
        user_name,
        metadata
    ) VALUES (
        p_os_id,
        p_signer_id,
        p_event_type,
        p_event_description,
        auth.uid(),
        v_user_name,
        p_metadata
    )
    RETURNING id INTO v_log_id;
    
    RETURN v_log_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =========================================
-- 7. VIEW PARA LISTAGEM OTIMIZADA
-- =========================================

CREATE OR REPLACE VIEW os_list_view AS
SELECT 
    so.id,
    so.title,
    so.description,
    so.file_name,
    so.status,
    so.created_by,
    so.created_by_name,
    so.total_signers,
    so.signed_count,
    so.expires_at,
    so.completed_at,
    so.created_at,
    so.updated_at,
    
    -- Array de assinantes com seus status
    COALESCE(
        json_agg(
            json_build_object(
                'id', os.id,
                'name', os.name,
                'email', os.email,
                'role', os.role,
                'status', os.status,
                'signed_at', os.signed_at,
                'order_index', os.order_index
            ) ORDER BY os.order_index
        ) FILTER (WHERE os.id IS NOT NULL),
        '[]'::json
    ) as signers,
    
    -- Status geral
    CASE 
        WHEN so.status = 'COMPLETED' THEN 'Concluído'
        WHEN so.status = 'CANCELLED' THEN 'Cancelado'
        WHEN so.status = 'EXPIRED' THEN 'Expirado'
        WHEN so.signed_count > 0 THEN 'Parcialmente Assinado'
        WHEN so.status = 'PENDING' THEN 'Aguardando'
        ELSE 'Rascunho'
    END as status_label,
    
    -- Progresso
    CASE 
        WHEN so.total_signers > 0 THEN 
            ROUND((so.signed_count::NUMERIC / so.total_signers::NUMERIC) * 100)
        ELSE 0
    END as progress_percentage

FROM service_orders so
LEFT JOIN os_signers os ON os.os_id = so.id
GROUP BY 
    so.id,
    so.title,
    so.description,
    so.file_name,
    so.status,
    so.created_by,
    so.created_by_name,
    so.total_signers,
    so.signed_count,
    so.expires_at,
    so.completed_at,
    so.created_at,
    so.updated_at;

-- =========================================
-- 8. FUNÇÃO PARA CRIAR BUCKET DE STORAGE
-- =========================================

-- Nota: Execute isso manualmente ou via código se o bucket não existir
-- INSERT INTO storage.buckets (id, name, public)
-- VALUES ('service-orders', 'service-orders', false);

-- Política de storage para service-orders
-- CREATE POLICY "Admins can upload service orders"
-- ON storage.objects FOR INSERT
-- TO authenticated
-- WITH CHECK (
--     bucket_id = 'service-orders' 
--     AND EXISTS (
--         SELECT 1 FROM profiles 
--         WHERE profiles.id = auth.uid() 
--         AND profiles.role IN ('ADMIN', 'SUPER_ADMIN')
--     )
-- );

-- CREATE POLICY "Users can download service orders"
-- ON storage.objects FOR SELECT
-- TO authenticated
-- USING (bucket_id = 'service-orders');

COMMENT ON TABLE service_orders IS 'Tabela principal de Ordens de Serviço para assinatura eletrônica';
COMMENT ON TABLE os_signers IS 'Assinantes de cada Ordem de Serviço';
COMMENT ON TABLE os_audit_log IS 'Log de auditoria de todas as ações em OS';

-- =========================================
-- 9. EXTRAÇÃO AUTOMÁTICA (METADADOS DA OS)
-- =========================================
-- Campos para armazenar o resultado da extração (valor/pessoa) logo após upload
-- Mantém a integridade do restante do sistema

ALTER TABLE service_orders
    ADD COLUMN IF NOT EXISTS extracted_valor TEXT,
    ADD COLUMN IF NOT EXISTS extracted_pessoa TEXT,
    ADD COLUMN IF NOT EXISTS extraction_confidence NUMERIC(3,2),
    ADD COLUMN IF NOT EXISTS extraction_status TEXT DEFAULT 'PENDING' CHECK (
        extraction_status IN ('PENDING', 'SUCCESS', 'REVIEW', 'ERROR')
    ),
    ADD COLUMN IF NOT EXISTS extraction_log JSONB DEFAULT '{}'::jsonb;

-- Índice para consultas rápidas pelo status de extração
CREATE INDEX IF NOT EXISTS idx_service_orders_extraction_status
    ON service_orders(extraction_status);

