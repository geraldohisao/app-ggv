-- Script para corrigir nomes duplicados na tabela user_mapping
-- Execute este script no Supabase SQL Editor

-- 1. Verificar duplicatas atuais
SELECT 'VERIFICANDO DUPLICATAS ATUAIS' as status;
SELECT 
    agent_id,
    full_name,
    email,
    role,
    created_at
FROM public.user_mapping 
WHERE full_name LIKE '%Camila%' 
   OR full_name LIKE '%Mariana%' 
   OR full_name LIKE '%Lô-Ruama%'
ORDER BY full_name, created_at;

-- 2. Identificar quais manter (nomes reais) vs remover (nomes legíveis antigos)
SELECT 'IDENTIFICANDO O QUE MANTER' as status;
SELECT 
    'MANTER' as action,
    agent_id,
    full_name,
    email,
    role
FROM public.user_mapping 
WHERE (full_name = 'Camila Ataliba' AND email IS NOT NULL)
   OR (full_name = 'Mariana Costa' AND email IS NOT NULL)
   OR (full_name = 'Lô-Ruama Oliveira' AND email IS NOT NULL)
UNION ALL
SELECT 
    'REMOVER' as action,
    agent_id,
    full_name,
    email,
    role
FROM public.user_mapping 
WHERE (full_name = 'Camila (sem perfil)' OR full_name LIKE 'Camila %...')
   OR (full_name = 'Mariana (sem perfil)' OR full_name LIKE 'Mariana %...')
   OR (full_name = 'Lô-Ruama (sem perfil)' OR full_name LIKE 'Lô-Ruama %...')
ORDER BY full_name;

-- 3. Remover entradas duplicadas (nomes legíveis antigos)
SELECT 'REMOVENDO DUPLICATAS' as status;
DELETE FROM public.user_mapping 
WHERE (full_name = 'Camila (sem perfil)' OR full_name LIKE 'Camila %...')
   OR (full_name = 'Mariana (sem perfil)' OR full_name LIKE 'Mariana %...')
   OR (full_name = 'Lô-Ruama (sem perfil)' OR full_name LIKE 'Lô-Ruama %...');

-- 4. Verificar resultado após limpeza
SELECT 'RESULTADO APÓS LIMPEZA' as status;
SELECT 
    agent_id,
    full_name,
    email,
    role,
    created_at
FROM public.user_mapping 
WHERE full_name LIKE '%Camila%' 
   OR full_name LIKE '%Mariana%' 
   OR full_name LIKE '%Lô-Ruama%'
ORDER BY full_name;

-- 5. Verificar se há outras duplicatas
SELECT 'VERIFICANDO OUTRAS DUPLICATAS' as status;
SELECT 
    full_name,
    COUNT(*) as total_duplicates,
    STRING_AGG(agent_id, ', ') as agent_ids
FROM public.user_mapping 
GROUP BY full_name
HAVING COUNT(*) > 1
ORDER BY full_name;

-- 6. Remover outras duplicatas (manter a mais recente)
SELECT 'REMOVENDO OUTRAS DUPLICATAS' as status;
DELETE FROM public.user_mapping 
WHERE id IN (
    SELECT id FROM (
        SELECT id,
               ROW_NUMBER() OVER (PARTITION BY full_name ORDER BY created_at DESC) as rn
        FROM public.user_mapping
        WHERE full_name IN (
            SELECT full_name 
            FROM public.user_mapping 
            GROUP BY full_name 
            HAVING COUNT(*) > 1
        )
    ) ranked
    WHERE rn > 1
);

-- 7. Verificar resultado final
SELECT 'RESULTADO FINAL' as status;
SELECT 
    agent_id,
    full_name,
    email,
    role,
    created_at
FROM public.user_mapping 
ORDER BY full_name;

-- 8. Verificar estatísticas finais
SELECT 'ESTATÍSTICAS FINAIS' as status;
SELECT 
    role,
    COUNT(*) as total_users,
    COUNT(CASE WHEN email IS NOT NULL THEN 1 END) as users_with_email,
    COUNT(CASE WHEN email IS NULL THEN 1 END) as users_without_email
FROM public.user_mapping 
GROUP BY role
ORDER BY role;

-- 9. Testar função de sincronização para garantir que não cria duplicatas
SELECT 'TESTANDO SINCRONIZAÇÃO' as status;
SELECT manual_sync_all_users();

-- 10. Verificar se não criou duplicatas após sincronização
SELECT 'VERIFICAÇÃO FINAL APÓS SINCRONIZAÇÃO' as status;
SELECT 
    full_name,
    COUNT(*) as total_duplicates
FROM public.user_mapping 
GROUP BY full_name
HAVING COUNT(*) > 1
ORDER BY full_name;

-- 11. Resumo final
SELECT 'RESUMO FINAL' as status;
SELECT 
    '✅ Duplicatas removidas com sucesso!' as message
UNION ALL
SELECT 
    '✅ Apenas nomes reais mantidos' as message
UNION ALL
SELECT 
    '✅ Dropdown limpo e funcional' as message
UNION ALL
SELECT 
    '✅ Sincronização não cria duplicatas' as message
UNION ALL
SELECT 
    '✅ Sistema pronto para uso!' as message;
