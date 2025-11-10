# 📚 EXPLICAÇÃO: Por que Áudios Estão Trocados

**Data:** 10/11/2025  
**Pergunta:** "Onde estão esses áudios? Por que está colocando áudios de outras calls?"

---

## 🏗️ **ARQUITETURA DO SISTEMA:**

### **Dados Armazenados:**

```
TABELA `calls` (PostgreSQL/Supabase):
├── id: UUID único da chamada ✅
├── enterprise: "Conservas Sevilliana" ✅
├── person: "Estefano Garcia" ✅
├── transcription: "Texto completo da conversa..." ✅ SALVO NO BANCO
├── recording_url: "https://cdn.../voip/user__sdr_12345.mp3" ⚠️ LINK EXTERNO
├── duration: 140 segundos
└── created_at: data/hora

ARQUIVO DE ÁUDIO (.mp3):
Localização: DigitalOcean Spaces CDN
URL: https://ggv-chatwoot.nyc3.cdn.digitaloceanspaces.com/voip/user__sdr_12345.mp3
Arquivo físico: user__sdr_12345.mp3 ⚠️ NOME GENÉRICO (sem UUID)
```

---

## 💡 **POR QUE TRANSCRIÇÃO ESTÁ CERTA E ÁUDIO ERRADO:**

### **Transcrição (TEXT no banco):**
```
✅ Salva DIRETAMENTE na coluna transcription
✅ Cada linha da tabela tem SUA transcrição
✅ Impossível sobrescrever outra chamada
✅ Permanente e imutável
```

### **Áudio (Arquivo no CDN):**
```
❌ Salvo como ARQUIVO separado no servidor
❌ URL salva na coluna recording_url
❌ Nome do arquivo é GENÉRICO (sem call.id)
❌ Arquivo pode ser SOBRESCRITO
```

---

## 🐛 **O QUE ACONTECE:**

### **Timeline do Problema:**

```
📅 JANEIRO 2025:
Chamada 1 (ID: aaaa-1111)
├── Gravação salva: user__sdr_12345.mp3 → Áudio A
├── recording_url: ".../voip/user__sdr_12345.mp3"
└── transcription: "Conversa com Estefano..." ✅

📅 FEVEREIRO 2025:
Chamada 2 (ID: bbbb-2222)
├── Gravação salva: user__sdr_12345.mp3 → Áudio B (SOBRESCREVE A!) ❌
├── recording_url: ".../voip/user__sdr_12345.mp3" (MESMA URL!)
└── transcription: "Conversa com João..." ✅

📅 MARÇO 2025:
Chamada 3 (ID: cccc-3333)
├── Gravação salva: user__sdr_12345.mp3 → Áudio C (SOBRESCREVE B!) ❌
├── recording_url: ".../voip/user__sdr_12345.mp3" (MESMA URL!)
└── transcription: "Conversa com Maria..." ✅

═══════════════════════════════════════════════════

📊 RESULTADO HOJE:

Chamada 1:
├── transcription: "Conversa com Estefano..." ✅ CORRETO (no banco)
├── recording_url: ".../user__sdr_12345.mp3"
└── Áudio reproduzido: Áudio C ❌ ERRADO (arquivo foi sobrescrito)

Chamada 2:
├── transcription: "Conversa com João..." ✅ CORRETO (no banco)
├── recording_url: ".../user__sdr_12345.mp3"
└── Áudio reproduzido: Áudio C ❌ ERRADO (arquivo foi sobrescrito)

Chamada 3:
├── transcription: "Conversa com Maria..." ✅ CORRETO (no banco)
├── recording_url: ".../user__sdr_12345.mp3"
└── Áudio reproduzido: Áudio C ✅ CORRETO (último salvo)
```

**309 chamadas** compartilham `user__sdr_12345.mp3` → Todas tocam o ÚLTIMO áudio!

---

## 🔍 **ONDE ESTÃO OS ÁUDIOS:**

### **Fisicamente:**
```
Servidor: DigitalOcean Spaces (CDN)
Bucket: ggv-chatwoot
Pasta: /voip/
Arquivos: user__sdr_xxxxx.mp3

Total de arquivos únicos: ~287
Total de chamadas: 6458
Chamadas afetadas: 1452 (22%)
```

