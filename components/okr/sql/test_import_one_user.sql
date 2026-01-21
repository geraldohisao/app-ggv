-- ============================================
-- TESTE: IMPORTAR 1 USUÁRIO (VALIDAÇÃO)
-- ============================================
-- Importa apenas 1 usuário para testar
-- SEM RISCO para o sistema
-- ============================================

-- 1. ANTES: Ver usuários atuais
SELECT 
  COUNT(*) as "Total de usuários ANTES",
  COUNT(*) FILTER (WHERE is_active = true) as "Ativos ANTES"
FROM profiles;

-- 2. TESTAR função com 1 usuário fictício
SELECT workspace_sync_user(
  'test-google-id-123',           -- p_google_id
  'teste-workspace@grupoggv.com', -- p_email
  'Teste Workspace Import',       -- p_name
  'SDR',                          -- p_cargo
  'comercial',                    -- p_department
  'Grupo GGV',                    -- p_org_unit
  true,                           -- p_is_active
  '{"test": true}'::jsonb         -- p_google_data
) as "ID do usuário criado/atualizado";

-- 3. DEPOIS: Ver usuários atuais
SELECT 
  COUNT(*) as "Total de usuários DEPOIS",
  COUNT(*) FILTER (WHERE is_active = true) as "Ativos DEPOIS"
FROM profiles;

-- 4. VERIFICAR o usuário de teste
SELECT 
  id,
  name,
  email,
  cargo,
  department,
  organizational_unit,
  role,
  is_active,
  google_id,
  last_synced_at
FROM profiles
WHERE email = 'teste-workspace@grupoggv.com';

-- 5. DELETAR usuário de teste (LIMPAR)
DELETE FROM profiles WHERE email = 'teste-workspace@grupoggv.com';

-- 6. CONFIRMAR limpeza
SELECT 
  COUNT(*) as "Total FINAL (deve ser igual ao ANTES)"
FROM profiles;

-- ============================================
-- RESULTADO ESPERADO:
-- ============================================
/*
ANTES:   20 usuários
DEPOIS:  21 usuários (1 a mais)
TESTE:   Mostra o usuário criado com todos os campos corretos
FINAL:   20 usuários (voltou ao normal)

✅ Se o teste passar, a importação é SEGURA!
*/

