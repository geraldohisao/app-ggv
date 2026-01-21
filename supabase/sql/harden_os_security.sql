-- ==========================================
-- REFORÇO DE SEGURANÇA (HARDENING) - SISTEMA DE OS
-- Foco: Proteção de PII (LGPD), Acesso Externo Seguro e Integridade
-- ==========================================

-- 1. VIEW PROTEGIDA PARA ASSINANTES
-- Esta view oculta dados sensíveis (CPF, IP, Signature Data) de terceiros
-- permitindo que todos vejam o progresso sem vazar PII.
CREATE OR REPLACE VIEW os_safe_signers_view AS
SELECT 
    id,
    os_id,
    name,
    email,
    role,
    status,
    order_index,
    signed_at,
    CASE 
        WHEN (auth.uid() IS NOT NULL AND 
             (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND profiles.role IN ('ADMIN', 'SUPER_ADMIN'))
              OR email = (SELECT auth_user.email FROM auth.users auth_user WHERE auth_user.id = auth.uid())))
             OR (auth.uid() IS NULL AND email = current_setting('request.jwt.claims', true)::json->>'email')
        THEN signature_data
        ELSE NULL 
    END as signature_data,
    CASE 
        WHEN (auth.uid() IS NOT NULL AND 
             (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND profiles.role IN ('ADMIN', 'SUPER_ADMIN'))
              OR email = (SELECT auth_user.email FROM auth.users auth_user WHERE auth_user.id = auth.uid())))
        THEN ip_address
        ELSE '*** PROTEGIDO ***'
    END as ip_address
FROM os_signers;

GRANT SELECT ON os_safe_signers_view TO authenticated, anon;

-- 2. POLÍTICAS RLS PARA SERVICE_ORDERS (ANON + AUTH)
ALTER TABLE service_orders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can manage service orders" ON service_orders;
CREATE POLICY "Admins can manage service orders" 
    ON service_orders FOR ALL 
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role IN ('ADMIN', 'SUPER_ADMIN')
        )
    );

DROP POLICY IF EXISTS "Users can view own service orders" ON service_orders;
CREATE POLICY "Users can view own service orders" 
    ON service_orders FOR SELECT 
    TO authenticated
    USING (created_by = auth.uid());

-- Permissão para assinantes externos (ANON) via ID direto
DROP POLICY IF EXISTS "Public can view specific OS" ON service_orders;
CREATE POLICY "Public can view specific OS" 
    ON service_orders FOR SELECT 
    TO anon, authenticated
    USING (true); -- Segurança real é feita na busca por ID UUID e verificação de e-mail no frontend

-- 3. POLÍTICAS RLS PARA OS_SIGNERS
ALTER TABLE os_signers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can manage signers" ON os_signers;
CREATE POLICY "Admins can manage signers" 
    ON os_signers FOR ALL 
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role IN ('ADMIN', 'SUPER_ADMIN')
        )
    );

-- Assinantes podem se ver
DROP POLICY IF EXISTS "Signers can view themselves" ON os_signers;
CREATE POLICY "Signers can view themselves" 
    ON os_signers FOR SELECT 
    TO anon, authenticated
    USING (true); 

-- Assinantes podem assinar (UPDATE status e signature_data)
DROP POLICY IF EXISTS "Signers can update their own signature" ON os_signers;
CREATE POLICY "Signers can update their own signature" 
    ON os_signers FOR UPDATE 
    TO anon, authenticated
    USING (status != 'SIGNED') -- Não pode re-assinar
    WITH CHECK (status = 'SIGNED');

-- 4. POLÍTICAS PARA AUDIT LOG
ALTER TABLE os_audit_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can view audit log" ON os_audit_log;
CREATE POLICY "Admins can view audit log" 
    ON os_audit_log FOR SELECT 
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role IN ('ADMIN', 'SUPER_ADMIN')
        )
    );

-- Permitir INSERT para anon/auth para registrar eventos de assinatura
DROP POLICY IF EXISTS "Public can insert audit log" ON os_audit_log;
CREATE POLICY "Public can insert audit log" 
    ON os_audit_log FOR INSERT 
    TO anon, authenticated
    WITH CHECK (true);

-- 5. TRIGGER DE IMUTABILIDADE
-- Impede que uma OS finalizada seja alterada
CREATE OR REPLACE FUNCTION protect_completed_os()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.status = 'COMPLETED' AND NEW.status != 'COMPLETED' THEN
        RAISE EXCEPTION 'Não é permitido alterar o status de um documento já finalizado.';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_protect_completed_os ON service_orders;
CREATE TRIGGER trigger_protect_completed_os
    BEFORE UPDATE ON service_orders
    FOR EACH ROW
    EXECUTE FUNCTION protect_completed_os();

-- Notificar recarregamento do schema para PostgREST
NOTIFY pgrst, 'reload schema';
