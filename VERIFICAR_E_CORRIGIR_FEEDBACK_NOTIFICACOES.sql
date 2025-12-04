-- =============================================================
-- 🔧 DIAGNÓSTICO E CORREÇÃO: Notificações de Feedback
-- =============================================================
-- Problema: Feedback foi salvo mas notificação não chegou para Hiara
-- ID do feedback: 2bb96ab5-ed71-4a11-b932-f8470022d818
-- ID da chamada: 798ce977-62c3-4962-bffa-14e09f02ad15
-- =============================================================

-- PASSO 1: Verificar o feedback criado
SELECT 
  '1️⃣ FEEDBACK CRIADO' as etapa,
  cf.id,
  cf.call_id,
  cf.sdr_id,
  cf.author_id,
  cf.content,
  cf.created_at,
  cf.is_read
FROM call_feedbacks cf
WHERE cf.id = '2bb96ab5-ed71-4a11-b932-f8470022d818';

-- PASSO 2: Verificar os dados da chamada
SELECT 
  '2️⃣ DADOS DA CHAMADA' as etapa,
  c.id,
  c.agent_id,
  c.sdr_id,
  c.enterprise,
  c.person,
  c.duration_formated
FROM calls c
WHERE c.id = '798ce977-62c3-4962-bffa-14e09f02ad15';

-- PASSO 3: Verificar se existe o perfil da Hiara
SELECT 
  '3️⃣ PERFIL DA HIARA' as etapa,
  p.id,
  p.email,
  p.full_name
FROM profiles p
WHERE p.email ILIKE '%hiara%' OR p.full_name ILIKE '%hiara%';

-- PASSO 4: Verificar se o trigger existe
SELECT 
  '4️⃣ TRIGGER EXISTENTE' as etapa,
  trigger_name,
  event_manipulation,
  action_statement
FROM information_schema.triggers
WHERE trigger_name = 'trg_populate_feedback_sdr_id';

-- PASSO 5: Verificar se a função de mapeamento existe
SELECT 
  '5️⃣ FUNÇÃO DE MAPEAMENTO' as etapa,
  routine_name,
  routine_type
FROM information_schema.routines
WHERE routine_name = 'get_sdr_uuid_from_email';

-- =============================================================
-- 🔧 APLICAR CORREÇÕES
-- =============================================================

-- CORREÇÃO A: Criar função para mapear email -> UUID do SDR
CREATE OR REPLACE FUNCTION get_sdr_uuid_from_email(p_email TEXT)
RETURNS UUID
LANGUAGE SQL
STABLE
AS $$
  SELECT id 
  FROM profiles 
  WHERE email = p_email 
  LIMIT 1;
$$;

-- CORREÇÃO B: Criar/Atualizar trigger para popular sdr_id automaticamente
CREATE OR REPLACE FUNCTION populate_feedback_sdr_id()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Se sdr_id não foi fornecido, buscar da chamada
  IF NEW.sdr_id IS NULL THEN
    -- Buscar agent_id da chamada e converter para UUID
    SELECT get_sdr_uuid_from_email(c.agent_id)
    INTO NEW.sdr_id
    FROM calls c
    WHERE c.id = NEW.call_id;
    
    -- Fallback: se não conseguiu achar pelo email, tentar o sdr_id direto da chamada
    IF NEW.sdr_id IS NULL THEN
      SELECT c.sdr_id
      INTO NEW.sdr_id
      FROM calls c
      WHERE c.id = NEW.call_id
      AND c.sdr_id IS NOT NULL;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Remover trigger existente se houver
DROP TRIGGER IF EXISTS trg_populate_feedback_sdr_id ON call_feedbacks;

-- Criar novo trigger
CREATE TRIGGER trg_populate_feedback_sdr_id
  BEFORE INSERT ON call_feedbacks
  FOR EACH ROW
  EXECUTE FUNCTION populate_feedback_sdr_id();

-- CORREÇÃO C: Atualizar o feedback específico da Hiara com o sdr_id correto
UPDATE call_feedbacks cf
SET sdr_id = (
  SELECT get_sdr_uuid_from_email(c.agent_id)
  FROM calls c
  WHERE c.id = cf.call_id
)
WHERE cf.id = '2bb96ab5-ed71-4a11-b932-f8470022d818'
AND cf.sdr_id IS NULL;

-- CORREÇÃO D: Atualizar TODOS os feedbacks existentes que não têm sdr_id
UPDATE call_feedbacks cf
SET sdr_id = (
  SELECT get_sdr_uuid_from_email(c.agent_id)
  FROM calls c
  WHERE c.id = cf.call_id
)
WHERE cf.sdr_id IS NULL;

-- =============================================================
-- ✅ VERIFICAÇÕES FINAIS
-- =============================================================

-- VERIFICAÇÃO 1: Status do feedback da Hiara após correção
SELECT 
  '✅ FEEDBACK APÓS CORREÇÃO' as status,
  cf.id,
  cf.call_id,
  cf.sdr_id,
  cf.author_id,
  cf.content,
  cf.is_read,
  p.email as sdr_email,
  p.full_name as sdr_nome
FROM call_feedbacks cf
LEFT JOIN profiles p ON p.id = cf.sdr_id
WHERE cf.id = '2bb96ab5-ed71-4a11-b932-f8470022d818';

-- VERIFICAÇÃO 2: Estatísticas gerais de feedbacks
SELECT 
  '✅ ESTATÍSTICAS' as info,
  COUNT(*) as total_feedbacks,
  COUNT(sdr_id) as feedbacks_com_sdr_id,
  COUNT(*) - COUNT(sdr_id) as feedbacks_sem_sdr_id,
  COUNT(CASE WHEN is_read = false THEN 1 END) as feedbacks_nao_lidos
FROM call_feedbacks;

-- VERIFICAÇÃO 3: Testar a função RPC de notificações
-- (Esta query simula o que a Hiara veria como notificações)
SELECT 
  '✅ NOTIFICAÇÕES DA HIARA' as info,
  cf.id as feedback_id,
  cf.content,
  cf.created_at,
  cf.is_read,
  c.enterprise,
  c.person,
  c.duration_formated,
  p_author.full_name as autor
FROM call_feedbacks cf
JOIN calls c ON c.id = cf.call_id
LEFT JOIN profiles p_author ON p_author.id = cf.author_id
WHERE cf.sdr_id = (SELECT id FROM profiles WHERE email ILIKE '%hiara%' LIMIT 1)
  AND cf.author_id != (SELECT id FROM profiles WHERE email ILIKE '%hiara%' LIMIT 1)
ORDER BY cf.created_at DESC;

-- =============================================================
-- 📋 INSTRUÇÕES
-- =============================================================
-- 1. Execute este script no SQL Editor do Supabase
-- 2. Verifique os resultados de cada etapa
-- 3. A notificação agora deve aparecer para a Hiara
-- 4. Novos feedbacks terão sdr_id preenchido automaticamente
-- =============================================================


