# 🤖 Configuração do Router DeepSeek

## 📋 **Status Atual**

### ✅ **Implementado:**
- Router Netlify Function (`/api/ai/stream`)
- Suporte a streaming do DeepSeek
- Fallback para chamada simples
- Sistema de personas (SDR, Closer, Gestor)
- Base de conhecimento (RAG)

### ❌ **Faltando Configurar:**

## 🔧 **1. Variáveis de Ambiente**

### **Netlify Environment Variables:**
```bash
# Chave da API do DeepSeek
DEEPSEEK_API_KEY=sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# Configurações opcionais
DEEPSEEK_MODEL=deepseek-chat
DEEPSEEK_TEMPERATURE=0.7
DEEPSEEK_MAX_TOKENS=4000
```

### **Como Configurar:**
1. Acesse o painel da Netlify
2. Vá em **Site settings** → **Environment variables**
3. Adicione as variáveis acima

## 🔧 **2. Configuração no Banco de Dados**

### **Execute no Supabase:**
```sql
-- Configurar preferência de modelo
INSERT INTO public.app_settings(key, value)
SELECT 'ai_model_preference', '"deepseek"'::jsonb
WHERE NOT EXISTS (
    SELECT 1 FROM public.app_settings WHERE key = 'ai_model_preference'
);

-- Configurar chave do DeepSeek (opcional - pode usar env vars)
INSERT INTO public.app_settings(key, value)
SELECT 'deepseek_api_key', '""'::jsonb
WHERE NOT EXISTS (
    SELECT 1 FROM public.app_settings WHERE key = 'deepseek_api_key'
);
```

## 🔧 **3. Configuração do Frontend**

### **Verificar se está usando o router:**
- O frontend deve chamar `/api/ai/stream` ao invés de usar Gemini diretamente
- Verificar se `services/aiRouterClient.ts` está sendo usado

## 🔧 **4. Teste da Configuração**

### **Teste Local:**
```bash
# Testar se a função Netlify está funcionando
curl -X POST "http://localhost:8888/.netlify/functions/ai-stream" \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Teste do DeepSeek",
    "personaId": "sdr",
    "history": [],
    "knowledgeBase": ""
  }'
```

### **Teste em Produção:**
```bash
curl -X POST "https://app.grupoggv.com/api/ai/stream" \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Teste do DeepSeek",
    "personaId": "sdr",
    "history": [],
    "knowledgeBase": ""
  }'
```

## 🔧 **5. Obter Chave da API DeepSeek**

### **Passos:**
1. Acesse: https://platform.deepseek.com/
2. Crie uma conta ou faça login
3. Vá em **API Keys**
4. Crie uma nova chave
5. Copie a chave (formato: `sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`)

## 🔧 **6. Verificar Logs**

### **Netlify Function Logs:**
- Acesse o painel da Netlify
- Vá em **Functions** → **ai-stream**
- Verifique os logs para erros

### **Console do Navegador:**
- Abra DevTools (F12)
- Vá na aba **Console**
- Verifique se há erros de conexão

## 🎯 **Próximos Passos**

1. **Configure a chave da API** do DeepSeek na Netlify
2. **Execute o script SQL** no Supabase
3. **Teste a configuração** com os comandos acima
4. **Verifique os logs** para confirmar funcionamento

## 📊 **Status de Configuração**

- [ ] Chave da API DeepSeek configurada
- [ ] Variáveis de ambiente na Netlify
- [ ] Configuração no banco de dados
- [ ] Teste local funcionando
- [ ] Teste em produção funcionando
- [ ] Logs sem erros
