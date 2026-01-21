-- ============================================
-- RPC PARA BUSCAR USUÁRIOS DO GOOGLE WORKSPACE
-- ============================================
-- Esta RPC vai buscar usuários do Google via API
-- Usando as credenciais armazenadas em app_settings
-- ============================================

CREATE OR REPLACE FUNCTION fetch_workspace_users()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_credentials JSONB;
  v_result JSONB;
BEGIN
  -- Buscar credenciais
  SELECT value::JSONB INTO v_credentials
  FROM app_settings
  WHERE key = 'google_workspace_credentials';
  
  IF v_credentials IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Credenciais do Google Workspace não configuradas'
    );
  END IF;
  
  -- Esta função retornará um array vazio por enquanto
  -- A busca real precisa ser feita via Edge Function ou HTTP
  -- Por limitações do PostgreSQL, não podemos fazer OAuth flow direto aqui
  
  RETURN jsonb_build_object(
    'success', true,
    'message', 'Use a Edge Function fetch-workspace-users para buscar usuários reais do Google',
    'users', '[]'::jsonb
  );
END;
$$;

GRANT EXECUTE ON FUNCTION fetch_workspace_users() TO authenticated, service_role;

COMMENT ON FUNCTION fetch_workspace_users IS 
'Busca usuários do Google Workspace (placeholder - usar Edge Function para implementação real)';

