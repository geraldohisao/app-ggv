# 🚨 PROBLEMA CRÍTICO: Áudio Trocado entre Chamadas

**Data:** 10/11/2025  
**Severidade:** 🔴 **CRÍTICA** - Dados incorretos comprometem análise  
**Tipo:** Bug de DADOS (não de código)  
**Status:** 🔍 Em investigação

---

## 📊 **PROBLEMA IDENTIFICADO:**

### **Chamada Problemática:**
```
ID: 7275b82c-ee5f-4ded-90d7-4b43beffa8b0
Empresa: Conservas Sevilliana
Pessoa: Estefano Garcia
Duração: 2:20 (140 segundos)
Nota: 8.7
```

### **Sintomas:**
```
✅ Transcrição: CORRETA (menciona Estefano Garcia)
❌ Áudio: ERRADO (pessoa diferente, não bate com transcrição!)
❌ recording_url: Aponta para áudio de OUTRA chamada
```

### **Descoberto por:**
```
"Ouvindo o áudio ele nem é dessa chamada. 
Pois não bate com o nome da pessoa nem com a transcrição."
```

---

## 🔍 **CAUSA RAIZ (Hipóteses):**

### **1. URLs de Áudio Duplicadas**
```
Múltiplas chamadas usando mesmo recording_url
Quando uma é atualizada, todas são afetadas
```

### **2. Importação Incorreta**
```
Sistema de telefonia (API4COM) retornou URL errada
Gravação foi associada à chamada errada
Sincronização com bug
```

### **3. Problema de Storage**
```
Arquivos de áudio sobrescritos
Mesmo nome de arquivo para chamadas diferentes
Falta de UUID único no nome do arquivo
```

### **4. Bug de Migração**
```
Dados migrados de sistema antigo
URLs não foram corrigidas
Referências perdidas
```

---

## 🔍 **INVESTIGAÇÃO SQL:**

### **Arquivo criado:** `DEBUG_AUDIO_TROCADO.sql`

Execute para descobrir extensão do problema:

```sql
-- 1. Dados da chamada problemática
SELECT recording_url, transcription 
FROM calls 
WHERE id = '7275b82c-ee5f-4ded-90d7-4b43beffa8b0';

-- 2. Buscar URLs duplicadas
SELECT 
    recording_url,
    COUNT(*) as total_chamadas,
    STRING_AGG(DISTINCT enterprise, ', ') as empresas
FROM calls 
WHERE recording_url IS NOT NULL
GROUP BY recording_url
HAVING COUNT(*) > 1
LIMIT 20;

-- 3. Chamadas com mesmo áudio
-- (Encontrar se há outras chamadas usando mesma URL)
```

---

## ⚠️ **IMPACTO:**

### **Gravidade:**
```
🔴 CRÍTICA: Dados incorretos afetam:
- ✅ Transcrição (parece OK)
- ❌ Áudio (trocado)
- ❌ Duração (pode estar errada)
- ⚠️ Análise (baseada em transcrição OK, mas áudio errado)
```

### **Extensão desconhecida:**
```
❓ Quantas chamadas afetadas?
❓ É problema sistemático ou casos isolados?
❓ Quando começou?
❓ Qual a fonte do problema?
```

---

## 🔧 **SOLUÇÕES POSSÍVEIS:**

### **Curto Prazo:**
1. **Identificar chamadas afetadas**
   - Encontrar URLs duplicadas
   - Listar casos problemáticos
   
2. **Limpar recording_url inválidas**
   ```sql
   UPDATE calls 
   SET recording_url = NULL
   WHERE id IN (SELECT id FROM chamadas_com_audio_duplicado);
   ```

3. **Re-importar áudios corretos**
   - Buscar na origem (API4COM)
   - Re-associar URLs corretas

### **Longo Prazo:**
1. **Validação na importação**
   - Verificar se URL já existe
   - Garantir UUID único no nome do arquivo
   
2. **Constraint no banco**
   ```sql
   -- Impedir URLs duplicadas (se fizer sentido)
   CREATE UNIQUE INDEX idx_unique_recording_url 
   ON calls(recording_url) 
   WHERE recording_url IS NOT NULL;
   ```

3. **Audit log de mudanças**
   - Registrar quando recording_url muda
   - Rastrear origem do problema

---

## 🎯 **PRÓXIMOS PASSOS:**

### **1. Investigar Extensão** (Urgente)
```
Execute: DEBUG_AUDIO_TROCADO.sql
Queries: 1, 3, 4
Me envie resultados
```

### **2. Identificar Padrão**
```
- Quantas chamadas afetadas?
- Há URLs duplicadas?
- Quando aconteceu?
```

### **3. Decidir Ação**
```
Se < 10 chamadas: Corrigir manualmente
Se 10-50: Script SQL para limpar
Se > 50: Investigar importação + re-importar
```

---

## 📋 **DIFERENÇA DOS BUGS ANTERIORES:**

### **Bugs de Código (Já corrigidos):**
```
✅ Loop infinito - Corrigido
✅ Reload - Corrigido
✅ Limite 60s - Corrigido
✅ Timing - Corrigido
✅ Estado React - Corrigido
```

### **Bug de Dados (Novo - Investigação):**
```
⚠️ recording_url trocado
⚠️ Áudio não corresponde à chamada
⚠️ Problema no banco de dados
⚠️ Não pode ser corrigido com código
⚠️ Precisa correção de dados
```

---

## ⚡ **AÇÃO IMEDIATA:**

### **Execute esta query primeiro:**

```sql
-- Ver recording_url da chamada problemática
SELECT 
    id,
    enterprise,
    person,
    recording_url
FROM calls 
WHERE id = '7275b82c-ee5f-4ded-90d7-4b43beffa8b0';

-- Depois procurar se outras chamadas usam mesma URL
-- (Substitua URL_AQUI pela URL retornada acima)
SELECT 
    id,
    enterprise,
    person,
    duration
FROM calls 
WHERE recording_url = 'URL_AQUI'
ORDER BY created_at;
```

**Me envie os resultados para eu analisar!**

---

## 🎯 **IMPORTANTE:**

### **As correções de código ESTÃO FUNCIONANDO!** ✅
```
Você viu localmente:
✅ "⚠️ Chamada muito curta: 2 minuto(s) e 20 segundos"
✅ Aviso aparecendo corretamente
✅ Botão desabilitado
✅ Sistema validando 180s

ISSO CONFIRMA QUE AS CORREÇÕES FUNCIONAM!
```

### **Mas há problema de DADOS:** ⚠️
```
❌ recording_url aponta para áudio errado
❌ Isso é problema de importação/sincronização
❌ Precisa correção no banco de dados
```

---

**🔍 EXECUTE O SQL E ME ENVIE A recording_url!**

Vou investigar se é problema isolado ou sistemático! 🎯
