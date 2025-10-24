# 🚀 EXECUTAR AGORA: fix-duration-function-only.sql

## ✅ **CONFIRMAÇÃO DE SEGURANÇA:**

**Este script é 100% SAFE:**
- ✅ NÃO faz UPDATE na tabela calls
- ✅ NÃO faz INSERT em nenhuma tabela
- ✅ NÃO faz DELETE em nenhuma tabela
- ✅ Apenas SELECT (leitura) + DROP/CREATE FUNCTION

---

## 📋 **O QUE O SCRIPT FAZ:**

### **1. Análise (SELECT apenas)** 🔍
```sql
-- Mostra dados da chamada 65711
SELECT id, duration, duration_formated FROM calls WHERE id = 65711;

-- Lista chamadas com inconsistências (TOP 10)
SELECT ... FROM calls WHERE diferença > 60 segundos;

-- Estatísticas gerais
SELECT COUNT(*) ... FROM calls;
```

### **2. Corrige Função** 🔧
```sql
DROP FUNCTION IF EXISTS get_call_detail;
CREATE OR REPLACE FUNCTION get_call_detail(...) 
-- Agora prioriza duration_formated
```

### **3. Testa Correção** ✅
```sql
-- Chama função corrigida para chamada 65711
SELECT * FROM get_call_detail(65711);
```

---

## 🎯 **RESULTADO ESPERADO:**

**Antes:**
```
get_call_detail(65711) retorna:
  duration: 10
  duration_formated: '00:00:10' (recalculado errado!)
```

**Depois:**
```
get_call_detail(65711) retorna:
  duration: 577
  duration_formated: '00:09:37' (mantém original!)
```

---

## 🚀 **COMO EXECUTAR:**

### **Opção 1: Via Supabase SQL Editor** (RECOMENDADO)
1. Abrir: https://supabase.com/dashboard/project/[seu-projeto]/sql
2. New Query
3. Copiar todo conteúdo de: `fix-duration-function-only.sql`
4. Click "Run" (F5)
5. Ver resultados na aba "Results"

### **Opção 2: Via Terminal** (Se tiver acesso psql)
```bash
psql $CONNECTION_STRING < fix-duration-function-only.sql
```

---

## 📊 **IMPACTO:**

| Item | Antes | Depois |
|------|-------|--------|
| **Tabela calls** | 10 segundos | 10 segundos (sem mudança) |
| **Função retorna** | 10 segundos | 577 segundos ✅ |
| **Frontend exibe** | 0:10 | 9:37 ✅ |

---

## ⚠️ **IMPORTANTE:**

### **Tabela calls ainda terá valores inconsistentes:**
```
Campo "duration" ainda tem: 10
Campo "duration_formated" continua: '00:09:37'
```

**MAS** a função agora **prioriza** `duration_formated`, então:
- ✅ Frontend verá valor correto (9:37)
- ✅ Sem modificar dados da tabela
- ✅ Reversível a qualquer momento

### **Se quiser sincronizar os dados da tabela:**
→ Executar: `fix-duration-inconsistencies-complete.sql` (com UPDATE)

---

## 🎉 **APÓS EXECUÇÃO:**

1. ✅ Recarregar página (Ctrl+Shift+R)
2. ✅ Abrir chamada 65711
3. ✅ Verificar que mostra 9:37
4. ✅ Lista e detalhe consistentes!

---

**Status:** ⏳ **PRONTO PARA EXECUÇÃO**  
**Risco:** 🟢 **ZERO** (não modifica dados)  
**Tempo:** ⚡ **~5 segundos**

