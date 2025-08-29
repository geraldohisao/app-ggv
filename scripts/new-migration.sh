#!/bin/bash
# new-migration.sh - Gerar nova migração automaticamente

set -e

# Verificar se descrição foi fornecida
if [ -z "$1" ]; then
  echo "❌ Uso: ./new-migration.sh <description>"
  echo "📝 Exemplo: ./new-migration.sh add_user_preferences"
  exit 1
fi

DESCRIPTION=$1
DATABASE_URL=${DATABASE_URL:-"postgresql://postgres.qmlekowxbfbxfskywmx:Grupo@ggv2024@aws-0-us-east-1.pooler.supabase.com:6543/postgres"}

# Obter próximo número de versão
echo "🔍 Obtendo próximo número de versão..."
NEXT_VERSION=$(psql "$DATABASE_URL" -t -c "
  SELECT LPAD((COALESCE(MAX(version::INTEGER), 0) + 1)::TEXT, 3, '0')
  FROM schema_versions;
" 2>/dev/null | tr -d ' ' || echo "001")

if [ -z "$NEXT_VERSION" ]; then
  NEXT_VERSION="001"
fi

FILENAME="${NEXT_VERSION}_${DESCRIPTION}.sql"
FILEPATH="supabase/migrations/$FILENAME"

# Criar diretório se não existir
mkdir -p supabase/migrations

# Gerar arquivo de migração
cat > "$FILEPATH" << EOF
-- $FILENAME
-- MIGRAÇÃO: $DESCRIPTION
-- VERSÃO: $NEXT_VERSION
-- DATA: $(date +%Y-%m-%d)
-- AUTOR: $(whoami)

-- =========================================
-- VERIFICAÇÕES PRÉ-MIGRAÇÃO
-- =========================================

-- Verificar se sistema de versionamento existe
DO \$\$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_name = 'schema_versions'
  ) THEN
    RAISE EXCEPTION 'Sistema de versionamento não encontrado. Execute 000_schema_versioning.sql primeiro.';
  END IF;
END;
\$\$;

-- Verificar versão anterior (se não for a primeira)
DO \$\$
DECLARE
  prev_version TEXT := LPAD((${NEXT_VERSION}::INTEGER - 1)::TEXT, 3, '0');
BEGIN
  IF ${NEXT_VERSION}::INTEGER > 1 THEN
    IF NOT EXISTS (
      SELECT 1 FROM schema_versions 
      WHERE version = prev_version
    ) THEN
      RAISE EXCEPTION 'Migração anterior não aplicada: %', prev_version;
    END IF;
  END IF;
END;
\$\$;

-- =========================================
-- MIGRAÇÃO PRINCIPAL
-- =========================================

-- TODO: Implementar migração aqui
-- Exemplo:
-- CREATE TABLE IF NOT EXISTS nova_tabela (
--   id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
--   nome TEXT NOT NULL,
--   created_at TIMESTAMPTZ DEFAULT NOW()
-- );

-- TODO: Adicionar índices se necessário
-- CREATE INDEX IF NOT EXISTS idx_nova_tabela_nome ON nova_tabela(nome);

-- TODO: Configurar RLS se necessário
-- ALTER TABLE nova_tabela ENABLE ROW LEVEL SECURITY;

-- TODO: Adicionar políticas de segurança
-- CREATE POLICY "Users can view own records" ON nova_tabela
--   FOR SELECT USING (auth.uid() = user_id);

-- TODO: Conceder permissões
-- GRANT SELECT ON nova_tabela TO authenticated;

-- =========================================
-- REGISTRAR VERSÃO
-- =========================================

SELECT register_schema_version(
  '$NEXT_VERSION',
  '$DESCRIPTION',
  NULL -- checksum opcional
);

-- =========================================
-- TESTES PÓS-MIGRAÇÃO
-- =========================================

-- TODO: Adicionar testes de validação
-- Exemplo:
-- DO \$\$
-- BEGIN
--   -- Verificar se tabela foi criada
--   IF NOT EXISTS (
--     SELECT 1 FROM information_schema.tables 
--     WHERE table_name = 'nova_tabela'
--   ) THEN
--     RAISE EXCEPTION 'Tabela nova_tabela não foi criada';
--   END IF;
--   
--   RAISE NOTICE 'Migração $NEXT_VERSION aplicada com sucesso!';
-- END;
-- \$\$;

