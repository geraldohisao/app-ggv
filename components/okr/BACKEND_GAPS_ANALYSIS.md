# 🔍 Análise de Gaps de Backend - Sistema OKR

**Data**: 2026-01-07  
**Versão Atual**: v1.3  
**Status**: Sistema funcional, mas com oportunidades de melhoria

---

## ✅ O Que Já Funciona (Backend Atual)

- ✅ Tabelas: `okrs`, `key_results`, `sprints`, `sprint_items`
- ✅ RLS policies (CEO/HEAD/OP)
- ✅ Key Results robustos (type, direction, start_value, activity)
- ✅ Funções de cálculo de progresso
- ✅ Views otimizadas (`okrs_with_progress`, `sprints_with_metrics`)
- ✅ Seeds de exemplo

---

## 🔴 Gaps Críticos (Bloqueadores para Produção)

### 1. **Gestão de Usuários/Profiles** ⚠️ **ALTA PRIORIDADE**

**Problema Atual:**
- Campo `owner` é texto livre → pode ter "João Silva", "joao", "CEO", etc (inconsistente)
- Campo `department` existe em `profiles` mas pode não estar preenchido para todos
- Usuários não têm `cargo` definido (CEO, Head, SDR, etc)

**O Que Falta:**

#### A. Campos em `profiles`
```sql
-- Já existe:
ALTER TABLE profiles ADD COLUMN department TEXT; -- ✅ JÁ FEITO

-- Precisa adicionar:
ALTER TABLE profiles ADD COLUMN cargo TEXT;
ALTER TABLE profiles ADD COLUMN area TEXT; -- Opcional, se tiver subáreas
```

**Valores sugeridos para `cargo`:**
- CEO
- Head Comercial
- Head Marketing
- Head Projetos
- Gerente
- SDR
- Closer
- Analista

#### B. Populate inicial de `department` e `cargo`
```sql
-- Garantir que todos os profiles tenham department
UPDATE profiles 
SET department = 'geral' 
WHERE department IS NULL AND role = 'SUPER_ADMIN';

UPDATE profiles 
SET department = 'comercial' 
WHERE department IS NULL AND user_function IN ('SDR', 'Closer');
```

#### C. Interface de Admin para editar usuários
**Criar em `SettingsPage` ou novo módulo "Admin":**
- Listar todos os usuários
- Editar: `department`, `cargo`, `role`
- Buscar usuário por nome/email
- Desativar usuário

#### D. Autocomplete de Responsável
No formulário de OKR, ao invés de `<input>` livre:
```typescript
<select>
  <option value="">Selecione o responsável</option>
  {users.map(u => (
    <option value={u.name}>{u.name} - {u.cargo}</option>
  ))}
</select>
```

**SQL Helper:**
```sql
CREATE OR REPLACE FUNCTION list_active_users_for_okr()
RETURNS TABLE (
  id UUID,
  name TEXT,
  cargo TEXT,
  department TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT p.id, p.name, p.cargo, p.department
  FROM profiles p
  WHERE p.is_active = true
  ORDER BY p.name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

---

### 2. **Auto-Cálculo de Status de KR** ⚠️ **MÉDIA PRIORIDADE**

**Problema Atual:**
- Status (verde/amarelo/vermelho) é manual
- Usuário pode esquecer de atualizar

**Solução:**
Trigger que auto-calcula status baseado no progresso:

```sql
CREATE OR REPLACE FUNCTION auto_update_kr_status()
RETURNS TRIGGER AS $$
DECLARE
  progress INTEGER;
BEGIN
  -- Calcular progresso
  progress := calculate_kr_progress(
    NEW.type,
    NEW.direction,
    NEW.start_value,
    NEW.current_value,
    NEW.target_value,
    NEW.activity_done
  );
  
  -- Auto-definir status
  IF progress >= 70 THEN
    NEW.status := 'verde';
  ELSIF progress >= 40 THEN
    NEW.status := 'amarelo';
  ELSE
    NEW.status := 'vermelho';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_auto_kr_status
  BEFORE INSERT OR UPDATE ON key_results
  FOR EACH ROW
  EXECUTE FUNCTION auto_update_kr_status();
