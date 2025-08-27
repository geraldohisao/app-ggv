-- Script corrigido para a estrutura real da tabela calls
-- Execute este script no Supabase SQL Editor

-- 1. Verificar valores únicos de agent_id
SELECT 
    agent_id,
    COUNT(*) as call_count
FROM public.calls 
WHERE agent_id IS NOT NULL
GROUP BY agent_id
ORDER BY call_count DESC
LIMIT 10;

-- 2. Verificar valores únicos de sdr_id
SELECT 
    sdr_id,
    COUNT(*) as call_count
FROM public.calls 
WHERE sdr_id IS NOT NULL
GROUP BY sdr_id
ORDER BY call_count DESC
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
    'Usuário ' || agent_id as full_name,
    'user' as role
FROM public.calls 
WHERE agent_id IS NOT NULL
ON CONFLICT (agent_id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    role = EXCLUDED.role;

-- 5. Inserir dados únicos de sdr_id na tabela de mapeamento
INSERT INTO public.user_mapping (agent_id, full_name, role)
SELECT DISTINCT 
    sdr_id::TEXT,
    'SDR ' || sdr_id::TEXT as full_name,
    'sdr' as role
FROM public.calls 
WHERE sdr_id IS NOT NULL 
AND sdr_id::TEXT NOT IN (SELECT agent_id FROM public.user_mapping)
ON CONFLICT (agent_id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    role = EXCLUDED.role;

-- 6. Verificar dados inseridos
SELECT 
    agent_id,
    full_name,
    role,
    created_at
FROM public.user_mapping 
ORDER BY full_name;

-- 7. Criar view para facilitar consultas
CREATE OR REPLACE VIEW public.calls_with_users AS
SELECT 
    c.*,
    um.full_name as user_full_name,
    um.email as user_email,
    um.role as user_role
FROM public.calls c
LEFT JOIN public.user_mapping um ON c.agent_id = um.agent_id;

-- 8. Testar a view
SELECT 
    agent_id,
    user_full_name,
    user_role
FROM public.calls_with_users 
WHERE agent_id IS NOT NULL
LIMIT 10;

-- 9. Habilitar RLS na tabela de mapeamento
ALTER TABLE public.user_mapping ENABLE ROW LEVEL SECURITY;

-- 10. Criar política para permitir leitura
CREATE POLICY "Allow public read access" ON public.user_mapping
    FOR SELECT USING (true);

-- 11. Verificar estatísticas finais
SELECT 
    COUNT(*) as total_users,
    COUNT(CASE WHEN role = 'user' THEN 1 END) as users,
    COUNT(CASE WHEN role = 'sdr' THEN 1 END) as sdrs
FROM public.user_mapping;

-- 12. Verificar usuários com mais ligações
SELECT 
    um.agent_id,
    um.full_name,
    um.role,
    COUNT(c.id) as total_calls
FROM public.user_mapping um
LEFT JOIN public.calls c ON um.agent_id = c.agent_id OR um.agent_id = c.sdr_id::TEXT
GROUP BY um.agent_id, um.full_name, um.role
ORDER BY total_calls DESC
LIMIT 10;
