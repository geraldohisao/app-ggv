# 🔧 FIX LOCAL DEVELOPMENT - Corrigir Ambiente Local

## 🎯 PROBLEMAS IDENTIFICADOS:

1. **Netlify Functions** → Tentando acessar functions que não existem localmente
2. **MetaMask Extension** → Conflito com a aplicação
3. **Routing Issues** → Problemas de roteamento local

## 🚀 SOLUÇÕES:

### 1. **DESABILITAR NETLIFY FUNCTIONS LOCALMENTE**

Edite o arquivo `vite.config.ts`:

```typescript
export default defineConfig({
  // ... outras configurações
  define: {
    'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'development'),
    // Desabilitar Netlify functions em desenvolvimento
    'process.env.DISABLE_NETLIFY_FUNCTIONS': JSON.stringify('true')
  }
})
```

### 2. **VERIFICAR CONFIGURAÇÃO DO SUPABASE**

No arquivo `services/config.ts`, certifique-se que as credenciais estão corretas:

```typescript
// Verificar se as credenciais estão no localStorage ou .env
const SUPABASE_URL = 'https://mwlekwyxbfbxfxskywgx.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
```

### 3. **LIMPAR CACHE E REINSTALAR**

```bash
# Limpar cache do npm/node
rm -rf node_modules
rm package-lock.json
npm install

# Limpar cache do Vite
rm -rf dist
rm -rf .vite

# Reiniciar servidor
npm run dev
```

### 4. **DESABILITAR EXTENSÕES DO BROWSER**

- Desabilite temporariamente o **MetaMask**
- Use modo **Incógnito** para testar
- Ou use outro browser

### 5. **VERIFICAR VARIÁVEIS DE AMBIENTE**

Crie/edite `.env.local`:

```env
VITE_SUPABASE_URL=https://mwlekwyxbfbxfxskywgx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
NODE_ENV=development
```

## 🎯 TESTE RÁPIDO:

1. **Abra DevTools** → Console
2. **Execute:** `localStorage.clear()`
3. **Recarregue** a página
4. **Verifique** se carrega

## 📋 ORDEM DE EXECUÇÃO:

1. Limpar cache e reinstalar dependências
2. Verificar credenciais do Supabase
3. Desabilitar extensões problemáticas
4. Testar em modo incógnito
5. Verificar se carrega as chamadas

## 🚀 SE AINDA NÃO FUNCIONAR:

Execute este comando no console do browser:

```javascript
// Testar conexão direta com Supabase
fetch('https://mwlekwyxbfbxfxskywgx.supabase.co/rest/v1/rpc/get_calls_with_filters', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
    'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
  },
  body: JSON.stringify({
    p_sdr: null,
    p_status: null,
    p_type: null,
    p_start_date: null,
    p_end_date: null,
    p_limit: 5,
    p_offset: 0
  })
})
.then(r => r.json())
.then(console.log)
```

## ✅ RESULTADO ESPERADO:

Após essas correções, o sistema deve carregar as chamadas corretamente com:
- Empresas reais (não "Empresa Desconhecida")
- Pessoas corretas
- SDRs formatados
- Todas as funcionalidades funcionando
