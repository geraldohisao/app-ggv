-- 🔍 VERIFICAR: Estrutura da tabela analysis_queue
-- Verifica quais colunas existem na tabela

-- 1. Verificar estrutura da tabela analysis_queue
SELECT 'Estrutura da tabela analysis_queue:' as info;
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'analysis_queue'
ORDER BY ordinal_position;

-- 2. Verificar se a tabela existe
SELECT 'Verificação de existência da tabela:' as info;
SELECT 
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'analysis_queue') 
        THEN '✅ Tabela analysis_queue existe'
        ELSE '❌ Tabela analysis_queue NÃO existe'
    END as status_tabela;

-- 3. Verificar dados atuais na tabela (se existir)
SELECT 'Dados atuais na tabela analysis_queue:' as info;
SELECT 
    COUNT(*) as total_registros,
    COUNT(CASE WHEN status = 'pending' THEN 1 END) as pendentes,
    COUNT(CASE WHEN status = 'processing' THEN 1 END) as processando,
    COUNT(CASE WHEN status = 'completed' THEN 1 END) as concluidas,
    COUNT(CASE WHEN status = 'failed' THEN 1 END) as falharam
FROM analysis_queue;