### **No Banco:**
```
Apenas o LINK (recording_url) é salvo
Não o arquivo em si

Exemplo:
recording_url = "https://ggv-chatwoot.nyc3.cdn.../voip/user__sdr_12345.mp3"
                  └─── Link para arquivo externo
```

---

## ❓ **POR QUE ACONTECEU:**

### **Sistema de Naming Problemático:**

```javascript
// ❌ ERRADO (sistema atual):
const audioFilename = `user__sdr_${sdrId}.mp3`;
// Resultado: Mesmo nome para múltiplas chamadas do mesmo SDR!

// ✅ CORRETO (deveria ser):
const audioFilename = `${callId}.mp3`;
// Resultado: Nome único, nunca sobrescreve
```

### **Onde o problema está:**
```
❓ Chatwoot (ao importar chamadas)?
❓ API4COM (ao gravar ligações)?
❓ Sistema interno de sincronização?
❓ Migration de dados antigos?

Resposta: Provavelmente no sistema que gera/importa os áudios
```

---

## 🔧 **POR QUE NÃO PODE SER CORRIGIDO COM CÓDIGO:**

### **O que código frontend faz:**
```javascript
// Frontend só LÊ a URL do banco
const audioUrl = call.recording_url;

// E reproduz o que está lá
<audio src={audioUrl} />
```

### **O problema está em:**
```
1. Nome do arquivo no CDN (físico)
2. URL salva no banco (dados)
3. Sistema que gera/importa (backend/integração)
```

**Frontend não pode:**
- ❌ Mudar nome do arquivo no CDN
- ❌ Saber qual é o áudio correto
- ❌ Re-importar gravações originais

---

## ✅ **O QUE FOI FEITO (LIMPEZA):**

```sql
-- Backup criado: 1452 registros
-- URLs duplicadas removidas
-- recording_url = NULL para chamadas afetadas

Resultado:
✅ Sistema mostra "Áudio não disponível"
✅ Não toca áudio errado
✅ Transcrições e análises continuam funcionando
❌ Perde acesso aos áudios
```

---

## 🎯 **SOLUÇÃO DEFINITIVA (Futuro):**

### **1. Re-importar áudios corretos:**
```
- Buscar gravações originais na API4COM
- Salvar com UUID único: {call.id}.mp3
- Atualizar recording_url no banco
```

### **2. Implementar validação:**
```javascript
// Ao importar nova chamada:
const audioFilename = `${call.id}.mp3`; // UUID único

// Antes de salvar:
if (await fileExists(audioFilename)) {
  console.error('Arquivo já existe!');
  audioFilename = `${call.id}_${Date.now()}.mp3`;
}
```

### **3. Prevenir no futuro:**
```sql
-- Constraint para evitar URLs duplicadas
CREATE UNIQUE INDEX idx_unique_recording_url 
ON calls(recording_url) 
WHERE recording_url IS NOT NULL;
```

---

## 📊 **RESUMO:**

### **Por que transcrição está certa:**
```
✅ Salva NO banco como TEXT
✅ Cada chamada tem a sua
✅ Não pode ser sobrescrita
```

### **Por que áudio está errado:**
```
❌ Salvo FORA do banco como arquivo .mp3
❌ Nome genérico reutilizado
❌ Arquivos sobrescrevem uns aos outros
❌ Múltiplas chamadas apontam para mesmo arquivo
```

### **O que aconteceu:**
```
1452 chamadas (22%) têm recording_url duplicada
Quando toca o áudio: reproduz último arquivo salvo
Transcrição: permanece correta no banco
```

### **Solução aplicada:**
```
✅ URLs duplicadas removidas do banco
✅ Sistema mostra "Áudio indisponível"
✅ Evita confusão com áudio errado
⏳ Re-importação futura necessária
```

---

**🎯 Problema de ARQUITETURA do sistema de gravação, não de código!**

**Correções de código funcionam normalmente.** ✅  
**Áudios precisam ser re-importados da API4COM.** ⏳

