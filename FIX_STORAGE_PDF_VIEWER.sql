-- =========================================
-- FIX: Políticas de Storage para Visualização de PDF
-- =========================================
-- Execute este SQL se o PDF não estiver carregando na página de assinatura

-- 1. Verificar políticas atuais do storage
SELECT 
    schemaname,
    tablename,
    policyname,
    cmd as operation
FROM pg_policies 
WHERE schemaname = 'storage' 
AND tablename = 'objects'
AND policyname LIKE '%service%'
ORDER BY policyname;

-- 2. Adicionar política para usuários NÃO AUTENTICADOS verem PDFs
-- (Necessário para assinantes externos)

DROP POLICY IF EXISTS "public_download_service_orders" ON storage.objects;

CREATE POLICY "public_download_service_orders"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'service-orders');

-- 3. Verificar se o bucket existe e está configurado corretamente
SELECT 
    id,
    name,
    public as "Público",
    file_size_limit as "Limite de Tamanho"
FROM storage.buckets 
WHERE id = 'service-orders';

-- 4. ALTERNATIVA: Tornar o bucket público (mais fácil)
-- Descomente se preferir esta abordagem:

-- UPDATE storage.buckets 
-- SET public = true 
-- WHERE id = 'service-orders';

-- 5. Verificar resultado
SELECT 
    'Política criada:' as status,
    policyname
FROM pg_policies 
WHERE schemaname = 'storage' 
AND tablename = 'objects'
AND policyname = 'public_download_service_orders';

