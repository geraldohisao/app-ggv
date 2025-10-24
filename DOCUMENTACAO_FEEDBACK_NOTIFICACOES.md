# 🔔 Sistema de Notificações de Feedback - Documentação

## 📋 Problema Identificado

**Sintoma:** Feedback criado mas notificação não chegou para a Hiara

**Causa Raiz:** 
- Feedback foi salvo com `sdr_id: null`
- Sistema de notificações só mostra feedbacks quando `sdr_id` está preenchido
- Chamada tem `agent_id` (email) mas não `sdr_id` (UUID)

## 🔍 Análise dos Logs

```javascript
// Feedback salvo:
{
  id: '2bb96ab5-ed71-4a11-b932-f8470022d818',
  call_id: '798ce977-62c3-4962-bffa-14e09f02ad15',
  sdr_id: null,  // ❌ PROBLEMA AQUI
  author_id: '7133c0d3-9fce-4e2b-97c5-55d3feba88ac',
  content: 'teste feedback'
}
```

## 🔧 Solução Implementada

### 1. **Função de Mapeamento**
```sql
CREATE FUNCTION get_sdr_uuid_from_email(p_email TEXT)
-- Converte email (agent_id) → UUID (profiles.id)
```

### 2. **Trigger Automático**
```sql
CREATE TRIGGER trg_populate_feedback_sdr_id
-- Popula sdr_id automaticamente ao inserir feedback
```

### 3. **Correção Retroativa**
```sql
UPDATE call_feedbacks
-- Corrige feedbacks existentes sem sdr_id
```

### 4. **Melhoria na RPC**
```sql
CREATE FUNCTION get_recent_feedbacks_with_calls
-- Busca notificações com dados do autor real
```

## 📝 Arquivos Criados

1. **`FIX_FEEDBACK_NOTIFICACOES_COMPLETO.sql`** ⭐ PRINCIPAL
   - Script completo com diagnóstico, correção e verificação
   - Execute este no Supabase SQL Editor
   
2. **`VERIFICAR_E_CORRIGIR_FEEDBACK_NOTIFICACOES.sql`**
   - Versão mais simples focada no problema específico

## 🚀 Como Aplicar a Correção

### Passo 1: Executar o Script SQL

1. Abra o **Supabase Dashboard**
2. Vá em **SQL Editor**
3. Copie o conteúdo de `FIX_FEEDBACK_NOTIFICACOES_COMPLETO.sql`
4. Cole e clique em **Run**

### Passo 2: Verificar Resultados

O script mostrará várias verificações:

```
✅ VERIFICAÇÃO 1 - Feedback corrigido
→ Deve mostrar o feedback com sdr_id preenchido

✅ VERIFICAÇÃO 2 - Estatísticas
→ Deve mostrar 100% dos feedbacks com sdr_id

✅ VERIFICAÇÃO 4 - Notificações da Hiara
→ Deve listar o feedback que você enviou
```

### Passo 3: Testar no Frontend

1. Peça para a Hiara fazer **logout/login** ou recarregar a página
2. A notificação deve aparecer no sino 🔔
3. Contador deve mostrar 1 notificação não lida

## 🎯 Garantias Após Correção

✅ **Feedback atual corrigido**
- O feedback "teste feedback" agora tem `sdr_id` da Hiara

✅ **Notificação aparecerá**
- Sistema busca feedbacks onde `sdr_id = auth.uid()`

✅ **Futuros feedbacks automáticos**
- Trigger popula `sdr_id` automaticamente

✅ **Feedbacks antigos corrigidos**
- Script atualiza retroativamente todos os feedbacks

## 🏗️ Arquitetura do Sistema

### Fluxo de Criação de Feedback

```
1. Usuário escreve feedback
   ↓
2. Frontend envia para Supabase
   {
     call_id: "...",
     sdr_id: null,  // Pode ser null
     author_id: "...",
     content: "..."
   }
   ↓
3. ⚡ TRIGGER: populate_feedback_sdr_id
   - Busca chamada pelo call_id
   - Pega agent_id (email) da chamada
   - Converte email → UUID via get_sdr_uuid_from_email()
   - Popula sdr_id automaticamente
   ↓
4. Feedback salvo com sdr_id correto
```

