-- 🤖 HABILITAR WORKER DE ANÁLISE AUTOMÁTICA
-- Execute este script no SQL Editor do Supabase

-- 1. Verificar configuração atual
SELECT 'CONFIGURAÇÃO ATUAL:' as info;
SELECT key, value FROM app_settings WHERE key = 'auto_analysis_enabled';

-- 2. Habilitar worker (garantir que está ativo)
UPDATE app_settings 
SET value = 'true' 
WHERE key = 'auto_analysis_enabled';

-- Se não existir, inserir
INSERT INTO app_settings (key, value) 
VALUES ('auto_analysis_enabled', 'true')
ON CONFLICT (key) DO UPDATE SET value = 'true';

-- 3. Verificar se foi habilitado
SELECT 'APÓS HABILITAÇÃO:' as info;
SELECT key, value FROM app_settings WHERE key = 'auto_analysis_enabled';

-- 4. Verificar chamadas pending
SELECT 'CHAMADAS PENDING PARA ANÁLISE:' as info;
SELECT COUNT(*) as pending_count FROM calls WHERE ai_status = 'pending';

-- 5. Testar função RPC
SELECT 'TESTE FUNÇÃO RPC:' as info;
SELECT COUNT(*) as eligible_calls FROM get_calls_for_auto_analysis(10, 180);
