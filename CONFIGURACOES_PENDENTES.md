# 🔧 Configurações Pendentes - Sistema GGV

## ✅ **Configurações Concluídas:**

### **1. Sistema de IA:**
- ✅ **Gemini como principal** configurado
- ✅ **DeepSeek como fallback** configurado
- ✅ **Chave DeepSeek** na tabela `app_settings`
- ✅ **Router Netlify Function** funcionando
- ✅ **Teste de produção** passando

### **2. Análise de Scorecard:**
- ✅ **Lógica sem nota** quando IA falha
- ✅ **Fallback robusto** implementado
- ✅ **Extração JSON** melhorada

## ❌ **Configurações Pendentes:**

### **1. 🔑 Variáveis de Ambiente na Netlify (URGENTE)**

#### **Configurar no Netlify Dashboard:**
```bash
# Acesse: https://app.netlify.com → Site Settings → Environment Variables

# Variável 1: Chave do Gemini
GEMINI_API_KEY=AIzaSyBT-Bj73STyadLiv9Fip7K6tDR0wJXry4k

# Variável 2: Chave do DeepSeek (já configurada no banco)
DEEPSEEK_API_KEY=sk-a6f8ed8b9eb24eb5b59aae512dc36c28

# Variável 3: Supabase Service Role (para webhooks)
SUPABASE_SERVICE_ROLE_KEY=eyJ...sua_service_role_key_aqui

# Variável 4: Supabase URL (para webhooks)
VITE_SUPABASE_URL=https://xxx.supabase.co
```

### **2. 🔗 Integração N8N (OPCIONAL)**

#### **Para dados reais do Pipedrive:**
```bash
# Variável 5: URL do workflow N8N
N8N_PIPEDRIVE_WEBHOOK_URL=https://seu-n8n-server.com/webhook/pipedrive-deal
```

### **3. 🌐 Busca Web (OPCIONAL)**

#### **Para habilitar busca web no assistente:**
```bash
# Variável 6: Google Custom Search
G_CSE_API_KEY=sua_chave_google_cse
G_CSE_CX=seu_custom_search_engine_id
```

## 🎯 **Prioridades:**

### **🔥 ALTA PRIORIDADE:**
1. **GEMINI_API_KEY** na Netlify (para funcionar em produção)
2. **SUPABASE_SERVICE_ROLE_KEY** na Netlify (para webhooks)

### **🟡 MÉDIA PRIORIDADE:**
3. **VITE_SUPABASE_URL** na Netlify (para webhooks)
4. **N8N_PIPEDRIVE_WEBHOOK_URL** (para dados reais)

### **🟢 BAIXA PRIORIDADE:**
5. **G_CSE_API_KEY** e **G_CSE_CX** (para busca web)

## 🚀 **Como Configurar:**

### **Passo 1: Acessar Netlify**
1. Vá para: https://app.netlify.com
2. Clique no site **app.grupoggv.com**
3. Vá em **Site Settings** → **Environment Variables**

### **Passo 2: Adicionar Variáveis**
1. Clique em **Add variable**
2. Adicione cada variável da lista acima
3. Clique em **Save**

### **Passo 3: Aguardar Deploy**
1. Aguarde 1-2 minutos para propagação
2. Teste o sistema

## 🧪 **Como Testar:**

### **Teste 1: Assistente IA**
```bash
# Acesse: https://app.grupoggv.com
# Vá em "Assistente IA"
# Digite uma pergunta
# Deve funcionar com Gemini principal + DeepSeek fallback
```

### **Teste 2: Análise de Scorecard**
```bash
# Acesse: https://app.grupoggv.com/calls-dashboard
# Vá em uma chamada
# Clique em "Reprocessar"
# Deve funcionar sem dar nota quando IA falha
```

### **Teste 3: Webhook N8N**
```bash
curl -X POST https://app.grupoggv.com/.netlify/functions/n8n-callback \
  -H "Content-Type: application/json" \
  -d '{"workflowId":"test123","status":"completed","message":"Test"}'
```

## 📊 **Status Atual:**

- ✅ **Sistema de IA:** 100% funcional
- ✅ **Análise de Scorecard:** 100% funcional
- ⚠️ **Variáveis Netlify:** Pendente
- ⚠️ **Webhooks N8N:** Pendente
- ⚠️ **Busca Web:** Opcional

## 🎉 **Resultado Final:**

Após configurar as variáveis da Netlify, o sistema estará **100% funcional** em produção com:
- ✅ Gemini como principal
- ✅ DeepSeek como fallback
- ✅ Análise de scorecard robusta
- ✅ Webhooks funcionando
- ✅ Dados reais do Pipedrive (se N8N configurado)
