# 🔧 GUIA DE SOLUÇÃO DE PROBLEMAS - Sistema de Chamadas

## 🚨 PROBLEMAS IDENTIFICADOS E SOLUÇÕES

### **1. ERRO 500: Internal Server Error em get_call_details**

**Problema:** A função `get_call_details` não está implementada corretamente no Supabase.

**Solução:**
```sql
-- Execute no SQL Editor do Supabase:
-- Arquivo: supabase/sql/28_fix_get_call_details.sql
```

**Passos:**
1. Abra o Supabase Dashboard
2. Vá para SQL Editor
3. Execute o script `28_fix_get_call_details.sql`
4. Verifique se a função foi criada: `SELECT * FROM pg_proc WHERE proname = 'get_call_details';`

---

### **2. ERRO 404: Not Found em rotas de API**

**Problema:** Algumas rotas da API não estão sendo encontradas.

**Possíveis causas:**
- Servidor de desenvolvimento não está rodando
- Roteamento incorreto
- Configuração de proxy

**Soluções:**
1. **Verificar servidor:**
   ```bash
   npm run dev
   # ou
   yarn dev
   ```

2. **Verificar configuração do Vite:**
   ```typescript
   // vite.config.ts
   export default defineConfig({
     server: {
       port: 5173,
       proxy: {
         '/api': 'http://localhost:3000'
       }
     }
   })
   ```

---

### **3. TABELAS DE SUPORTE FALTANDO**

**Problema:** Tabelas `call_comments`, `call_scores`, `scorecards` não existem.

**Solução:**
```sql
-- Execute no SQL Editor do Supabase:
-- Arquivo: supabase/sql/29_create_calls_support_tables.sql
```

**Verificação:**
```sql
-- Verificar se as tabelas foram criadas
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('call_comments', 'call_scores', 'scorecards', 'scorecard_criteria');
```

---

### **4. DADOS SENSÍVEIS NO CONSOLE**

**Problema:** Logs estão expondo dados sensíveis no console do navegador.

**Solução:**
```typescript
// Substituir logs detalhados em produção
const isDevelopment = process.env.NODE_ENV === 'development';

if (isDevelopment) {
  console.log('🔍 Debug data:', sensitiveData);
} else {
  console.log('🔍 Operation completed successfully');
}
```

---

### **5. PERMISSÕES RLS (Row Level Security)**

**Problema:** Usuários não conseguem acessar dados devido a políticas RLS restritivas.

**Verificação:**
```sql
-- Verificar políticas RLS
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename IN ('calls', 'call_comments', 'call_scores');
```

**Solução:**
```sql
-- Ajustar políticas se necessário
ALTER POLICY "Authenticated users can view calls" ON calls 
USING (auth.role() = 'authenticated');
```

---

## 🛠️ SCRIPTS DE CORREÇÃO

### **Script 1: Verificação Completa do Sistema**
```sql
-- 1. Verificar tabelas existentes
SELECT table_name, table_type 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name LIKE '%call%';

-- 2. Verificar funções RPC
SELECT proname, prosrc 
FROM pg_proc 
WHERE proname LIKE '%call%';

-- 3. Verificar políticas RLS
SELECT tablename, policyname, cmd 
FROM pg_policies 
WHERE tablename LIKE '%call%';
```

### **Script 2: Dados de Teste**
```sql
-- Inserir chamada de teste se não existir
INSERT INTO calls (
    id, provider_call_id, deal_id, duration, 
    status, transcription, recording_url, created_at
) VALUES (
    '214608c6-62bc-4bf0-848d-f1cc2bb9a5ec'::UUID,
    '020ea87-fc74-4dec-a2a4-2af693554c1e',
    '63073',
    372,
    'processed',
    'Bom dia! Meu nome é João Silva do Grupo GGV...',
    'https://drive.google.com/file/d/1BxGKJ8vQZgJ4mVcX2nP9rL7sK3fH6wE/view',
    NOW()
) ON CONFLICT (id) DO NOTHING;
```

---

## 🔍 FERRAMENTAS DE DEBUG

### **1. Debug HTML (debug-calls-system.html)**
- Testa conexões API
- Valida funções RPC
- Testa conversão de URLs de áudio
- Analisa transcrições
- Debug de chamadas específicas

### **2. Console do Navegador**
```javascript
// Verificar estado da aplicação
console.log('App State:', window.__APP_STATE__);

// Testar função de análise
const result = analyzeCallContent(transcription, duration, company);
console.log('Analysis Result:', result);

// Verificar configuração do Supabase
console.log('Supabase Config:', supabase?.supabaseUrl);
```

### **3. Network Tab (DevTools)**
- Verificar requisições falhando
- Analisar headers de resposta
- Identificar problemas de CORS
- Verificar payloads de requisição

---

## ⚡ SOLUÇÕES RÁPIDAS

### **Para Erro 500 em get_call_details:**
```bash
# 1. Execute no Supabase
psql -c "$(cat supabase/sql/28_fix_get_call_details.sql)"

# 2. Teste a função
curl -X POST 'YOUR_SUPABASE_URL/rest/v1/rpc/get_call_details' \
-H 'apikey: YOUR_API_KEY' \
-H 'Content-Type: application/json' \
-d '{"p_call_id": "214608c6-62bc-4bf0-848d-f1cc2bb9a5ec"}'
```

### **Para Tabelas Faltando:**
```bash
# Execute no Supabase
psql -c "$(cat supabase/sql/29_create_calls_support_tables.sql)"
```

### **Para Problemas de Áudio:**
```javascript
// Converter URL do Google Drive
function convertGoogleDriveUrl(url) {
  const fileIdMatch = url.match(/\/d\/([a-zA-Z0-9_-]+)/);
  if (fileIdMatch) {
    return `https://drive.google.com/uc?export=download&id=${fileIdMatch[1]}`;
  }
  return url;
}
```

---

## 📋 CHECKLIST DE VERIFICAÇÃO

### **✅ Antes de Reportar Problemas:**
- [ ] Servidor de desenvolvimento está rodando
- [ ] Scripts SQL foram executados no Supabase
- [ ] Permissões RLS estão configuradas
- [ ] Dados de teste existem na tabela calls
- [ ] Console não mostra erros de JavaScript
- [ ] Network tab não mostra erros 404/500

### **✅ Após Aplicar Correções:**
- [ ] Função get_call_details retorna dados
- [ ] Página de análise carrega sem erros
- [ ] Áudio pode ser reproduzido (se disponível)
- [ ] Transcrição é exibida corretamente
- [ ] Análise IA funciona
- [ ] Comentários podem ser adicionados
- [ ] Scores são salvos no banco

---

## 🆘 SUPORTE ADICIONAL

### **Logs Úteis:**
```bash
# Logs do servidor de desenvolvimento
npm run dev 2>&1 | tee dev.log

# Logs do Supabase (se usando CLI local)
supabase logs --level=error
```

### **Contatos:**
- **Documentação:** Consulte `CALLS_ANALYSIS_SYSTEM_IMPLEMENTED.md`
- **Testes:** Execute `test-call-analysis-real.html` no navegador
- **Debug:** Use `debug-calls-system.html` para diagnóstico

---

**🎯 Objetivo:** Sistema funcionando 100% sem erros no console, com análise de chamadas operacional e dados reais do Supabase.
