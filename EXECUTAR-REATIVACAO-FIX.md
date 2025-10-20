# 🔧 CORREÇÃO: Timeouts de Reativação N8N

## 🎯 **PROBLEMA IDENTIFICADO:**

As execuções de reativação estão com **timeout** após 5-6 minutos esperando resposta do N8N.

### **Status Atual:**
- **Mariana Costa** ✅→ Timeout (mas "foi" depois)
- **Samuel Bueno** ✅→ Timeout (mas "foi" depois)  
- **Andressa Habinoski** ✅→ Timeout (mas "foi" depois)
- **Hiara Saienne** ❌→ **BLOQUEADA** por execução pendente antiga (03/10/2025)

---

## 📋 **PASSO A PASSO:**

### **PASSO 1: Investigar** 🔍

1. Abrir **Supabase SQL Editor**
2. Copiar todo o conteúdo de: `investigate-reactivation-timeouts.sql`
3. Executar (F5 ou "Run")
4. Analisar os resultados

**O que o script vai mostrar:**
- ✅ Histórico de execuções dos 4 SDRs
- ✅ Status de permissões (quem pode executar)
- ✅ Automações órfãs (>30 min pendentes)
- ✅ Correlação com tabela N8N
- ✅ Recomendação de ação

---

### **PASSO 2: Limpar Automações Órfãs** 🧹

Se o script identificar automações órfãs (provavelmente vai encontrar a da Hiara de 03/10), executar:

```sql
-- Limpar automações órfãs (>30 minutos pendentes)
SELECT cleanup_orphaned_automations();
```

**Resultado esperado:**
```
✅ X automações limpas (mudadas de 'pending' para 'failed')
```

---

### **PASSO 3: Verificar se Hiara Pode Executar** ✅

```sql
-- Verificar permissão da Hiara
SELECT * FROM can_user_execute_automation('Hiara Saienne');
```

**Resultado esperado APÓS limpeza:**
```
can_execute: true
message: "Automação pode ser executada."
```

---

### **PASSO 4: Entender os Timeouts** ⏰

O sistema está configurado com **timeout de 45 segundos**, mas o N8N está demorando **5-6 minutos** para processar.

**Por que isso acontece?**

1. **Frontend espera 45s** → Se N8N não responde, retorna timeout
2. **N8N continua processando** → Workflow roda em background
3. **N8N deveria chamar callback** → Mas não está chamando de volta
4. **Resultado:** Fica "pending" para sempre

**Isso é esperado quando:**
- N8N processa muitos leads (ex: 20+)
- Workflow faz chamadas externas lentas
- N8N está sobrecarregado

---

## 🔧 **SOLUÇÕES:**

### **Solução Imediata:** (Para Hiara executar agora)

```sql
-- 1. Limpar automações órfãs
SELECT cleanup_orphaned_automations();

-- 2. Verificar se liberou
SELECT * FROM can_user_execute_automation('Hiara Saienne');

-- 3. Hiara pode executar normalmente pela interface
```

---

### **Solução de Timeout do N8N:** 

**OPÇÃO A: Aumentar Timeout (Temporário)**

Arquivo: `services/automationService.ts`
```typescript
const N8N_CONFIG = {
  WEBHOOK_URL: 'https://api-test.ggvinteligencia.com.br/webhook/reativacao-leads',
  TIMEOUT: 300000, // 5 minutos (em vez de 45s)
  CALLBACK_URL: 'https://app.grupoggv.com/.netlify/functions/reativacao-webhook'
};
```

**OPÇÃO B: Configurar N8N Callback (Definitivo)** ✅ **RECOMENDADO**

O N8N precisa chamar nosso webhook quando terminar:

1. **Abrir workflow no N8N**
2. **Adicionar node "HTTP Request" no final:**
   - Method: POST
   - URL: `https://app.grupoggv.com/.netlify/functions/reativacao-complete`
   - Body:
     ```json
     {
       "workflowId": "{{ $execution.id }}",
       "status": "completed",
       "leadsProcessed": {{ $('seu_node_final').itemMatched }},
       "message": "Workflow completed successfully"
     }
     ```

**OPÇÃO C: Sistema de Polling (Já implementado!)** ✅

O sistema já tem polling que verifica automaticamente:
- A cada 45 segundos verifica execuções pendentes
- Marca como concluída se passou muito tempo
- Isso já está funcionando! (Por isso Mari, Samuel e Andressa "foram depois")

---

## 🎯 **RESULTADO FINAL:**

Após executar a limpeza:

- **Mariana** ✅ Pode executar novamente (cooldown de 5 min)
- **Samuel** ✅ Pode executar novamente (cooldown de 5 min)
- **Andressa** ✅ Pode executar novamente (cooldown de 5 min)
- **Hiara** ✅ **LIBERADA** para executar

---

## ⚙️ **CONFIGURAÇÃO RECOMENDADA:**

Para evitar este problema no futuro:

1. ✅ **Manter polling ativo** (já está!)
2. ✅ **Configurar callback no N8N** (melhoria)
3. ✅ **Limpeza automática diária** de órfãs

Script para limpeza automática (rodar 1x por dia):
```sql
-- Adicionar no cron job do Supabase
SELECT cron.schedule(
  'cleanup-orphaned-automations',
  '0 */6 * * *', -- A cada 6 horas
  $$
    SELECT cleanup_orphaned_automations();
  $$
);
```

---

**Status:** ⏳ Pronto para executar  
**Risco:** 🟡 BAIXO (apenas marca como 'failed', não deleta)  
**Tempo:** ⚡ ~10 segundos

---

## 📝 **RESUMO:**

1. 🔍 Execute `investigate-reactivation-timeouts.sql` para ver o estado
2. 🧹 Execute `cleanup_orphaned_automations()` para limpar
3. ✅ Hiara poderá executar normalmente
4. 🔧 Configure callback no N8N para solução definitiva

