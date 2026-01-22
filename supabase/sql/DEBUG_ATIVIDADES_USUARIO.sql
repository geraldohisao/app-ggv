-- =========================================
-- DEBUG: Verificar atividades de um usuário
-- Execute este script para diagnosticar por que 
-- as iniciativas não aparecem na visão de Atividades
-- =========================================

-- 1. Buscar o perfil do Eduardo Espindola
SELECT 
    id,
    full_name,
    email,
    role,
    department
FROM profiles 
WHERE full_name ILIKE '%eduardo%' OR full_name ILIKE '%espindola%'
ORDER BY full_name;

-- 2. Verificar todos os sprint_items com o nome "Eduardo" no campo responsible
SELECT 
    si.id,
    si.title,
    si.type,
    si.status,
    si.responsible,
    si.responsible_user_id,
    s.title as sprint_title,
    s.status as sprint_status,
    s.deleted_at as sprint_deleted
FROM sprint_items si
LEFT JOIN sprints s ON si.sprint_id = s.id
WHERE si.responsible ILIKE '%eduardo%'
   OR si.responsible ILIKE '%espindola%'
ORDER BY si.created_at DESC;

-- 3. Verificar sprint_items onde responsible_user_id corresponde ao Eduardo
-- (precisa substituir o UUID pelo ID real do Eduardo)
-- SELECT 
--     si.id,
--     si.title,
--     si.type,
--     si.status,
--     si.responsible,
--     si.responsible_user_id,
--     s.title as sprint_title
-- FROM sprint_items si
-- LEFT JOIN sprints s ON si.sprint_id = s.id
-- WHERE si.responsible_user_id = 'UUID_DO_EDUARDO_AQUI';

-- 4. Verificar TODOS os sprint_items com responsável preenchido
SELECT 
    si.responsible,
    si.responsible_user_id,
    COUNT(*) as total_items,
    STRING_AGG(DISTINCT si.type, ', ') as tipos
FROM sprint_items si
LEFT JOIN sprints s ON si.sprint_id = s.id
WHERE s.deleted_at IS NULL
  AND (si.responsible IS NOT NULL OR si.responsible_user_id IS NOT NULL)
GROUP BY si.responsible, si.responsible_user_id
ORDER BY total_items DESC
LIMIT 20;

-- 5. Verificar se há índice no campo responsible_user_id
SELECT 
    indexname,
    indexdef
FROM pg_indexes
WHERE tablename = 'sprint_items'
  AND (indexdef LIKE '%responsible%' OR indexname LIKE '%responsible%');

-- 6. Criar índice para responsible_user_id se não existir
CREATE INDEX IF NOT EXISTS idx_sprint_items_responsible_user_id 
ON sprint_items(responsible_user_id);

-- 7. Criar índice simples para campo responsible (btree padrão)
CREATE INDEX IF NOT EXISTS idx_sprint_items_responsible_text 
ON sprint_items(responsible);

-- =========================================
-- DIAGNÓSTICO COMPLETO
-- =========================================
SELECT 
    '=== RESUMO ===' as info;

SELECT 
    'Total de sprint_items' as metrica,
    COUNT(*)::text as valor
FROM sprint_items;

SELECT 
    'Items com responsible preenchido' as metrica,
    COUNT(*)::text as valor
FROM sprint_items
WHERE responsible IS NOT NULL AND responsible != '';

SELECT 
    'Items com responsible_user_id preenchido' as metrica,
    COUNT(*)::text as valor
FROM sprint_items
WHERE responsible_user_id IS NOT NULL;

SELECT 
    'Items sem nenhum responsável' as metrica,
    COUNT(*)::text as valor
FROM sprint_items
WHERE (responsible IS NULL OR responsible = '')
  AND responsible_user_id IS NULL;
