# 🗄️ Sistema de Migrações SQL - Calls System

## 📋 Estrutura de Arquivos

```
supabase/migrations/
├── README.md                           # Este arquivo
├── 000_schema_versioning.sql          # Sistema de versionamento
├── 001_calls_base_tables.sql          # Tabelas base do sistema
├── 002_calls_enriched_view.sql        # View materializada
├── 003_cache_system.sql               # Sistema de cache
├── 004_fulltext_search.sql            # Busca full-text
├── 005_auto_refresh_system.sql        # Auto-refresh
├── 006_performance_indexes.sql        # Índices de performance
├── 007_audit_system.sql               # Sistema de auditoria
├── 008_monitoring_views.sql           # Views de monitoramento
├── 009_cleanup_functions.sql          # Funções de limpeza
├── rollbacks/                         # Scripts de rollback
│   ├── 009_rollback.sql
│   ├── 008_rollback.sql
│   └── ...
└── seeds/                             # Dados iniciais
    ├── test_data.sql
    └── production_data.sql
```

## 🔄 Convenções de Nomenclatura

### Formato dos Arquivos
```
{version}_{description}.sql
```

- **version**: Número sequencial com 3 dígitos (001, 002, 003...)
- **description**: Descrição curta em snake_case
- **Exemplos**: `001_calls_base_tables.sql`, `002_add_search_indexes.sql`

### Tipos de Migração
- **`0xx`**: Estrutura base (tabelas, views, funções core)
- **`1xx`**: Funcionalidades (features, melhorias)
- **`2xx`**: Performance (índices, otimizações)
- **`3xx`**: Segurança (RLS, permissões)
- **`4xx`**: Integrações (APIs, webhooks)
- **`9xx`**: Manutenção (cleanup, refactoring)

## 📝 Template de Migração

```sql
-- {version}_{description}.sql
-- MIGRAÇÃO: {Descrição detalhada}
-- VERSÃO: {version}
-- DATA: {YYYY-MM-DD}
-- AUTOR: {nome}

-- =========================================
-- VERIFICAÇÕES PRÉ-MIGRAÇÃO
-- =========================================

-- Verificar versão anterior
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM schema_versions 
    WHERE version = '{version_anterior}'
  ) THEN
    RAISE EXCEPTION 'Migração anterior não aplicada: %', '{version_anterior}';
  END IF;
END;
$$;

-- =========================================
-- MIGRAÇÃO PRINCIPAL
-- =========================================

-- [Código da migração aqui]

-- =========================================
-- REGISTRAR VERSÃO
-- =========================================

SELECT register_schema_version(
  '{version}',
  '{description}',
  '{checksum_opcional}'
);

-- =========================================
-- TESTES PÓS-MIGRAÇÃO
-- =========================================

-- [Testes de validação aqui]
```

## 🚀 Como Executar Migrações

### 1. Executar Migração Individual
```bash
# Via Supabase CLI
supabase db reset --linked

# Via SQL Editor (Supabase Dashboard)
# Copiar e colar o conteúdo do arquivo
```

### 2. Executar Múltiplas Migrações
```bash
# Script bash para executar em ordem
./scripts/run-migrations.sh
```

### 3. Verificar Status
```sql
-- Ver migrações aplicadas
SELECT * FROM schema_versions ORDER BY applied_at DESC;

-- Ver próxima migração necessária
SELECT 'Próxima migração: ' || (
  SELECT LPAD((MAX(version::INTEGER) + 1)::TEXT, 3, '0')
  FROM schema_versions
);
```

## 🔙 Sistema de Rollback

### Estrutura de Rollback
```sql
-- rollbacks/{version}_rollback.sql
-- ROLLBACK: {description}
-- VERSÃO: {version}

-- =========================================
-- VERIFICAÇÕES PRÉ-ROLLBACK
-- =========================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM schema_versions 
    WHERE version = '{version}'
  ) THEN
    RAISE EXCEPTION 'Migração % não foi aplicada', '{version}';
  END IF;
END;
$$;

-- =========================================
-- ROLLBACK PRINCIPAL
-- =========================================

-- [Código de rollback aqui]

-- =========================================
-- REMOVER VERSÃO
-- =========================================

DELETE FROM schema_versions WHERE version = '{version}';
```

### Executar Rollback
```sql
-- Rollback da última migração
\i rollbacks/009_rollback.sql
```

## 📊 Monitoramento de Migrações

### View de Status
```sql
CREATE OR REPLACE VIEW migration_status AS
SELECT 
  sv.version,
  sv.description,
  sv.applied_at,
  sv.applied_by,
  sv.execution_time_ms,
  CASE 
    WHEN sv.execution_time_ms > 30000 THEN 'slow'
    WHEN sv.execution_time_ms > 10000 THEN 'moderate'
    ELSE 'fast'
  END as performance_category
FROM schema_versions sv
ORDER BY sv.version DESC;
```

