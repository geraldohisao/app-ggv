# 📞 GUIA: Como Recuperar Áudios Corretos

**Data:** 10/11/2025  
**Situação:** 1452 chamadas sem áudio após limpeza  
**Objetivo:** Re-importar áudios corretos da API4COM

---

## 🎯 **SITUAÇÃO ATUAL:**

### **O que temos:**
```
✅ Transcrições: 100% corretas (todas no banco)
✅ Análises: 100% corretas (baseadas em transcrições)
✅ Dados: Completos (empresa, pessoa, data, telefone)
❌ Áudios: 1452 chamadas sem recording_url
```

### **O que precisamos:**
```
🎯 Áudios originais de cada chamada
🎯 URLs corretas para cada gravação
🎯 Sistema para associar áudio → chamada com UUID único
```

---

## 📋 **PASSO A PASSO PARA RECUPERAÇÃO:**

### **PASSO 1: Gerar Lista de IDs**

Execute SQL:
```sql
-- Arquivo: GERAR_LISTA_PARA_REIMPORTAR.sql

-- Lista completa (1452 IDs)
SELECT id FROM calls 
WHERE recording_url IS NULL 
ORDER BY created_at DESC;

-- Ou priorizar últimas 7 dias
SELECT id FROM calls 
WHERE recording_url IS NULL 
  AND created_at >= NOW() - INTERVAL '7 days'
ORDER BY created_at DESC;
```

**Exporte para CSV ou copie os IDs**

---

### **PASSO 2: Contatar API4COM**

**Email para suporte:**

```
Assunto: Solicitação de Re-importação de Áudios de Chamadas

Olá equipe API4COM,

Identificamos que algumas gravações em nosso sistema estão com URLs 
incorretas devido a um problema de naming de arquivos.

Gostaríamos de solicitar a re-exportação dos áudios das seguintes 
chamadas (IDs no anexo CSV).

Informações que temos:
- Total de chamadas: 1452
- Período: 10/11/2025 (últimas)
- Sistema: Chatwoot/API4COM

Poderia nos fornecer URLs corretas das gravações originais?

Idealmente no formato:
- call_id: {UUID}
- recording_url: https://.../{call_id}.mp3

Obrigado!
```

**Anexar:** CSV com IDs das chamadas

---

### **PASSO 3: Atualizar Banco de Dados**

Quando API4COM enviar as URLs:

```sql
-- Atualizar individualmente
UPDATE calls 
SET recording_url = 'https://nova-url-correta.mp3'
WHERE id = '99bd7686-d1c3-4940-86ba-b1af7e78124d';

-- Ou em lote (se receberem CSV)
-- Importar CSV temporário:
CREATE TEMP TABLE urls_novas (
    call_id UUID,
    new_url TEXT
);

-- Copiar dados do CSV
\COPY urls_novas FROM 'caminho/arquivo.csv' CSV HEADER;

-- Atualizar em lote
UPDATE calls c
SET recording_url = n.new_url
FROM urls_novas n
WHERE c.id = n.call_id;
```

---

### **PASSO 4: Validar**

```sql
-- Conferir quantas foram recuperadas
SELECT 
    COUNT(*) as total_recuperadas
FROM calls 
WHERE id IN (SELECT call_id FROM urls_novas);

-- Verificar duplicadas (não deve ter)
SELECT 
    recording_url,
    COUNT(*)
FROM calls 
WHERE recording_url IS NOT NULL
GROUP BY recording_url
HAVING COUNT(*) > 1;
```

---

## 🔧 **SOLUÇÃO PREVENTIVA (FUTURO):**

### **Implementar no sistema de importação:**

```javascript
// Ao receber nova chamada da API4COM:
const audioFilename = `${call.id}.mp3`; // UUID único

// Upload para CDN com nome único
const audioUrl = await uploadToCDN({
  filename: audioFilename,
  buffer: audioData,
  bucket: 'ggv-chatwoot',
  folder: 'voip'
});

// Salvar URL no banco
await supabase
  .from('calls')
  .update({ recording_url: audioUrl })
  .eq('id', call.id);

// Validar se URL já existe
const { data: existing } = await supabase
  .from('calls')
  .select('id')
  .eq('recording_url', audioUrl)
  .neq('id', call.id);

if (existing?.length > 0) {
  console.error('⚠️ URL duplicada detectada!');
  // Gerar novo nome único
}
```

---

## 📊 **PRIORIZAÇÃO:**

### **Alta Prioridade (Re-importar primeiro):**
```sql
-- Chamadas recentes (última semana)
-- Chamadas com análise de IA
-- Chamadas com nota alta (> 8.0)

SELECT id, enterprise, created_at, final_grade
FROM calls c
LEFT JOIN call_analysis ca ON ca.call_id = c.id
WHERE c.recording_url IS NULL
  AND (
    c.created_at >= NOW() - INTERVAL '7 days'
    OR ca.final_grade >= 8.0
  )
ORDER BY ca.final_grade DESC NULLS LAST, c.created_at DESC;
```

### **Baixa Prioridade:**
```sql
-- Chamadas antigas (> 6 meses)
-- Chamadas sem análise
-- Chamadas muito curtas (< 1 min)
```

---

## 🎯 **RESUMO:**

### **Não dá para "pegar da tabela":**
```
❌ Tabela só tem LINK (recording_url)
❌ Arquivo físico não está no banco
❌ Arquivo foi SOBRESCRITO no CDN
❌ Áudio original foi PERDIDO
```

### **Para recuperar:**
```
1. ✅ Gerar lista de IDs (SQL criado)
2. 📧 Solicitar à API4COM
3. ⏳ Aguardar eles enviarem URLs
4. 🔧 Atualizar banco com URLs corretas
5. ✅ Implementar UUID único no futuro
```

### **Situação atual:**
```
✅ Correções de código funcionando
✅ Limpeza executada (sem áudio errado)
✅ Sistema mostra "indisponível"
⏳ Aguardando re-importação da API4COM
```

---

## **💬 PRÓXIMO PASSO:**

**Execute query para gerar lista e contacte API4COM:**

```sql
-- GERAR_LISTA_PARA_REIMPORTAR.sql
-- Query 2 ou 3 para pegar todos os IDs
```

**Ou me diga se quer:**
- Priorizar só chamadas recentes (última semana)?
- Priorizar chamadas com análise?
- Tentar todas as 1452?

---

**📁 SQL criado:** `GERAR_LISTA_PARA_REIMPORTAR.sql`  
**Aguardando:** Sua decisão sobre priorização! 🎯
