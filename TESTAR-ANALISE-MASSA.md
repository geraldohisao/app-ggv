# 🚀 GUIA: Análise em Massa de Chamadas

## ✅ O QUE JÁ ESTÁ PRONTO:

1. ✅ Sistema usando **OpenAI GPT** (não mais Gemini)
2. ✅ Painel de análise em massa na página de chamadas
3. ✅ Estatísticas automáticas (chamadas elegíveis, analisadas, etc.)
4. ✅ Dois modos: "Analisar Novas" e "Re-analisar Todas"
5. ✅ Notas aparecem na lista após análise

---

## 📋 PASSO A PASSO PARA TESTAR:

### 1️⃣ VERIFICAR SE O PAINEL APARECE

Na página de **Chamadas**, logo no topo, você deve ver:

```
🤖 Análise IA Automática
Sistema unificado de análise em massa
```

Com estatísticas em cards:
- Total Chamadas
- Atendidas
- Com Transcrição
- >3 Minutos
- >10 Segmentos
- **Elegíveis IA** ← Importante!
- Já Analisadas
- **Precisam Análise** ← Importante!

**❓ O PAINEL APARECE?**
- ✅ **SIM** → Continue para passo 2
- ❌ **NÃO** → Motivo: Você precisa ser ADMIN ou SUPER_ADMIN
  - Verificar role no banco: `SELECT email, role FROM profiles WHERE email = 'geraldo@grupoggv.com';`
  - Role deve ser 'ADMIN' ou 'SUPER_ADMIN'

---

### 2️⃣ VERIFICAR API KEY DO OPENAI

A análise precisa da chave da API do OpenAI configurada. Execute no SQL:

```sql
-- Verificar se a chave está configurada
SELECT 
    key,
    value,
    updated_at
FROM app_settings
WHERE key = 'openai_api_key';

-- Se NÃO existir, inserir:
INSERT INTO app_settings (key, value, updated_at)
VALUES (
    'openai_api_key',
    'sk-proj-XXXXX',  -- ← COLOQUE SUA CHAVE AQUI!
    NOW()
)
ON CONFLICT (key) DO UPDATE 
SET value = EXCLUDED.value, updated_at = NOW();

-- Verificar modelo (opcional, padrão é gpt-4o-mini)
SELECT * FROM app_settings WHERE key = 'openai_model';
```

**🔑 ONDE CONSEGUIR A CHAVE:**
- https://platform.openai.com/api-keys
- Crie uma nova API key se necessário
- Formato: `sk-proj-...` ou `sk-...`

---

### 3️⃣ TESTAR A ANÁLISE

1. **Recarregue a página** (Ctrl+R) após configurar a chave

2. **Clique em** "🔄 Atualizar" no painel para recarregar estatísticas

3. **Verifique os números:**
   - Se "Elegíveis IA" = 0 → Nenhuma chamada cumpre os critérios
   - Se "Precisam Análise" > 0 → Há chamadas prontas para analisar!

4. **Clique em** "⚡ Analisar X Novas" (botão azul)
   - Deve aparecer barra de progresso
   - Console mostrará logs detalhados

---

### 4️⃣ CRITÉRIOS PARA UMA CHAMADA SER ELEGÍVEL:

Para ser analisada, a chamada PRECISA ter:
- ✅ **Status:** Atendida (`status_voip = 'normal_clearing'`)
- ✅ **Duração:** Mínimo 3 minutos
- ✅ **Transcrição:** Mínimo 100 caracteres
- ✅ **Segmentos:** Mínimo 10 segmentos de conversa

**Para verificar quais chamadas são elegíveis:**

```sql
SELECT 
    id,
    enterprise,
    person,
    agent_id,
    status_voip,
    duration_formated,
    LENGTH(transcription) as transcription_length,
    CASE 
        WHEN transcription IS NOT NULL THEN
            (LENGTH(transcription) - LENGTH(REPLACE(transcription, '.', ''))) +
            (LENGTH(transcription) - LENGTH(REPLACE(transcription, '?', ''))) +
            (LENGTH(transcription) - LENGTH(REPLACE(transcription, '!', '')))
        ELSE 0
    END as segments,
    CASE 
        WHEN status_voip = 'normal_clearing' 
             AND duration >= 180  -- 3 minutos
             AND LENGTH(transcription) > 100
             AND (
                (LENGTH(transcription) - LENGTH(REPLACE(transcription, '.', ''))) +
                (LENGTH(transcription) - LENGTH(REPLACE(transcription, '?', ''))) +
                (LENGTH(transcription) - LENGTH(REPLACE(transcription, '!', '')))
             ) > 10
        THEN '✅ ELEGÍVEL'
        ELSE '❌ NÃO ELEGÍVEL'
    END as status_elegibilidade
FROM calls
WHERE status_voip = 'normal_clearing'
ORDER BY created_at DESC
LIMIT 20;
```

---

## 🐛 PROBLEMAS COMUNS:

### 🔴 "Nenhuma chamada elegível encontrada"
**Causa:** Não há chamadas que cumpram TODOS os critérios  
**Solução:** Verificar query SQL acima para ver quais critérios faltam

### 🔴 "Chave da API OpenAI não configurada"
**Causa:** Chave não está no banco ou está inválida  
**Solução:** Executar SQL do passo 2️⃣

### 🔴 Botão "Analisar" está desabilitado/cinza
**Causa:** `callsNeedingAnalysis = 0`  
**Solução:** Todas já foram analisadas. Use "Re-analisar Todas" para forçar

### 🔴 Erro "401 Unauthorized" ao analisar
**Causa:** Chave da API OpenAI inválida ou expirada  
**Solução:** Gerar nova chave em https://platform.openai.com/api-keys

---

## 📊 LOGS ESPERADOS NO CONSOLE:

Quando funciona corretamente, você verá:

```
📊 Buscando estatísticas unificadas...
📄 Página 1 processada: 1000 chamadas (total acumulado: 1000)
📄 Página 2 processada: 1000 chamadas (total acumulado: 2000)
...
📋 Total de chamadas encontradas: XXXX

🚀 Iniciando análise em lote (forceReprocess: false)
📊 Encontradas XX chamadas para análise

🤖 Chamando OpenAI GPT...
🤖 Usando modelo: gpt-4o-mini
✅ OpenAI respondeu com sucesso!
💾 Salvando análise no banco...
✅ Análise salva com ID: ...

🎉 Análise em lote concluída: { successful: XX, failed: 0, total: XX }
```

---

## ✅ RESULTADO ESPERADO:

Após análise bem-sucedida:
1. ✅ Estatísticas atualizadas ("Já Analisadas" aumenta)
2. ✅ Notas aparecem na lista de chamadas
3. ✅ Ao clicar em uma chamada, scorecard completo aparece
4. ✅ Console mostra "✅ Análise salva..."

---

## 🆘 PRECISA DE AJUDA?

**ME ENVIE:**
1. ✅ Print do painel de análise (estatísticas)
2. ✅ Logs completos do console (abra F12 → Console)
3. ✅ Resultado da query de elegibilidade (SQL acima)
4. ✅ Se erro aparecer, print completo da mensagem

**Vou diagnosticar e corrigir! 💪**

