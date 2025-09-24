-- CRIAR_TABELA_CACHE.sql
-- Script para criar especificamente a tabela call_analysis_cache

-- 1. Verificar se a tabela já existe
SELECT 
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'call_analysis_cache') 
        THEN 'ℹ️ Tabela call_analysis_cache JÁ EXISTE' 
        ELSE '❌ Tabela call_analysis_cache NÃO EXISTE - Criando agora...' 
    END as status;

-- 2. Criar a tabela se não existir
CREATE TABLE IF NOT EXISTS call_analysis_cache (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    deal_id TEXT NOT NULL,
    analysis_type TEXT NOT NULL DEFAULT 'comprehensive',
    analysis_content TEXT NOT NULL,
    transcription_summary TEXT,
    call_count INTEGER DEFAULT 0,
    total_duration INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '24 hours'),
    UNIQUE(deal_id, analysis_type)
);

-- 3. Habilitar RLS
ALTER TABLE call_analysis_cache ENABLE ROW LEVEL SECURITY;

-- 4. Criar políticas RLS
DROP POLICY IF EXISTS "Authenticated users can view call analysis" ON call_analysis_cache;
CREATE POLICY "Authenticated users can view call analysis" ON call_analysis_cache 
    FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Service role can manage call analysis" ON call_analysis_cache;
CREATE POLICY "Service role can manage call analysis" ON call_analysis_cache 
    FOR ALL USING (auth.role() = 'service_role');

-- 5. Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_call_analysis_deal_id ON call_analysis_cache(deal_id);
CREATE INDEX IF NOT EXISTS idx_call_analysis_expires_at ON call_analysis_cache(expires_at);
CREATE INDEX IF NOT EXISTS idx_call_analysis_created_at ON call_analysis_cache(created_at DESC);

-- 6. Verificar se foi criada com sucesso
SELECT 
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'call_analysis_cache') 
        THEN '✅ Tabela call_analysis_cache CRIADA COM SUCESSO!' 
        ELSE '❌ ERRO: Tabela call_analysis_cache NÃO FOI CRIADA' 
    END as resultado_final;

-- 7. Mostrar estrutura da tabela
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'call_analysis_cache' 
ORDER BY ordinal_position;

-- 8. Testar a função agora
DO $$
DECLARE
    deleted_count INTEGER;
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'call_analysis_cache') THEN
        SELECT cleanup_expired_call_analysis() INTO deleted_count;
        RAISE NOTICE '✅ Função testada com sucesso! Registros removidos: %', deleted_count;
    ELSE
        RAISE NOTICE '❌ Não é possível testar: tabela não existe';
    END IF;
END $$;
