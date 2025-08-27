-- Script para corrigir a estrutura da coluna agent_id
-- Execute este script no Supabase SQL Editor

-- 1. Verificar valores únicos de agent_id
SELECT 
    agent_id,
    COUNT(*) as call_count,
    MIN(sdr_name) as sample_sdr_name
FROM public.calls 
WHERE agent_id IS NOT NULL
GROUP BY agent_id
ORDER BY call_count DESC
LIMIT 10;

-- 2. Verificar se agent_id contém UUIDs válidos
SELECT 
    agent_id,
    CASE 
        WHEN agent_id ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' 
        THEN 'UUID válido'
        ELSE 'Não é UUID'
    END as uuid_status
FROM public.calls 
WHERE agent_id IS NOT NULL
LIMIT 10;

-- 3. Criar tabela de mapeamento de usuários
CREATE TABLE IF NOT EXISTS public.user_mapping (
    id SERIAL PRIMARY KEY,
    agent_id TEXT UNIQUE NOT NULL,
    full_name TEXT NOT NULL,
    email TEXT,
    role TEXT DEFAULT 'user',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Inserir dados únicos de agent_id na tabela de mapeamento
INSERT INTO public.user_mapping (agent_id, full_name, role)
SELECT DISTINCT 
    agent_id,
    COALESCE(sdr_name, 'Usuário ' || agent_id) as full_name,
    'user' as role
FROM public.calls 
WHERE agent_id IS NOT NULL
ON CONFLICT (agent_id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    role = EXCLUDED.role;

-- 4.1. Também incluir SDRs que podem não ter agent_id
INSERT INTO public.user_mapping (agent_id, full_name, role)
SELECT DISTINCT 
    sdr_id,
    COALESCE(sdr_name, 'SDR ' || sdr_id) as full_name,
    'sdr' as role
FROM public.calls 
WHERE sdr_id IS NOT NULL 
AND sdr_id NOT IN (SELECT agent_id FROM public.user_mapping)
ON CONFLICT (agent_id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    role = EXCLUDED.role;

-- 5. Verificar dados inseridos
SELECT * FROM public.user_mapping ORDER BY full_name;

-- 6. Criar view para facilitar consultas
CREATE OR REPLACE VIEW public.calls_with_users AS
SELECT 
    c.*,
    um.full_name as user_full_name,
    um.email as user_email,
    um.role as user_role
FROM public.calls c
LEFT JOIN public.user_mapping um ON c.agent_id = um.agent_id;

-- 7. Testar a view
SELECT 
    agent_id,
    sdr_name,
    user_full_name,
    user_role
FROM public.calls_with_users 
WHERE agent_id IS NOT NULL
LIMIT 10;

-- 8. Habilitar RLS na tabela de mapeamento
ALTER TABLE public.user_mapping ENABLE ROW LEVEL SECURITY;

-- 9. Criar política para permitir leitura
CREATE POLICY "Allow public read access" ON public.user_mapping
    FOR SELECT USING (true);

-- 10. Verificar se a view funciona
SELECT COUNT(*) as total_calls_with_users 
FROM public.calls_with_users 
WHERE user_full_name IS NOT NULL;