-- Verificar se migração foi registrada
SELECT 
  'Migração Registrada:' as status,
  version,
  description,
  applied_at
FROM schema_versions 
WHERE version = '$NEXT_VERSION';
EOF

# Gerar arquivo de rollback
ROLLBACK_DIR="supabase/migrations/rollbacks"
mkdir -p "$ROLLBACK_DIR"

cat > "$ROLLBACK_DIR/${NEXT_VERSION}_rollback.sql" << EOF
-- ${NEXT_VERSION}_rollback.sql
-- ROLLBACK: $DESCRIPTION
-- VERSÃO: $NEXT_VERSION
-- DATA: $(date +%Y-%m-%d)

-- =========================================
-- VERIFICAÇÕES PRÉ-ROLLBACK
-- =========================================

DO \$\$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM schema_versions 
    WHERE version = '$NEXT_VERSION'
  ) THEN
    RAISE EXCEPTION 'Migração $NEXT_VERSION não foi aplicada';
  END IF;
END;
\$\$;

-- =========================================
-- ROLLBACK PRINCIPAL
-- =========================================

-- TODO: Implementar rollback aqui
-- Exemplo:
-- DROP TABLE IF EXISTS nova_tabela CASCADE;

-- =========================================
-- REMOVER VERSÃO
-- =========================================

DELETE FROM schema_versions WHERE version = '$NEXT_VERSION';

-- Confirmar rollback
SELECT 'Rollback $NEXT_VERSION executado com sucesso!' as status;
EOF

# Gerar arquivo de teste
TEST_DIR="tests/migrations"
mkdir -p "$TEST_DIR"

cat > "$TEST_DIR/${NEXT_VERSION}_test.sql" << EOF
-- ${NEXT_VERSION}_test.sql
-- TESTES: $DESCRIPTION
-- VERSÃO: $NEXT_VERSION

-- =========================================
-- TESTES DE ESTRUTURA
-- =========================================

DO \$\$
BEGIN
  -- TODO: Adicionar testes específicos da migração
  -- Exemplo:
  
  -- Teste 1: Verificar se tabela existe
  -- IF NOT EXISTS (
  --   SELECT 1 FROM information_schema.tables 
  --   WHERE table_name = 'nova_tabela'
  -- ) THEN
  --   RAISE EXCEPTION 'TESTE FALHOU: Tabela nova_tabela não existe';
  -- END IF;
  
  -- Teste 2: Verificar se função existe
  -- IF NOT EXISTS (
  --   SELECT 1 FROM pg_proc 
  --   WHERE proname = 'nova_funcao'
  -- ) THEN
  --   RAISE EXCEPTION 'TESTE FALHOU: Função nova_funcao não existe';
  -- END IF;
  
  -- Teste 3: Verificar se índice existe
  -- IF NOT EXISTS (
  --   SELECT 1 FROM pg_indexes 
  --   WHERE indexname = 'idx_nova_tabela_nome'
  -- ) THEN
  --   RAISE EXCEPTION 'TESTE FALHOU: Índice idx_nova_tabela_nome não existe';
  -- END IF;
  
  RAISE NOTICE 'TODOS OS TESTES PASSARAM para migração $NEXT_VERSION';
END;
\$\$;

-- =========================================
-- TESTES DE DADOS
-- =========================================

-- TODO: Adicionar testes de dados se necessário
-- SELECT 'Teste de dados:' as test, COUNT(*) as records FROM nova_tabela;

-- =========================================
-- TESTES DE PERFORMANCE
-- =========================================

-- TODO: Adicionar testes de performance se necessário
-- EXPLAIN ANALYZE SELECT * FROM nova_tabela WHERE nome = 'test';
EOF

echo "✅ Arquivos criados:"
echo "   📄 Migração: $FILEPATH"
echo "   🔙 Rollback: $ROLLBACK_DIR/${NEXT_VERSION}_rollback.sql"
echo "   🧪 Teste: $TEST_DIR/${NEXT_VERSION}_test.sql"
echo ""
echo "📝 Próximos passos:"
echo "   1. Editar $FILEPATH e implementar a migração"
echo "   2. Editar o rollback correspondente"
echo "   3. Executar: ./scripts/run-migration.sh $NEXT_VERSION"
echo "   4. Testar: ./scripts/test-migration.sh $NEXT_VERSION"