```

**Benefício:**
- Status sempre consistente
- Menos erro humano
- Atualização automática

---

### 3. **Marcar OKRs Atrasados Automaticamente** ⚠️ **MÉDIA PRIORIDADE**

**Problema Atual:**
- Campo `is_overdue` é calculado no frontend
- Não há notificação automática

**Solução:**

#### A. Adicionar campo `is_overdue` em `okrs`
```sql
ALTER TABLE okrs ADD COLUMN is_overdue BOOLEAN GENERATED ALWAYS AS (
  end_date < CURRENT_DATE AND status != 'concluído'
) STORED;

CREATE INDEX idx_okrs_overdue ON okrs(is_overdue) WHERE is_overdue = true;
```

#### B. Notificações (opcional, v2)
```sql
-- Cron job ou função chamada diariamente
CREATE OR REPLACE FUNCTION notify_overdue_okrs()
RETURNS void AS $$
BEGIN
  -- Inserir notificações para OKRs atrasados
  INSERT INTO notifications (user_id, type, message, link)
  SELECT 
    user_id,
    'okr_overdue',
    'OKR "' || objective || '" está atrasado!',
    '/okr?id=' || id
  FROM okrs
  WHERE is_overdue = true
  AND status != 'concluído';
END;
$$ LANGUAGE plpgsql;
```

---

## 🟡 Melhorias Importantes (Nice to Have)

### 4. **Audit Log / Histórico de Mudanças** 🟡

**Motivo:**
- Rastrear quem mudou um KR de 50 para 100
- Ver evolução de `current_value` ao longo do tempo
- Compliance e transparência

**Implementação:**
```sql
CREATE TABLE okr_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  okr_id UUID REFERENCES okrs(id) ON DELETE CASCADE,
  kr_id UUID REFERENCES key_results(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id),
  action TEXT NOT NULL, -- 'create', 'update', 'delete'
  field_changed TEXT,
  old_value TEXT,
  new_value TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Trigger para capturar mudanças
CREATE OR REPLACE FUNCTION log_kr_changes()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    IF OLD.current_value != NEW.current_value THEN
      INSERT INTO okr_audit_log (kr_id, user_id, action, field_changed, old_value, new_value)
      VALUES (NEW.id, auth.uid(), 'update', 'current_value', OLD.current_value::TEXT, NEW.current_value::TEXT);
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

---

### 5. **Soft Delete (Arquivar ao Invés de Deletar)** 🟡

**Problema:**
- DELETE permanente perde histórico
- Não dá pra "recuperar" um OKR deletado por engano

**Solução:**
```sql
ALTER TABLE okrs ADD COLUMN archived BOOLEAN DEFAULT FALSE;
ALTER TABLE sprints ADD COLUMN archived BOOLEAN DEFAULT FALSE;

-- Views para filtrar automaticamente
CREATE VIEW active_okrs AS
SELECT * FROM okrs WHERE archived = FALSE;

CREATE VIEW active_sprints AS
SELECT * FROM sprints WHERE archived = FALSE;

-- Função para arquivar (ao invés de deletar)
CREATE OR REPLACE FUNCTION archive_okr(okr_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
  UPDATE okrs SET archived = TRUE WHERE id = okr_uuid;
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql;
```

**Frontend:**
- Função `deleteOKR()` vira `archiveOKR()`
- Adicionar filtro "Mostrar arquivados" no dashboard

---

### 6. **Dashboard Executivo (Agregações)** 🟡

**O Que Criar:**

```sql
-- Métricas agregadas por departamento
CREATE VIEW okr_metrics_by_department AS
SELECT 
  department,
  COUNT(*) AS total_okrs,
  AVG(calculate_okr_progress(id)) AS avg_progress,
  SUM(CASE WHEN is_overdue THEN 1 ELSE 0 END) AS overdue_count,
  SUM(CASE WHEN status = 'concluído' THEN 1 ELSE 0 END) AS completed_count
FROM okrs
WHERE archived = FALSE
GROUP BY department;

-- Top 10 OKRs com pior performance
CREATE VIEW worst_performing_okrs AS
SELECT 
  id,
  objective,
  owner,
  department,
  calculate_okr_progress(id) AS progress,
  end_date
FROM okrs
WHERE status != 'concluído'
AND archived = FALSE
ORDER BY calculate_okr_progress(id) ASC
LIMIT 10;
```

