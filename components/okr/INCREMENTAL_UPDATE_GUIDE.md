# 🔧 Guia de Atualização Incremental - OKR v1.4

**Data**: 2026-01-07  
**Objetivo**: Melhorias de backend SEM quebrar o sistema atual

---

## ✅ Garantias de Segurança

Este update é **100% backward compatible**:
- ✅ Não altera tabelas existentes (apenas adiciona colunas)
- ✅ Não modifica RLS policies
- ✅ Não altera dados existentes
- ✅ Frontend atual continua funcionando
- ✅ Triggers opcionais (desabilitados por padrão)
- ✅ Pode ser revertido facilmente

---

## 📋 O Que Será Adicionado

### 1. **Campo `cargo` em `profiles`**
- Para: CEO, Head Comercial, SDR, Closer, etc
- Permite autocomplete de responsável
- Opcional (não quebra se estiver vazio)

### 2. **Campo `is_overdue` em `okrs`**
- Calculado automaticamente
- TRUE se passou do prazo e não foi concluído
- Índice para queries rápidas

### 3. **Soft Delete (Arquivar)**
- Campo `archived` em `okrs` e `sprints`
- Funções `archive_okr()` e `unarchive_okr()`
- Views `active_okrs` e `active_sprints`
- Não perde histórico

### 4. **Audit Log**
- Tabela `okr_audit_log` para rastrear mudanças
- Trigger desabilitado (pode ativar depois)
- Rastreia: quem mudou, quando, de quanto para quanto

### 5. **Auto-Status de KR**
- Função `auto_update_kr_status()` criada
- Trigger desabilitado (pode ativar depois)
- Verde se progresso ≥ 70%, Amarelo ≥ 40%, Vermelho < 40%

### 6. **Dashboard Executivo**
- View `okr_metrics_by_department`
- View `worst_performing_okrs`
- RPC `get_executive_dashboard()`
- RPC `get_okrs_by_department()`

### 7. **Função para Autocomplete**
- `list_users_for_okr()` retorna usuários ativos
- Nome + Cargo + Department
- Ordenado por role e nome

---

## 🚀 Como Executar

### 1. Backup Primeiro (Recomendado)
No Supabase, vá em **Database** → **Backups** e crie um snapshot.

### 2. Execute o SQL
**Arquivo**: `components/okr/sql/okr_v2_incremental_improvements.sql`

1. Abra o **SQL Editor** no Supabase
2. Cole **TODO** o conteúdo do arquivo
3. Clique em **Run**

**Tempo estimado:** 2-3 segundos

### 3. Verifique
```sql
-- Verificar se campos foram criados
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'profiles' 
AND column_name IN ('cargo', 'department');

SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'okrs' 
AND column_name IN ('is_overdue', 'archived');

-- Testar função de usuários
SELECT * FROM list_users_for_okr();

-- Ver métricas por departamento
SELECT * FROM okr_metrics_by_department;
```

---

## 🔄 Ativando Recursos Opcionais

### Ativar Auto-Status de KR (Recomendado)
```sql
CREATE TRIGGER trigger_auto_kr_status
  BEFORE INSERT OR UPDATE OF current_value, target_value ON key_results
  FOR EACH ROW
  EXECUTE FUNCTION auto_update_kr_status();
```

**Efeito:** Ao atualizar `current_value`, o `status` é calculado automaticamente.

### Ativar Audit Log (Opcional)
```sql
CREATE TRIGGER trigger_log_kr_changes
  AFTER UPDATE ON key_results
  FOR EACH ROW
  EXECUTE FUNCTION log_kr_changes();
```

**Efeito:** Toda mudança em KR é registrada em `okr_audit_log`.

---

## 📝 Pós-Execução (Tarefas Manuais)

### 1. Preencher `cargo` dos Usuários
```sql
-- Exemplo:
UPDATE profiles SET cargo = 'CEO' WHERE email = 'geraldo@ggv.com.br';
UPDATE profiles SET cargo = 'Head Comercial' WHERE name LIKE '%Comercial%';
UPDATE profiles SET cargo = 'SDR' WHERE user_function = 'SDR';
```

### 2. Preencher `department` (se houver vazios)
```sql
SELECT id, name, email, department, role 
FROM profiles 
WHERE department IS NULL;

-- Preencher conforme necessário
UPDATE profiles SET department = 'comercial' WHERE ...;
```

---

## 🎯 Próximos Passos no Frontend

Após executar o SQL, posso implementar:

1. **Autocomplete de Responsável**
   - Trocar input por select
   - Buscar de `list_users_for_okr()`

2. **Filtro "Mostrar Arquivados"**
   - Toggle no dashboard
   - Mostra OKRs arquivados em cinza

3. **Interface de Admin**
   - Editar cargo/department de usuários
   - Só para SuperAdmin

4. **Dashboard Executivo**
   - Usar `get_executive_dashboard()`
   - Gráficos por departamento

**Estimativa:** 2-3 horas para implementar no frontend.

---

## ⚠️ Avisos Importantes

1. **Não ative os triggers sem testar**
   - Auto-status pode sobrescrever status manual
   - Audit log pode crescer rápido

2. **Preencha cargo/department**
   - Antes de usar autocomplete
   - Ou deixe opcional por enquanto

3. **Arquivar ≠ Deletar**
   - Use `archive_okr()` ao invés de DELETE
   - Pode recuperar depois com `unarchive_okr()`

---

**Execute o SQL e me avise quando terminar!** 🚀

