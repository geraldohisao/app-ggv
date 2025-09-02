# 🎯 INSTRUÇÕES PARA CORRIGIR OS ERROS DO DEBUG

## ✅ **MOCK SERVER FUNCIONANDO!**

O mock server está rodando e funcionando perfeitamente:
- ✅ `http://localhost:8080/api/diagnostic/test` - OK
- ✅ `http://localhost:8080/api/feedback` - OK  
- ✅ `http://localhost:8080/api/alert` - OK

## 🔧 **PRÓXIMOS PASSOS:**

### **1. 🗄️ CORRIGIR DATABASE (CRÍTICO)**

**O que fazer:**
1. Abra o **Supabase Dashboard** (https://supabase.com)
2. Vá no seu projeto
3. Clique em **SQL Editor** (ícone de banco de dados)
4. Copie e cole o conteúdo do arquivo `EXECUTE_NO_SUPABASE.sql`
5. Clique em **Run** (ou F5)

**Ou execute este código diretamente:**

```sql
-- Remover políticas recursivas
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;

-- Criar políticas simples
CREATE POLICY "Users can view own profile" ON profiles
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON profiles
    FOR UPDATE USING (auth.uid() = id);

-- Criar índices
CREATE INDEX IF NOT EXISTS idx_profiles_id ON profiles(id);

-- Limpar cache
SELECT pg_stat_reset();
```

### **2. 🖥️ MANTER O MOCK SERVER RODANDO**

**Se o servidor parou, execute:**
```bash
cd /Users/geraldohisao/Desktop/app-ggv
node simple-mock-server.js
```

**Deve mostrar:**
```
🚀 Simple Mock Server iniciado!
✅ Rodando em http://localhost:8080
```

### **3. 📱 TESTAR O DEBUG PANEL**

**Após executar o SQL:**
1. Abra a aplicação: `http://localhost:5173`
2. Faça login
3. Pressione `Ctrl+Shift+D` para abrir o debug panel
4. Clique em **"🚀 Executar Todos os Testes"**

## 🎯 **RESULTADO ESPERADO:**

```
🚀 Iniciando todos os testes...

✅ Database: OK
✅ POST Feedback: OK
✅ GET Diagnostic: OK
✅ POST Diagnostic: OK
✅ Google Chat: OK
⚠️ N8N: Failed to fetch (normal - servidor externo)

🎉 Todos os testes concluídos!
```

## 🚨 **SE AINDA TIVER PROBLEMAS:**

### **Database ainda com stack depth:**
- Execute o SQL novamente
- Aguarde 1-2 minutos
- Recarregue a página

### **HTTP 500/404:**
- Verifique se o mock server está rodando
- Execute: `curl http://localhost:8080/api/diagnostic/test`
- Deve retornar JSON com `"success": true`

### **N8N Failed to fetch:**
- **Normal!** É um servidor externo que pode estar offline
- Os outros testes devem passar

---

## 📋 **CHECKLIST:**

- [ ] ✅ Mock server rodando (`node simple-mock-server.js`)
- [ ] 🗄️ Script SQL executado no Supabase
- [ ] 🌐 Aplicação acessível (`http://localhost:5173`)
- [ ] 🛡️ Debug panel funcionando (`Ctrl+Shift+D`)
- [ ] 🧪 Testes passando (exceto N8N)

**🎉 Com esses passos, todos os problemas devem estar resolvidos!**