**RPC para o frontend:**
```sql
CREATE OR REPLACE FUNCTION get_okr_dashboard_metrics()
RETURNS JSON AS $$
BEGIN
  RETURN json_build_object(
    'by_department', (SELECT json_agg(row_to_json(t)) FROM okr_metrics_by_department t),
    'worst_performing', (SELECT json_agg(row_to_json(t)) FROM worst_performing_okrs t),
    'total_krs', (SELECT COUNT(*) FROM key_results),
    'krs_at_risk', (SELECT COUNT(*) FROM key_results WHERE status = 'vermelho')
  );
END;
$$ LANGUAGE plpgsql;
```

---

## 🟢 Melhorias Futuras (v2.0)

### 7. **Notificações Automáticas** 🟢

- OKR criado → notificar responsável
- KR ficou vermelho → notificar owner + gestor
- Sprint próxima do fim → notificar participantes
- OKR atrasado → notificar diariamente

### 8. **Integração com Pipedrive** 🟢

- Importar metas de vendas como OKRs
- Sync automático de métricas (receita, SQL gerados)
- Atualizar `current_value` automaticamente

### 9. **Export/Import** 🟢

- Exportar OKRs para Excel/CSV
- Importar OKRs em massa (upload de planilha)
- Backup/restore completo

### 10. **Versionamento de OKRs** 🟢

- Snapshot automático ao salvar
- Ver versões antigas
- Comparar mudanças
- Restaurar versão anterior

---

## 📋 Roadmap Sugerido

### Fase 1: Essenciais (1-2 dias)
- [ ] Preencher `department` em todos os `profiles`
- [ ] Adicionar campo `cargo` em `profiles`
- [ ] Interface de admin para editar usuários
- [ ] Autocomplete de responsável no formulário

### Fase 2: Automações (1 dia)
- [ ] Trigger de auto-status de KR
- [ ] Campo `is_overdue` gerado automaticamente
- [ ] Views de métricas por departamento

### Fase 3: Audit e Segurança (1 dia)
- [ ] Audit log de mudanças
- [ ] Soft delete (arquivar)
- [ ] Filtro "Mostrar arquivados"

### Fase 4: Futuro (v2.0)
- [ ] Notificações automáticas
- [ ] Integração Pipedrive
- [ ] Export/Import
- [ ] Versionamento

---

## 🎯 Priorização (O Que Fazer Agora)

### 🔴 **CRÍTICO (fazer antes de produção):**

1. **Garantir que todos os usuários têm `department` preenchido**
   ```sql
   SELECT id, name, email, department, role 
   FROM profiles 
   WHERE department IS NULL;
   
   -- Se houver, preencher manualmente ou via script
   ```

2. **Adicionar campo `cargo` em `profiles`**
   ```sql
   ALTER TABLE profiles ADD COLUMN cargo TEXT;
   COMMENT ON COLUMN profiles.cargo IS 'Cargo do usuário (CEO, Head, SDR, etc)';
   ```

3. **Interface de Admin (Settings)**
   - Página para editar usuários
   - Campos: name, department, cargo, role
   - Só acessível para SuperAdmin

### 🟡 **IMPORTANTE (fazer logo após):**

4. **Autocomplete de Responsável**
   - Trocar input livre por select com usuários do sistema
   - Mostra: Nome + Cargo + Departamento

5. **Auto-status de KR**
   - Trigger que calcula status baseado no progresso
   - Remove trabalho manual

### 🟢 **MELHORIAS (pode fazer depois):**

6. Audit log
7. Soft delete
8. Notificações
9. Integrações

---

## 📝 SQL Para Executar Agora

### Script de Setup Inicial

