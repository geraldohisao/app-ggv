# 🚨 PROBLEMA REAL IDENTIFICADO - Sistema de Notificações

## 🔍 DESCOBERTA IMPORTANTE

Após executar o script de correção, descobrimos que:

### **❌ PROBLEMA RAIZ:**
```
O campo agent_id nas chamadas contém NOMES ao invés de EMAILS!
```

**Exemplos:**
- `agent_id = "Hiara Saienne"` (NOME) ❌
- `agent_id = "Mariana Costa"` (NOME) ❌  
- `agent_id = "usuario@email.com"` (EMAIL) ✅ ← Seria o ideal

**Impacto:**
- 11 SDRs (4.448 chamadas) não têm perfil na tabela `profiles`
- Não conseguimos mapear `agent_id` → `profiles.id`
- Por isso os feedbacks ficam sem `sdr_id`
- E as notificações não aparecem

---

## 📊 ESTATÍSTICAS DO PROBLEMA

### SDRs sem perfil mapeado:
| SDR | Chamadas | Status |
|-----|----------|--------|
| Mariana Costa | 1331 | ❌ Sem perfil |
| Lô-Ruama Oliveira | 1141 | ❌ Sem perfil |
| Camila Ataliba | 1127 | ❌ Sem perfil |
| Andressa Habinoski | 714 | ❌ Sem perfil |
| **Hiara Saienne** | **306** | **❌ Sem perfil** |
| William Martins | 117 | ❌ Sem perfil |
| + 5 outros SDRs | 712 | ❌ Sem perfil |

**Total:** 4.448 chamadas (83% do total sem sdr_id)

---

## 💡 SOLUÇÕES POSSÍVEIS

### **OPÇÃO 1: Mapeamento Inteligente por Nome** ⭐ RECOMENDADO

Criar função que busca na tabela `profiles` por `full_name` ao invés de `email`.

**Vantagens:**
- ✅ Rápido de implementar
- ✅ Não precisa alterar dados existentes
- ✅ Funciona retroativamente

**Arquivo:** `SOLUCAO_ALTERNATIVA_MAPEAMENTO.sql`

**Passos:**
1. Cria função `get_sdr_uuid_smart()` que tenta:
   - Email primeiro
   - Nome exato depois
   - Busca parcial por nome
2. Atualiza trigger com nova função
3. Atualiza chamadas e feedbacks existentes

---

### **OPÇÃO 2: Investigar Estrutura de Dados**

Verificar se existe outra tabela com esses usuários.

**Arquivo:** `INVESTIGAR_USUARIOS_SEM_PERFIL.sql`

**Passos:**
1. Verifica formato do `agent_id`
2. Busca outras tabelas de usuários
3. Tenta mapear de outras formas

---

### **OPÇÃO 3: Criar Perfis Manualmente**

Criar perfis para os 11 SDRs que não têm.

**Desvantagens:**
- ❌ Trabalhoso
- ❌ Precisa de informações (email, etc)
- ❌ Manutenção contínua

---

## 🚀 AÇÃO RECOMENDADA

### **PASSO 1: Investigar** (5 minutos)
Execute: `INVESTIGAR_USUARIOS_SEM_PERFIL.sql`

**Objetivo:** Descobrir se:
- Existe tabela `ggv_user` ou similar
- Os nomes batem com `profiles.full_name`
- Há outro campo de identificação

### **PASSO 2: Aplicar Solução Alternativa** (2 minutos)
Execute: `SOLUCAO_ALTERNATIVA_MAPEAMENTO.sql`

**O que faz:**
- ✅ Cria mapeamento inteligente (email OU nome)
- ✅ Atualiza chamadas existentes
- ✅ Atualiza feedbacks existentes
- ✅ Corrige feedback da Hiara

### **PASSO 3: Verificar Resultado**
Checar se:
- [x] Feedbacks tem 100% com `sdr_id`
- [x] Feedback da Hiara mapeado
- [x] Notificação aparece

---

## 🧪 TESTES SUGERIDOS

### Teste 1: Ver profiles existentes
```sql
SELECT id, email, full_name 
FROM profiles 
WHERE full_name ILIKE '%hiara%'
   OR full_name ILIKE '%mariana%'
LIMIT 10;
```

