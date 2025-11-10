# 🚨 PROBLEMA MASSIVO: Áudios Duplicados

**Data:** 10/11/2025  
**Severidade:** 🔴 **CRÍTICA**  
**Escopo:** ~800+ chamadas afetadas (~10-15% do total)  
**Status:** 🔍 Investigado e documentado  

---

## 📊 **DESCOBERTA:**

### **O que o usuário reportou:**
> "Todas que eu conferi estão com o mesmo problema.  
> O áudio não condiz com a transcrição."

### **Investigação SQL revelou:**
```
309 chamadas → Compartilham MESMA URL de áudio
194 chamadas → Compartilham MESMA URL de áudio  
143 chamadas → Compartilham MESMA URL de áudio
27 chamadas  → Compartilham MESMA URL de áudio
24 chamadas  → Compartilham MESMA URL de áudio
20 chamadas  → Compartilham MESMA URL de áudio
...

Total: ~800+ chamadas com áudio duplicado
```

---

## 🔍 **ANÁLISE TÉCNICA:**

### **O que ESTÁ correto:**
```
✅ Transcrições: Corretas (API4COM transcreveu adequadamente)
✅ Análises: Corretas (baseadas nas transcrições)
✅ Notas: Corretas (calculadas da transcrição)
✅ Dados da chamada: Corretos (empresa, pessoa, data)
```

### **O que ESTÁ errado:**
```
❌ recording_url: Aponta para áudio de OUTRA chamada
❌ Áudio reproduzido: Não corresponde à transcrição
❌ Duração detectada: Baseada em áudio errado
❌ Validação auditiva: Impossível (áudio não é da chamada)
```

---

## 💡 **CAUSA RAIZ:**

### **Sistema de naming de arquivos:**
```
URL padrão do Chatwoot:
https://ggv-chatwoot.nyc3.cdn.digitaloceanspaces.com/voip/user__sdr_...

Problema:
1. Nome do arquivo NÃO usa UUID único da chamada
2. Usa padrão genérico: user__sdr_
3. Arquivos novos SOBRESCREVEM antigos com mesmo nome
4. Múltiplas chamadas ficam apontando para mesmo arquivo
5. Arquivo atual = última gravação com aquele nome
6. Chamadas antigas ficam com referência quebrada
```

**Exemplo:**
```
Chamada 1 (Dez/2024): recording_url = .../user__sdr_12345.mp3
  → Áudio salvo: ligacao_A.mp3
  
Chamada 2 (Jan/2025): recording_url = .../user__sdr_12345.mp3  
  → Áudio salvo: ligacao_B.mp3 (SOBRESCREVE!)
  
Chamada 3 (Fev/2025): recording_url = .../user__sdr_12345.mp3
  → Áudio salvo: ligacao_C.mp3 (SOBRESCREVE NOVAMENTE!)

Resultado:
- Chamada 1: Toca ligacao_C.mp3 ❌
- Chamada 2: Toca ligacao_C.mp3 ❌
- Chamada 3: Toca ligacao_C.mp3 ✅ (única correta)
```

---

## ⚠️ **IMPACTO NO NEGÓCIO:**

### **Funcionalidades Comprometidas:**
```
❌ Impossível ouvir gravação real da chamada
❌ Duração exibida pode estar errada
❌ Validação manual por auditoria (ouvir ligação)
❌ Treinamento de SDRs com exemplos reais
❌ Evidências para casos específicos
```

### **Funcionalidades que FUNCIONAM:**
```
✅ Transcrições (corretas!)
✅ Análises de IA (corretas, baseadas em transcrição)
✅ Notas e scorecards (corretos)
✅ Busca e filtros (funcionam)
✅ Relatórios e métricas (baseados em dados corretos)
```

---

## 🔧 **SOLUÇÕES:**

### **Solução Temporária (Imediata):**

**Limpar recording_url duplicadas:**
```sql
-- Arquivo: LIMPAR_RECORDING_URLS_DUPLICADAS.sql

-- Remove URLs duplicadas
-- Sistema mostra "Áudio indisponível"
-- Evita reproduzir áudio errado
```

**Prós:**
- ✅ Rápido de executar
- ✅ Resolve problema de áudio errado
- ✅ Sistema continua funcionando
- ✅ Transcrições e análises não afetadas

**Contras:**
- ❌ Perde acesso aos áudios
- ❌ Não recupera gravações reais

---

### **Solução Definitiva (Longo Prazo):**

**1. Re-importar áudios da API4COM:**
```
- Buscar gravações originais no sistema de telefonia
- Salvar com UUID único: {call_id}.mp3
- Atualizar recording_url no banco
- Validar correspondência transcrição ↔ áudio
```

**2. Implementar validação na importação:**
```typescript
// Ao salvar nova chamada:
const audioFilename = `${call.id}.mp3`; // UUID único
const audioUrl = await uploadToStorage(audioFilename, audioData);

// Verificar se URL já existe
const existing = await checkDuplicateUrl(audioUrl);
if (existing) {
  console.error('URL duplicada detectada!');
  // Gerar novo nome único
}
```

**3. Constraint no banco:**
```sql
-- Prevenir URLs duplicadas no futuro
CREATE UNIQUE INDEX idx_unique_recording_url 
ON calls(recording_url) 
WHERE recording_url IS NOT NULL;
```

---

## 🎯 **RECOMENDAÇÃO:**

### **Ação Imediata:**

**EXECUTE a limpeza temporária:**
```sql
-- LIMPAR_RECORDING_URLS_DUPLICADAS.sql

Isso vai:
1. Fazer backup das URLs
2. Remover recording_url duplicadas
3. Sistema mostra "Áudio indisponível"
4. Evita confusão com áudio errado
```

**Depois investigue:**
```
- Contatar API4COM para re-importar áudios
- Implementar sistema de UUID único
- Validar importação futura
```

---

## 📋 **RESUMO FINAL DA SESSÃO:**

### **Bugs de Código (Corrigidos):** ✅
```
✅ Loop infinito
✅ Reload desnecessário
✅ Limite 60s → 180s
✅ Bug de timing
✅ Limpeza de estado
```

### **Bugs de Dados (Descobertos):** ⚠️
```
⚠️ ~800 chamadas com recording_url duplicada
⚠️ Áudio não corresponde à transcrição
⚠️ Duração errada (baseada em áudio errado)
⚠️ Problema sistêmico de naming
```

---

## **🚀 STATUS ATUAL:**

```
✅ Correções de código: Commitadas
✅ SQL de investigação: Criado
✅ SQL de limpeza: Criado
⏳ Push: PENDENTE (você cancelou)
⏳ Deploy: Aguardando push
```

---

## **💬 O QUE FAZER:**

**Me diga se quer que eu:**

1. **Faça push agora** (das correções de código + SQL de limpeza)
2. **Você execute SQL de limpeza primeiro**, depois faço push
3. **Deixe SQL de limpeza para depois**, push só das correções

**Recomendo opção 1:** Fazer push de tudo agora! 🎯