```sql
-- 1. Adicionar campo cargo
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS cargo TEXT;

-- 2. Preencher departments vazios com default
UPDATE profiles 
SET department = 'geral' 
WHERE department IS NULL AND role = 'SUPER_ADMIN';

-- 3. Criar função para listar usuários
CREATE OR REPLACE FUNCTION list_users_for_okr()
RETURNS TABLE (
  id UUID,
  name TEXT,
  email TEXT,
  cargo TEXT,
  department TEXT,
  role TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT p.id, p.name, p.email, p.cargo, p.department, p.role
  FROM profiles p
  WHERE p.is_active = TRUE
  ORDER BY 
    CASE p.role
      WHEN 'SUPER_ADMIN' THEN 1
      WHEN 'ADMIN' THEN 2
      ELSE 3
    END,
    p.name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION list_users_for_okr() TO authenticated;

-- 4. Trigger para auto-status de KR (opcional, mas recomendado)
CREATE OR REPLACE FUNCTION auto_update_kr_status()
RETURNS TRIGGER AS $$
DECLARE
  progress INTEGER;
BEGIN
  -- Calcular progresso
  progress := calculate_kr_progress(
    NEW.type,
    NEW.direction,
    NEW.start_value,
    NEW.current_value,
    NEW.target_value,
    NEW.activity_done
  );
  
  -- Auto-definir status baseado no progresso
  IF progress >= 70 THEN
    NEW.status := 'verde';
  ELSIF progress >= 40 THEN
    NEW.status := 'amarelo';
  ELSE
    NEW.status := 'vermelho';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_auto_kr_status ON key_results;
CREATE TRIGGER trigger_auto_kr_status
  BEFORE INSERT OR UPDATE OF current_value, target_value ON key_results
  FOR EACH ROW
  EXECUTE FUNCTION auto_update_kr_status();

-- 5. Campo is_overdue automático
ALTER TABLE okrs ADD COLUMN IF NOT EXISTS is_overdue BOOLEAN 
  GENERATED ALWAYS AS (
    end_date < CURRENT_DATE AND status != 'concluído'
  ) STORED;

CREATE INDEX IF NOT EXISTS idx_okrs_overdue ON okrs(is_overdue) 
  WHERE is_overdue = true;
```

---

## 🎯 Decisões que Você Precisa Tomar

### 1. **Cargos fixos ou livres?**
- **Opção A**: Lista fixa (CEO, Head, SDR...) → mais consistente
- **Opção B**: Texto livre → mais flexível
- **Recomendação**: Opção A (lista fixa)

### 2. **Status de KR manual ou automático?**
- **Opção A**: Usuário escolhe manualmente → mais controle
- **Opção B**: Sistema calcula automaticamente → menos trabalho
- **Opção C**: Sistema sugere, usuário confirma → balanceado
- **Recomendação**: Opção B (automático via trigger)

### 3. **Interface de Admin para usuários?**
- **Precisa?** Sim, para preencher department/cargo de todos
- **Onde?** SettingsPage ou novo módulo "Admin"
- **Quando?** Antes de produção (bloqueador)

---

## 📊 Estimativa de Tempo

| Item | Esforço | Prioridade |
|------|---------|------------|
| SQL: campo cargo + populate | 15 min | 🔴 Alta |
| Frontend: autocomplete responsável | 1h | 🔴 Alta |
| Interface admin de usuários | 3h | 🔴 Alta |
| Trigger auto-status KR | 30 min | 🟡 Média |
| Campo is_overdue automático | 15 min | 🟡 Média |
| Audit log | 2h | 🟢 Baixa |
| Soft delete | 1h | 🟢 Baixa |

**Total para produção:** ~5 horas

---

## ✅ Próximos Passos

1. **Você decide:**
   - Implementar agora (5h) ou
   - Lançar v1.3 como está e iterar depois?

2. **Se implementar agora:**
   - Execute o SQL acima
   - Preencha manualmente department/cargo dos usuários
   - Eu implemento o autocomplete e interface de admin

3. **Se lançar como está:**
   - Funciona 100% (apenas owner é texto livre)
   - Pode melhorar depois sem quebrar nada

**Qual caminho prefere?** 🤔

