# 🚀 GUIA DE EXECUÇÃO RÁPIDA - Corrigir Notificações

## 📊 SITUAÇÃO ATUAL (Resultados das Queries)

### Chamadas:
- ✅ Total: **5372**
- ⚠️ Com sdr_id: **608** (11%)
- ❌ Sem sdr_id: **4764** (89%)

### Feedbacks:
- ✅ Total: **10**
- ⚠️ Com sdr_id: **5** (50%)
- ❌ Sem sdr_id: **5** (50%)

**Status:** ❌ PROBLEMA - Metade dos feedbacks sem `sdr_id`

---

## ✅ SOLUÇÃO EM 2 PASSOS

### **PASSO 1: Instalar o Trigger** 🔧
Execute este arquivo no Supabase SQL Editor:
```
INSTALAR_TRIGGER_FEEDBACK.sql
```

**O que faz:**
- ✅ Cria função de mapeamento email → UUID
- ✅ Cria trigger automático para novos feedbacks
- ✅ Garante que futuros feedbacks terão `sdr_id`

**Tempo:** ~5 segundos

---

### **PASSO 2: Corrigir Dados Existentes** 📝
Execute este arquivo no Supabase SQL Editor:
```
CORRIGIR_SDR_ID_MASSIVO.sql
```

**O que faz:**
- ✅ Atualiza **4764 chamadas** com `sdr_id`
- ✅ Atualiza **5 feedbacks** com `sdr_id`
- ✅ Corrige o feedback específico da Hiara
- ✅ Mostra estatísticas antes/depois

**Tempo:** ~30 segundos (depende do tamanho do banco)

---

## 📋 PASSO A PASSO DETALHADO

### 1. Abrir Supabase
- Acesse: https://supabase.com
- Entre no seu projeto
- Clique em **SQL Editor** (ícone de banco de dados na lateral)

### 2. Executar Script 1 (Trigger)
- Clique em **New Query**
- Abra o arquivo `INSTALAR_TRIGGER_FEEDBACK.sql`
- Copie TODO o conteúdo
- Cole no SQL Editor
- Clique em **Run** (ou pressione Ctrl+Enter)
- Aguarde a execução
- Verifique que apareceu: ✅ "TRIGGER INSTALADO COM SUCESSO!"

### 3. Executar Script 2 (Correção Massiva)
- Clique em **New Query** novamente
- Abra o arquivo `CORRIGIR_SDR_ID_MASSIVO.sql`
- Copie TODO o conteúdo
- Cole no SQL Editor
- Clique em **Run**
- Aguarde a execução (pode levar 20-30 segundos)

### 4. Verificar Resultados
Procure por estas seções na saída:

**✅ DEPOIS DA CORREÇÃO:**
- Chamadas: deve estar 95%+ com `sdr_id`
- Feedbacks: deve estar 100% com `sdr_id`

**🎯 FEEDBACK DA HIARA:**
- Status: deve mostrar "✅ OK - Notificação vai aparecer"

---

## 🎯 RESULTADOS ESPERADOS

### Após Passo 1 (Trigger):
```
✅ TRIGGER INSTALADO COM SUCESSO!
✅ Função get_sdr_uuid_from_email criada
✅ Função populate_feedback_sdr_id criada
✅ Trigger trg_populate_feedback_sdr_id ativo
```

### Após Passo 2 (Correção):
```
📞 CHAMADAS (APÓS)
- total: 5372
- com_sdr_id: ~5300+ (98%+)
- status: ✅ ÓTIMO

💬 FEEDBACKS (APÓS)
- total: 10
- com_sdr_id: 10 (100%)
- status: ✅ PERFEITO

🎯 FEEDBACK DA HIARA
- status: ✅ OK - Notificação vai aparecer
```

---

## 🧪 TESTAR NO FRONTEND

1. **Peça para Hiara recarregar a página**
   - Pressionar F5 ou Ctrl+R
   - Ou fazer logout/login

2. **Verificar sino de notificação 🔔**
   - Deve mostrar **1** notificação não lida
   - Badge vermelho deve aparecer

3. **Clicar na notificação**
   - Deve abrir a chamada correta
   - Feedback deve ser marcado como lido
   - Contador deve voltar a 0

---

## ⚠️ SE ALGO DER ERRADO

### Erro: "função já existe"
- ✅ Normal, o script usa `CREATE OR REPLACE`
- ✅ Continue a execução

### Erro: "trigger já existe"
- ✅ Script remove e recria automaticamente
- ✅ Continue a execução

### Resultado: Ainda tem feedbacks sem sdr_id
Execute esta query para investigar:
```sql
SELECT 
  cf.id,
  cf.call_id,
  c.agent_id,
  c.sdr_id,
  get_sdr_uuid_from_email(c.agent_id) as uuid_mapeado
FROM call_feedbacks cf
JOIN calls c ON c.id = cf.call_id
WHERE cf.sdr_id IS NULL;
```

**Possíveis causas:**
- ❌ Chamada não tem `agent_id` nem `sdr_id`
- ❌ Email do `agent_id` não tem perfil na tabela `profiles`

---

## 📊 MONITORAMENTO FUTURO

### Query para verificar saúde do sistema:
```sql
-- Executar periodicamente para monitorar
SELECT 
  'Feedbacks' as tabela,
  COUNT(*) as total,
  COUNT(sdr_id) as com_sdr_id,
  ROUND(100.0 * COUNT(sdr_id) / COUNT(*), 1) || '%' as percentual
FROM call_feedbacks

UNION ALL

SELECT 
  'Chamadas' as tabela,
  COUNT(*) as total,
  COUNT(sdr_id) as com_sdr_id,
  ROUND(100.0 * COUNT(sdr_id) / COUNT(*), 1) || '%' as percentual
FROM calls;
```

**Resultados saudáveis:**
- Feedbacks: **100%** com sdr_id ✅
- Chamadas: **95%+** com sdr_id ✅

---

## 🎉 SUCESSO CONFIRMADO QUANDO

✅ Script 1 executado sem erros
✅ Script 2 executado sem erros
✅ Feedback da Hiara mostra "OK"
✅ Estatísticas mostram 100% feedbacks com sdr_id
✅ Hiara vê notificação ao recarregar página
✅ Notificação leva para a chamada correta

---

## 📞 SUPORTE

Se encontrar problemas:

1. **Verifique logs do SQL Editor**
   - Procure por mensagens de erro em vermelho
   - Copie e envie a mensagem de erro

2. **Execute o teste rápido:**
   ```
   TESTE_RAPIDO_NOTIFICACOES.sql
   ```
   - Envie os resultados

3. **Capture screenshot da notificação**
   - Ou do sino 🔔 sem notificações

---

**Criado em:** 24/10/2025  
**Versão:** 1.0  
**Status:** Pronto para Execução 🚀


