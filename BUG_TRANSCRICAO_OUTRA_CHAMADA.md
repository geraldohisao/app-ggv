# 🚨 BUG CRÍTICO: Transcrição/Análise de OUTRA Chamada

**Data:** 05/11/2025  
**Commit:** `56557a7`  
**Severidade:** 🔴 **CRÍTICA** - Dados incorretos sendo exibidos  
**Descoberto por:** Usuário em produção  

---

## 📊 **PROBLEMA REPORTADO:**

### **Chamada que você abriu:**
```
ID: 9671164a-d697-41a2-abc2-22cbf2117370
URL: /chamadas/9671164a-d697-41a2-abc2-22cbf2117370
```

### **Transcrição exibida:**
```
Mariana Costa: "Alô? Alô, Well? Quem fala? 
                Aqui é a Mariana, da GGV Inteligência, tudo bem?"
Well: "Tudo bem, como vai?"
Mariana: "...entrando em contato sobre cadastro...Intercom..."
```

### **Análise exibida:**
```
Nota: 5.5/10
Pontuação: 117/213
Scorecard: Ligação - Consultoria
Texto: "Mariana se apresentou de forma clara e profissional,
        estabelecendo sua autoridade como representante da GGV Inteligência."
```

**❌ PROBLEMA:** Esta é a transcrição de **Intercom** (empresa diferente), não da chamada atual!

---

## 🔍 **POSSÍVEIS CAUSAS:**

### **1. Estado React Persistindo** (Mais provável)
```typescript
// ❌ ANTES: Estado não era limpo ao trocar de chamada
useEffect(() => {
  loadCallDetail(); // Carregava nova chamada
  // MAS analysisResult ainda tinha análise da chamada anterior!
}, [callId]);
```

**Cenário:**
1. Você abre chamada A (Intercom)
2. Análise da chamada A carrega e fica no estado
3. Você navega para chamada B
4. Call B carrega mas analysisResult ainda tem dados de A
5. UI mostra transcrição de B com análise de A ❌

---

### **2. Função SQL Retornando Análise Errada** (Menos provável)
```sql
-- get_call_analysis pode ter bug de JOIN ou cache
SELECT * FROM call_analysis WHERE call_id = p_call_id;
-- Se retornar call_id diferente = BUG SQL
```

---

### **3. Cache do Navegador/Service Worker**
```
- Service Worker pode estar cachando respostas erradas
- localStorage pode ter dados corrompidos
- Cache HTTP do navegador
```

---

## ✅ **CORREÇÕES APLICADAS:**

### **1. Limpeza de Estado ao Trocar de Chamada**

**Arquivo:** `calls-dashboard/pages/CallDetailPage.tsx`

```typescript
useEffect(() => {
  // ⚠️ CRÍTICO: Limpar estado anterior ao trocar de chamada
  setCall(null);
  setAnalysisResult(null);  // ✅ Limpa análise anterior
  setAiNote('N/A');
  setAiScore(null);
  setFeedbacks([]);
  setFeedback('');
  
  // Agora carrega nova chamada
  loadCallDetail();
}, [callId]);
```

**Resultado:**
- ✅ Estado completamente limpo
- ✅ Sem dados de chamada anterior
- ✅ UI começa do zero

---

### **2. Validação de call_id na Análise**

**Arquivo:** `calls-dashboard/services/callAnalysisBackendService.ts`

```typescript
const analysis = data?.[0] || null;

if (analysis) {
  // ⚠️ VALIDAÇÃO CRÍTICA: Verificar se call_id bate
  if (analysis.call_id !== callId) {
    console.error('🚨 BUG: Análise pertence a OUTRA chamada!', {
      solicitado: callId,
      retornado: analysis.call_id
    });
    return null; // ✅ Não retorna análise errada
  }
}
```

**Resultado:**
- ✅ Garante que análise pertence à chamada
- ✅ Detecta bugs de SQL/cache
- ✅ Previne exibição de dados errados

---

### **3. Logs de Debug Detalhados**

**Arquivo:** `calls-dashboard/pages/CallDetailPage.tsx`

```typescript
console.log('🔍 DEBUG - Call atual:', {
  id: callItem.id,
  enterprise: callItem.company_name,
  person: callItem.person_name,
  transcription_preview: callItem.transcription?.substring(0, 100)
});

console.log('🔍 DEBUG - Análise retornada:', {
  scorecard: existingAnalysis.scorecard_used?.name,
  final_grade: existingAnalysis.final_grade,
  criteria_count: existingAnalysis.criteria_analysis?.length
});
```

**Resultado:**
- ✅ Rastreamento completo dos dados
- ✅ Identificação imediata de inconsistências
- ✅ Facilita debug

---

## 🔍 **INVESTIGAÇÃO NECESSÁRIA:**

Execute este SQL para descobrir a causa raiz:

