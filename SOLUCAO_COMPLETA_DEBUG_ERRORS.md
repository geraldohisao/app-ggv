# 🔧 SOLUÇÃO COMPLETA - Erros do Debug Panel

## 🚨 **Problemas Identificados:**

```
❌ Database: stack depth limit exceeded
❌ POST Feedback: HTTP 404
❌ GET Diagnostic: Unexpected token '<', "<!DOCTYPE "... is not valid JSON
❌ POST Diagnostic: HTTP 404
❌ Google Chat: HTTP 404
❌ N8N: Failed to fetch
```

## ✅ **SOLUÇÕES IMPLEMENTADAS**

### **1. 🗄️ Corrigir Database Stack Depth Limit**

**Problema:** Recursão infinita em políticas RLS do Supabase
**Solução:** Execute este script no **SQL Editor do Supabase**:

```sql
-- Execute no Supabase SQL Editor
\i fix-stack-depth-limit.sql
```

**OU copie e cole este código:**

```sql
-- Recriar políticas simples e não-recursivas
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
CREATE POLICY "Users can view own profile" ON profiles
    FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
CREATE POLICY "Users can update own profile" ON profiles
    FOR UPDATE USING (auth.uid() = id);

-- Criar índices para otimizar consultas
CREATE INDEX IF NOT EXISTS idx_profiles_id ON profiles(id);
CREATE INDEX IF NOT EXISTS idx_knowledge_documents_user_id ON knowledge_documents(user_id);

-- Limpar cache
SELECT pg_stat_reset();
```

### **2. 🔧 Corrigir Endpoints HTTP 404 (Local)**

**Problema:** Você está rodando **localmente** mas as funções Netlify não estão disponíveis
**Solução:** Iniciar o mock server para simular as funções

#### **Opção A: Mock Server (Recomendado para desenvolvimento)**

```bash
# Terminal 1: Iniciar mock server
node mock-netlify-functions-server.js

# Terminal 2: Iniciar aplicação
npm run dev
```

#### **Opção B: Usar Netlify CLI**

```bash
# Instalar Netlify CLI
npm install -g netlify-cli

# Iniciar com funções
netlify dev
```

### **3. 📡 Configurar Proxy do Vite**

**Problema:** Proxy não está redirecionando corretamente
**Solução:** Verificar se o `vite.config.ts` tem o proxy correto:

```typescript
// vite.config.ts
proxy: {
  '/api': {
    target: 'http://localhost:8080',  // Mock server
    changeOrigin: true,
    secure: false,
  }
}
```

### **4. 🌐 Debug Panel Melhorado**

**Implementado:** Detecção automática de ambiente (local vs produção)
- ✅ **Local**: Usa `/api/*` (proxy do Vite)
- ✅ **Produção**: Usa `/.netlify/functions/*`
- ✅ **Logs detalhados**: Mostra qual endpoint está sendo usado
- ✅ **Melhor tratamento de erros**: Detecta HTML vs JSON

## 🚀 **COMO APLICAR AS CORREÇÕES**

### **Passo 1: Corrigir Database (CRÍTICO)**

1. Abra o **Supabase Dashboard**
2. Vá em **SQL Editor**
3. Execute o script `fix-stack-depth-limit.sql`
4. Verifique se não há mais erros

### **Passo 2: Iniciar Mock Server (Local)**

```bash
# Terminal 1: Mock server
cd /Users/geraldohisao/Desktop/app-ggv
node mock-netlify-functions-server.js
```

Deve mostrar:
```
✅ Mock server rodando em http://localhost:8080
📋 Endpoints disponíveis:
   GET  http://localhost:8080/api/diagnostic/test
   POST http://localhost:8080/api/feedback
   POST http://localhost:8080/api/alert
   ...
```

### **Passo 3: Iniciar Aplicação**

```bash
# Terminal 2: Aplicação
cd /Users/geraldohisao/Desktop/app-ggv
npm run dev
```

### **Passo 4: Testar Debug Panel**

1. Abra: `http://localhost:5173`
2. Faça login
3. Pressione `Ctrl+Shift+D` para abrir o debug panel
4. Clique em "🚀 Executar Todos os Testes"

## ✅ **RESULTADO ESPERADO**

Após aplicar todas as correções:

```
🚀 Iniciando todos os testes...

✅ Database: OK
✅ POST Feedback: OK
✅ GET Diagnostic: OK
✅ POST Diagnostic: OK
✅ Google Chat: OK
✅ N8N: OK (ou Failed to fetch se servidor externo offline)

🎉 Todos os testes concluídos!
```

## 🔍 **TROUBLESHOOTING**

### **Se ainda tiver "stack depth limit exceeded":**
- Execute novamente o script SQL no Supabase
- Aguarde 1-2 minutos para o cache limpar
- Recarregue a página

### **Se ainda tiver HTTP 404:**
- Verifique se o mock server está rodando na porta 8080
- Verifique se não há outro processo usando a porta 8080
- Execute: `lsof -i :8080` para verificar

### **Se ainda tiver "Unexpected token '<'":**
- Significa que está recebendo HTML ao invés de JSON
- Verifique se o endpoint está retornando dados corretos
- Abra `http://localhost:8080/api/diagnostic/test` no navegador

### **Para produção (app.grupoggv.com):**
- Os endpoints devem funcionar automaticamente
- As funções Netlify estão deployadas
- Se houver problemas, verifique o deploy no Netlify

## 📋 **CHECKLIST FINAL**

- [ ] Script SQL executado no Supabase
- [ ] Mock server rodando (`node mock-netlify-functions-server.js`)
- [ ] Aplicação rodando (`npm run dev`)
- [ ] Debug panel acessível (`Ctrl+Shift+D`)
- [ ] Todos os testes passando

---

**🎯 Com essas correções, todos os problemas do debug panel devem estar resolvidos!**
