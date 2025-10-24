# 🔍 ANÁLISE: Problemas na Análise de IA

**Data:** 10/10/2025  
**Chamada:** Prefiro não falar - Mario Miyasaki (ID: e6ae879c-4890-496a-b25a-560208ed8ab8)

---

## ⚠️ **PROBLEMAS IDENTIFICADOS:**

### **1. Nota 8.0 Aparece ANTES da Análise** 🎯
**Sintoma:**
- Usuário clica em "Analisar com IA"
- Nota 8.0 aparece IMEDIATAMENTE
- Depois muda para 1.2 após análise concluir

**Possíveis Causas:**
- ✅ Análise antiga em cache (call_analysis table)
- ✅ useEffect carregando análise anterior
- ✅ Estado não sendo limpo ao reprocessar

### **2. Duração Inconsistente** ⏱️
**Sintoma:**
- Player de áudio: 3:20 (200 segundos)
- Duração exibida: 6:39 (399 segundos)
- Diferença: 3:19 (199 segundos!)

**Possíveis Causas:**
- ✅ Campo duration_formated errado
- ✅ Áudio foi cortado/editado
- ✅ Timestamps incorretos
- ✅ Função get_call_detail retornando valor errado

### **3. Nota Muito Baixa (1.2/10)** 📊
**Sintoma:**
- Nota final: 1.2/10
- Exemplo: "Se apresentou" = 2/10
- Parecemuito severo/errado

**Possíveis Causas:**
- ✅ Cálculo de peso incorreto
- ✅ OpenAI dando notas muito baixas
- ✅ Prompt muito rigoroso
- ✅ Fórmula de cálculo com bug

---

## 🔍 **INVESTIGAÇÃO NECESSÁRIA:**

### **A) Verificar Análise em Cache**
```sql
SELECT * FROM call_analysis WHERE call_id = 'e6ae879c-4890-496a-b25a-560208ed8ab8';
-- Ver se tem análise antiga com nota 8.0
```

### **B) Verificar Duração Real**
```sql
SELECT 
    id,
    duration,
    duration_formated,
    duration_seconds,
    started_at,
    answered_at,
    ended_at,
    EXTRACT(EPOCH FROM (ended_at - answered_at))::int as calc_duration
FROM calls 
WHERE id = 'e6ae879c-4890-496a-b25a-560208ed8ab8';
```

### **C) Verificar Cálculo de Scorecard**
```sql
SELECT 
    ca.id,
    ca.scorecard_name,
    ca.overall_score,
    ca.max_possible_score,
    ca.final_grade,
    ca.criteria_analysis
FROM call_analysis ca
WHERE ca.call_id = 'e6ae879c-4890-496a-b25a-560208ed8ab8'
ORDER BY ca.analysis_created_at DESC
LIMIT 2;  -- Ver última e penúltima
```

---

## 📋 **PLANO DE CORREÇÃO:**

### **PROBLEMA 1: Nota Antes da Análise**

**Causa Provável:**
- `getCallAnalysisFromDatabase()` retorna análise antiga
- Frontend não limpa estado ao reprocessar

**Correção:**
```typescript
// CallDetailPage.tsx ou ScorecardAnalysis.tsx
const handleReprocess = async () => {
  setAnalysisResult(undefined);  // ✅ Limpar estado
  setAnalysisLoading(true);
  
  const result = await processCallAnalysis(
    call.id,
    call.transcription,
    call.sdr.name,
    call.person_name,
    true  // ✅ forceReprocess = true
  );
  
  setAnalysisResult(result);
  setAnalysisLoading(false);
};
```

### **PROBLEMA 2: Duração Inconsistente**

**Causa Provável:**
- Áudio real tem 3:20
- Campo duration_formated tem 6:39 (errado)

**Correção:**
```sql
-- Verificar qual é o correto e sincronizar
UPDATE calls
SET duration_formated = '00:03:20'
WHERE id = 'e6ae879c...';
```

**OU** se o áudio real é 6:39:
- Verificar por que player mostra 3:20
- Pode ser problema no arquivo de áudio

### **PROBLEMA 3: Nota Muito Baixa**

**Causa Provável:**
- OpenAI está sendo muito rigoroso
- Cálculo de peso pode estar errado
- Prompt pode estar muito severo

**Investigar:**
1. Ver análise completa no console
2. Verificar se OpenAI realmente deu 2/10 para "se apresentou"
3. Revisar fórmula de cálculo com pesos

**Possíveis Correções:**
- Ajustar prompt para ser menos rigoroso
- Revisar cálculo de pesos no `scorecardAnalysisService.ts`
- Validar resposta da OpenAI antes de processar

---

## 🎯 **PRIORIDADE DE AÇÕES:**

### **1. IMEDIATO - Limpar Cache de Análise**
```typescript
// Garantir que ao clicar "Reprocessar", estado seja limpo
```

### **2. URGENTE - Investigar Duração**
```sql
-- Ver duração real no banco vs player
```

### **3. IMPORTANTE - Revisar Cálculo de Nota**
```typescript
// Verificar fórmula no scorecardAnalysisService.ts
// Linhas ~465-488
```

---

## 📊 **PRÓXIMOS PASSOS:**

1. **Executar SQL de investigação** (vou criar)
2. **Ver logs do console** durante análise
3. **Identificar causa exata** de cada problema
4. **Aplicar correções específicas**
5. **Testar novamente**

---

**Quer que eu execute a investigação agora?** 🔍