```sql
-- Arquivo: DEBUG_TRANSCRICAO_ERRADA.sql

-- 1. Dados da chamada que você abriu
SELECT 
    id,
    enterprise,
    person,
    LEFT(transcription, 200) as transcription_preview
FROM calls 
WHERE id = '9671164a-d697-41a2-abc2-22cbf2117370';

-- 2. Análise desta chamada
SELECT 
    ca.id,
    ca.call_id,  -- ⚠️ Este call_id deve bater com linha acima!
    ca.final_grade,
    c.enterprise,
    LEFT(c.transcription, 200) as transcription_preview
FROM call_analysis ca
LEFT JOIN calls c ON c.id = ca.call_id
WHERE ca.call_id = '9671164a-d697-41a2-abc2-22cbf2117370';

-- 3. Buscar a chamada real do "Intercom" + "Well"
SELECT 
    id,
    enterprise,
    person,
    LEFT(transcription, 200) as transcription_preview
FROM calls 
WHERE transcription ILIKE '%Well%'
  AND transcription ILIKE '%Intercom%'
LIMIT 5;
```

**Me envie os resultados para eu identificar a causa!**

---

## 📊 **CENÁRIOS POSSÍVEIS:**

### **Cenário A: Estado React (Mais provável)** ✅
```
Query 1: Retorna chamada X (Intercom comercial)
Query 2: Retorna NULL ou análise correta
Query 3: Retorna chamada Y (Intercom comercial)

Conclusão: Estado React persistiu entre navegações
Correção: ✅ JÁ APLICADA (cleanup de estado)
```

### **Cenário B: Função SQL Bugada**
```
Query 1: Retorna chamada X
Query 2: Retorna análise de chamada Y (call_id diferente!)
Query 3: Retorna chamada Y

Conclusão: get_call_analysis retorna análise errada
Correção: ⚠️ Precisa corrigir função SQL
```

### **Cenário C: Transcrição Trocada no Banco**
```
Query 1: Transcrição da chamada X menciona "Intercom"
Query 2: Análise pertence a chamada X (correta)
Query 3: Retorna chamada X

Conclusão: Transcrição foi salva errada no banco
Correção: ⚠️ Problema de integração/importação
```

---

## 🧪 **COMO TESTAR APÓS DEPLOY:**

### **1. Limpar cache do navegador**
```
Ctrl+Shift+R (Windows/Linux)
Cmd+Shift+R (Mac)
Ou: DevTools > Application > Clear storage
```

### **2. Abrir chamada problemática**
```
URL: /chamadas/9671164a-d697-41a2-abc2-22cbf2117370
```

### **3. Verificar console:**
```
Deve aparecer:
✅ "🔍 DEBUG - Call atual: {id: '9671164a...', enterprise: '...', ...}"
✅ "🔍 DEBUG - Análise retornada: {...}"

Se houver bug:
🚨 "BUG CRÍTICO: Análise pertence a OUTRA chamada!"
```

### **4. Validar transcrição:**
```
- Ler primeira linha da transcrição
- Verificar se menciona empresa/pessoa correta
- Comparar com dados do cabeçalho
```

---

## 🎯 **CORREÇÕES APLICADAS:**

```
✅ Limpeza de estado ao trocar callId
✅ Validação de call_id na análise retornada
✅ Logs detalhados para debug
✅ SQL de investigação criado
⏳ Deploy automático (~5min)
```

---

## 📋 **PRÓXIMOS PASSOS:**

### **Para você:**
1. **Execute SQL de investigação:** `DEBUG_TRANSCRICAO_ERRADA.sql`
2. **Me envie os 3 resultados** (queries 1, 2, 3)
3. **Aguarde deploy** (~5min)
4. **Teste novamente** a mesma chamada
5. **Verifique console** por logs de debug ou erro crítico

### **Para mim:**
1. ✅ Correções aplicadas
2. ✅ Commit e push feitos
3. ⏳ Aguardando seus resultados do SQL
4. ⏳ Análise da causa raiz
5. ⏳ Correção adicional se necessário

---

## 🔒 **GARANTIAS DAS CORREÇÕES:**

### **Agora o sistema:**
```
✅ Limpa estado ao trocar de chamada
✅ Valida call_id da análise retornada
✅ Rejeita análises de outras chamadas
✅ Loga inconsistências detectadas
```

### **Se SQL retornar call_id errado:**
```
✅ Sistema detecta e rejeita
✅ Console mostra "🚨 BUG CRÍTICO"
✅ Análise não é exibida
✅ Previne dados incorretos
```

---

**🎯 EXECUTE O SQL E ME ENVIE OS RESULTADOS!**

Isso vai me dizer se é:
- **Bug de estado React** (já corrigido) ✅
- **Bug de SQL** (precisa corrigir função) ⚠️
- **Bug de dados** (transcrição errada no banco) ⚠️

---

**Commit:** `56557a7`  
**Status:** ✅ PUSHED  
**Aguardando:** Deploy + Resultados do SQL


