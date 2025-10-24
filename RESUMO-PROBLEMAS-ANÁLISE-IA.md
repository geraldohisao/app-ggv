# 📋 RESUMO DOS PROBLEMAS - Análise de IA

**Data:** 10/10/2025  
**Status:** 🔍 Investigando

---

## ⚠️ **PROBLEMAS ENCONTRADOS:**

### **1. Nota 8.0 Aparece Antes da Análise** 🎯

**O que acontece:**
```
1. Usuário clica "Analisar com IA"
2. Nota 8.0 aparece IMEDIATAMENTE
3. Botão mostra "Reprocessando..."
4. Depois de processar, nota muda para 1.2
```

**Causa Identificada:**
```typescript
// ScorecardAnalysis.tsx - Linha 31-80
React.useEffect(() => {
  const checkExistingAnalysis = async () => {
    const existing = await getCallAnalysisFromDatabase(call.id);
    if (existing) {
      setAnalysis(existing);  // ❌ Mostra análise ANTIGA!
      setHasExisting(true);
    }
  };
  checkExistingAnalysis();
}, [call.id]);
```

**Problema:**
- useEffect SEMPRE busca análise existente ao carregar
- Mostra a análise antiga (nota 8.0) enquanto reprocessa
- Usuário vê nota antiga temporariamente

**Solução:**
```typescript
// Ao clicar "Reprocessar":
setAnalysis(null);  // ✅ Limpar estado ANTES de reprocessar
setLoading(true);
const result = await processCallAnalysis(..., true);
setAnalysis(result);  // ✅ Só mostrar nova análise
```

---

### **2. Duração Inconsistente** ⏱️

**O que acontece:**
```
Player de áudio: 3:20 (200 segundos)
Duração exibida: 6:39 (399 segundos)
Diferença: 3:19 (199 segundos)
```

**Possíveis Causas:**
- Áudio foi cortado/editado depois de salvar metadados
- Campo `duration_formated` tem valor errado
- Timestamps estão incorretos

**Investigação Necessária:**
```sql
SELECT 
    duration,
    duration_formated,
    answered_at,
    ended_at,
    EXTRACT(EPOCH FROM (ended_at - answered_at))::int as calc_duration,
    recording_url
FROM calls 
WHERE id = 'e6ae879c...';
```

**Soluções Possíveis:**
1. Se áudio real é 3:20 → Corrigir `duration_formated` para `00:03:20`
2. Se duração real é 6:39 → Verificar por que player mostra 3:20
3. Usar duração do PLAYER como fonte de verdade

---

### **3. Nota Muito Baixa (1.2/10)** 📊

**O que acontece:**
```
Nota final: 1.2/10
Exemplo critério: "Se apresentou" = 2/10
Scorecard: Ligação - Consultoria
Pontuação: 82/710 (muito baixo!)
```

**Causa Provável:**
Cálculo de peso INCORRETO!

**Código Atual:**
```typescript
// scorecardAnalysisService.ts - Linhas 465-479
totalScore = criteriaAnalysis.reduce((sum, c, index) => {
  const criterion = criteria[index];
  const weightedScore = c.achieved_score * (criterion.weight || 1);
  return sum + weightedScore;
}, 0);

maxPossibleScore = criteriaAnalysis.reduce((sum, c, index) => {
  const criterion = criteria[index];
  const weightedMaxScore = c.max_score * (criterion.weight || 1);
  return sum + weightedMaxScore;
}, 0);

finalGrade = (totalScore / maxPossibleScore) * 100) / 10;
```

**Problema Potencial:**
Se `max_score` dos critérios está muito alto (ex: 10 por critério, 71 critérios = 710 pontos totais), a nota fica muito baixa!

**Exemplo:**
```
Critério 1: achieved_score=2, max_score=10, weight=2
- Pontuação: 2 * 2 = 4
- Máxima: 10 * 2 = 20

Se tem 71 critérios assim:
- Total possível: 71 * 20 = 1420
- Total obtido: 82
- Nota: (82/1420) * 10 = 0.58/10  ❌ MUITO BAIXO!
```

**Problema:** `max_score` deve ser 3, não 10!

---

## 🎯 **CORREÇÕES NECESSÁRIAS:**

### **Correção 1: Limpar Estado ao Reprocessar**
```typescript
// ScorecardAnalysis.tsx
const handleAnalyze = async () => {
  setAnalysis(null);  // ✅ ADICIONAR ESTA LINHA
  setLoading(true);
  // ... resto do código
};
```

### **Correção 2: Investigar Duração**
```sql
-- Execute investigate-ia-analysis-issues.sql
-- Ver qual duração está correta
```

### **Correção 3: Revisar max_score**
```sql
-- Verificar se critérios têm max_score = 3 ou 10
SELECT name, max_score, weight 
FROM scorecard_criteria 
WHERE scorecard_id = (
  SELECT scorecard_id FROM call_analysis 
  WHERE call_id = 'e6ae879c...' 
  ORDER BY analysis_created_at DESC 
  LIMIT 1
);
```

**Se max_score = 10 mas deveria ser 3:**
```sql
UPDATE scorecard_criteria 
SET max_score = 3 
WHERE scorecard_id = '...' AND max_score = 10;
```

---

## 📊 **EXEMPLO DE CÁLCULO CORRETO:**

### **Cenário Esperado:**
```
Scorecard: Ligação - Consultoria (10 critérios)

Critério 1: Se apresentou
- Nota OpenAI: 2/3
- Peso: 2
- Pontuação ponderada: 2 * 2 = 4
- Máxima ponderada: 3 * 2 = 6

... (9 critérios restantes)

TOTAL:
- Pontuação: 82 pontos
- Máxima: 90 pontos (ex: 10 critérios * 3 * 3 peso médio)
- Nota final: (82/90) * 10 = 9.1/10  ✅ CORRETO!
```

### **Cenário Atual (BUG):**
```
TOTAL:
- Pontuação: 82 pontos
- Máxima: 710 pontos  ❌ MUITO ALTO!
- Nota final: (82/710) * 10 = 1.2/10  ❌ ERRADO!
```

**Causa:** `max_score = 10` ao invés de `3` nos critérios!

---

## ✅ **PLANO DE AÇÃO:**

1. **INVESTIGAR** → Execute `investigate-ia-analysis-issues.sql`
2. **CORRIGIR cache** → Limpar estado ao reprocessar
3. **CORRIGIR duração** → Sincronizar player com banco
4. **CORRIGIR max_score** → Ajustar critérios para max_score=3
5. **TESTAR** → Reprocessar chamada e validar nota

---

**Quer que eu execute a investigação e aplique as correções?** 🔧