### Teste 2: Testar mapeamento
```sql
-- Se a função já foi criada:
SELECT 
  'Hiara Saienne' as nome,
  get_sdr_uuid_smart('Hiara Saienne') as uuid,
  (SELECT full_name FROM profiles 
   WHERE id = get_sdr_uuid_smart('Hiara Saienne')) as perfil;
```

### Teste 3: Verificar agent_id format
```sql
SELECT 
  agent_id,
  CASE 
    WHEN agent_id LIKE '%@%' THEN 'EMAIL'
    ELSE 'NOME'
  END as tipo,
  COUNT(*) as qtd
FROM calls
GROUP BY agent_id, tipo
ORDER BY COUNT(*) DESC
LIMIT 20;
```

---

## 📋 CHECKLIST DE EXECUÇÃO

### □ Fase de Investigação
- [ ] Executar `INVESTIGAR_USUARIOS_SEM_PERFIL.sql`
- [ ] Verificar se `agent_id` é nome ou email
- [ ] Ver se existe tabela com esses usuários
- [ ] Tentar mapear por `full_name` manualmente

### □ Fase de Solução
- [ ] Executar `SOLUCAO_ALTERNATIVA_MAPEAMENTO.sql`
- [ ] Verificar mensagens de sucesso/erro
- [ ] Checar estatísticas finais
- [ ] Confirmar feedback da Hiara mapeado

### □ Fase de Teste
- [ ] Recarregar página da Hiara
- [ ] Verificar sino de notificações 🔔
- [ ] Clicar na notificação
- [ ] Confirmar navegação correta

---

## 🎯 CRITÉRIOS DE SUCESSO

### ✅ Após Investigação:
- Descobrir se nomes batem com `profiles.full_name`
- Identificar se existe outra tabela de usuários
- Entender estrutura de dados

### ✅ Após Solução Alternativa:
- Chamadas: 95%+ com `sdr_id` ✅
- Feedbacks: 100% com `sdr_id` ✅
- Feedback da Hiara: Mapeado ✅
- Notificação: Aparecendo ✅

---

## 🔧 TROUBLESHOOTING

### Problema: Mapeamento por nome não funciona
**Causa:** Nomes não batem exatamente

**Solução:**
```sql
-- Ver variações de nome
SELECT full_name FROM profiles 
WHERE full_name ILIKE '%hiara%';

-- Ajustar função de busca se necessário
```

### Problema: Tabela profiles vazia
**Causa:** Usuários podem estar em outra tabela

**Solução:**
```sql
-- Buscar outras tabelas
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public'
  AND table_name LIKE '%user%';
```

---

## 📁 ARQUIVOS CRIADOS

1. ⭐ **SOLUCAO_ALTERNATIVA_MAPEAMENTO.sql** ← EXECUTE ESTE
2. 🔍 **INVESTIGAR_USUARIOS_SEM_PERFIL.sql** ← Para investigar
3. 📖 **GUIA_ATUALIZADO_PROBLEMA_REAL.md** ← Este arquivo

**Arquivos anteriores (ainda úteis):**
- `INSTALAR_TRIGGER_FEEDBACK.sql` (base, mas precisa ajuste)
- `CORRIGIR_SDR_ID_MASSIVO.sql` (revelou o problema)
- `TESTE_RAPIDO_NOTIFICACOES.sql` (para validar depois)

---

## 🎓 LIÇÕES APRENDIDAS

1. **agent_id pode ser nome OU email** - precisamos mapear ambos
2. **Não assumir estrutura** - sempre verificar os dados
3. **Mapeamento flexível** - usar busca parcial quando necessário

---

## 📞 PRÓXIMOS PASSOS

1. **AGORA:** Execute `INVESTIGAR_USUARIOS_SEM_PERFIL.sql`
2. **DEPOIS:** Analise os resultados
3. **ENTÃO:** Execute `SOLUCAO_ALTERNATIVA_MAPEAMENTO.sql`
4. **POR FIM:** Teste com a Hiara

---

**Atualizado em:** 24/10/2025  
**Status:** 🔍 Investigação Necessária  
**Prioridade:** 🔴 Alta