### Função de Health Check
```sql
CREATE OR REPLACE FUNCTION check_migration_health()
RETURNS TABLE (
  status TEXT,
  latest_version TEXT,
  total_migrations INTEGER,
  avg_execution_time_ms NUMERIC
)
LANGUAGE sql
AS $$
  SELECT 
    CASE 
      WHEN COUNT(*) = 0 THEN 'no_migrations'
      WHEN MAX(applied_at) < NOW() - INTERVAL '30 days' THEN 'stale'
      ELSE 'healthy'
    END as status,
    MAX(version) as latest_version,
    COUNT(*)::INTEGER as total_migrations,
    AVG(execution_time_ms) as avg_execution_time_ms
  FROM schema_versions;
$$;
```

## 🧪 Testes de Migração

### Template de Teste
```sql
-- tests/migration_{version}_test.sql

-- Teste 1: Verificar estruturas criadas
DO $$
BEGIN
  -- Verificar tabela existe
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'nova_tabela') THEN
    RAISE EXCEPTION 'Tabela nova_tabela não foi criada';
  END IF;
  
  -- Verificar função existe
  IF NOT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'nova_funcao') THEN
    RAISE EXCEPTION 'Função nova_funcao não foi criada';
  END IF;
  
  RAISE NOTICE 'Teste 1: PASSOU';
END;
$$;

-- Teste 2: Verificar dados
DO $$
DECLARE
  record_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO record_count FROM nova_tabela;
  
  IF record_count < 0 THEN
    RAISE EXCEPTION 'Dados não foram inseridos corretamente';
  END IF;
  
  RAISE NOTICE 'Teste 2: PASSOU - % registros encontrados', record_count;
END;
$$;
```

## 🔧 Scripts Utilitários

### 1. Gerar Nova Migração
```bash
#!/bin/bash
# scripts/new-migration.sh

NEXT_VERSION=$(psql $DATABASE_URL -t -c "
  SELECT LPAD((COALESCE(MAX(version::INTEGER), 0) + 1)::TEXT, 3, '0')
  FROM schema_versions;
" | tr -d ' ')

DESCRIPTION=$1
FILENAME="${NEXT_VERSION}_${DESCRIPTION}.sql"

cat > "supabase/migrations/$FILENAME" << EOF
-- $FILENAME
-- MIGRAÇÃO: $DESCRIPTION
-- VERSÃO: $NEXT_VERSION
-- DATA: $(date +%Y-%m-%d)

-- =========================================
-- VERIFICAÇÕES PRÉ-MIGRAÇÃO
-- =========================================

-- TODO: Adicionar verificações necessárias

-- =========================================
-- MIGRAÇÃO PRINCIPAL
-- =========================================

-- TODO: Implementar migração

-- =========================================
-- REGISTRAR VERSÃO
-- =========================================

SELECT register_schema_version(
  '$NEXT_VERSION',
  '$DESCRIPTION'
);

-- =========================================
-- TESTES PÓS-MIGRAÇÃO
-- =========================================

-- TODO: Adicionar testes de validação
EOF

echo "✅ Migração criada: $FILENAME"
```

### 2. Executar Todas as Migrações
```bash
#!/bin/bash
# scripts/run-migrations.sh

for file in supabase/migrations/[0-9]*.sql; do
  echo "🔄 Executando: $file"
  psql $DATABASE_URL -f "$file"
  
  if [ $? -eq 0 ]; then
    echo "✅ Sucesso: $file"
  else
    echo "❌ Erro: $file"
    exit 1
  fi
done

echo "🎉 Todas as migrações executadas com sucesso!"
```

### 3. Verificar Integridade
```bash
#!/bin/bash
# scripts/check-migrations.sh

echo "📊 Status das Migrações:"
psql $DATABASE_URL -c "SELECT * FROM migration_status;"

echo ""
echo "🏥 Health Check:"
psql $DATABASE_URL -c "SELECT * FROM check_migration_health();"
```

## 📋 Checklist de Migração

### Antes de Criar
- [ ] Verificar se a mudança é necessária
- [ ] Planejar rollback strategy
- [ ] Considerar impacto em performance
- [ ] Verificar dependências

### Durante a Criação
- [ ] Seguir template padrão
- [ ] Adicionar verificações pré-migração
- [ ] Incluir testes pós-migração
- [ ] Documentar mudanças complexas

### Antes de Executar
- [ ] Testar em ambiente de desenvolvimento
- [ ] Fazer backup do banco
- [ ] Verificar horário de menor uso
- [ ] Preparar rollback se necessário

### Após Executar
- [ ] Verificar logs de execução
- [ ] Executar testes de validação
- [ ] Monitorar performance
- [ ] Documentar problemas encontrados

## 🚨 Troubleshooting

### Migração Falhou
```sql
-- Ver erro da última migração
SELECT * FROM schema_versions 
WHERE applied_at = (SELECT MAX(applied_at) FROM schema_versions);

-- Executar rollback se necessário
\i rollbacks/XXX_rollback.sql
```

### Migração Lenta
```sql
-- Ver migrações mais lentas
SELECT version, description, execution_time_ms
FROM schema_versions 
WHERE execution_time_ms > 10000
ORDER BY execution_time_ms DESC;
```

### Verificar Dependências
```sql
-- Ver objetos que dependem de uma tabela
SELECT 
  schemaname,
  tablename,
  indexname
FROM pg_indexes 
WHERE tablename = 'calls';
```