### Fluxo de Notificações

```
1. Frontend chama get_recent_feedbacks_with_calls()
   ↓
2. RPC retorna feedbacks onde:
   - sdr_id = auth.uid() (usuário logado)
   - author_id != auth.uid() (não é o próprio usuário)
   ↓
3. Hook useNotifications processa e exibe
   ↓
4. Sino 🔔 mostra contador de não lidas
```

## 🔍 Tabelas Envolvidas

### `call_feedbacks`
```sql
id UUID              -- ID do feedback
call_id UUID         -- Referência para calls
sdr_id UUID          -- UUID do SDR (perfil)
author_id UUID       -- UUID do autor (perfil)
content TEXT         -- Conteúdo do feedback
is_read BOOLEAN      -- Lida/não lida
created_at TIMESTAMP
```

### `calls`
```sql
id UUID
agent_id TEXT        -- Email do SDR (ex: "hiara@grupoggv.com")
sdr_id UUID          -- UUID do SDR (deve ser preenchido)
enterprise TEXT
person TEXT
duration_formated TEXT
```

### `profiles`
```sql
id UUID              -- UUID único do usuário
email TEXT           -- Email (usado para mapear agent_id)
full_name TEXT
```

## 🧪 Como Testar

### Teste 1: Criar Novo Feedback
1. Vá em uma chamada
2. Escreva um feedback
3. Salve
4. Verifique no banco: `sdr_id` deve estar preenchido

### Teste 2: Verificar Notificação
1. Faça login como o SDR da chamada
2. Verifique o sino 🔔
3. Deve aparecer a notificação

### Teste 3: Query Direta
```sql
-- Ver todos os feedbacks com sdr_id
SELECT 
  cf.id,
  cf.content,
  cf.sdr_id,
  p.full_name as sdr_nome
FROM call_feedbacks cf
LEFT JOIN profiles p ON p.id = cf.sdr_id
ORDER BY cf.created_at DESC
LIMIT 10;
```

## ⚠️ Troubleshooting

### Problema: Notificação ainda não aparece

**Verificar:**
1. `sdr_id` está preenchido no feedback?
2. SDR está logado com o usuário correto?
3. `is_read` está como `false`?
4. Função RPC `get_recent_feedbacks_with_calls` existe?

**Query de diagnóstico:**
```sql
-- Ver o que o SDR deveria receber
SELECT 
  cf.*,
  c.enterprise,
  p.full_name
FROM call_feedbacks cf
JOIN calls c ON c.id = cf.call_id
LEFT JOIN profiles p ON p.id = cf.author_id
WHERE cf.sdr_id = (SELECT id FROM profiles WHERE email = 'hiara@grupoggv.com')
  AND cf.author_id != (SELECT id FROM profiles WHERE email = 'hiara@grupoggv.com')
ORDER BY cf.created_at DESC;
```

### Problema: Trigger não está funcionando

**Verificar se existe:**
```sql
SELECT * FROM information_schema.triggers 
WHERE trigger_name = 'trg_populate_feedback_sdr_id';
```

**Recriar manualmente:**
Execute as seções de "CRIAR/ATUALIZAR FUNÇÕES E TRIGGERS" do script.

## 📊 Monitoramento

### Query para ver estatísticas
```sql
SELECT 
  COUNT(*) as total,
  COUNT(sdr_id) as com_sdr_id,
  COUNT(CASE WHEN is_read THEN 1 END) as lidas,
  COUNT(CASE WHEN NOT is_read THEN 1 END) as nao_lidas
FROM call_feedbacks
WHERE created_at > NOW() - INTERVAL '7 days';
```

## 🎉 Resultado Esperado

Após executar o script:

✅ Feedback "teste feedback" tem `sdr_id` da Hiara
✅ Hiara vê notificação com 🔔 vermelho
✅ Ao clicar, vai para a chamada
✅ Feedback é marcado como lido
✅ Contador diminui

---

**Criado em:** 24/10/2025
**Autor:** Sistema de Diagnóstico
**Status:** ✅ Solução Completa Implementada

