-- ============================================
-- ADICIONAR SUPORTE A FOTOS DO GOOGLE WORKSPACE
-- ============================================

-- Verificar se coluna avatar_url já existe
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'profiles' 
  AND column_name = 'avatar_url';

-- Adicionar coluna para armazenar URL da foto (se não existir)
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- Adicionar índice para performance
CREATE INDEX IF NOT EXISTS idx_profiles_avatar 
ON profiles(avatar_url) 
WHERE avatar_url IS NOT NULL;

-- Comentário
COMMENT ON COLUMN profiles.avatar_url IS 'URL da foto do Google Workspace ou upload manual';

-- Verificar estrutura
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'profiles'
    AND column_name IN ('avatar_url', 'name', 'email', 'cargo')
ORDER BY ordinal_position;

DO $$
BEGIN
  RAISE NOTICE '✅ Coluna avatar_url adicionada à tabela profiles!';
  RAISE NOTICE '';
  RAISE NOTICE '🎯 Próximos passos:';
  RAISE NOTICE '  1. Reimportar do Google Workspace';
  RAISE NOTICE '     → Vai salvar as fotos automaticamente';
  RAISE NOTICE '  2. Recarregar organograma';
  RAISE NOTICE '     → Fotos aparecerão no lugar das iniciais';
  RAISE NOTICE '';
END $$;

