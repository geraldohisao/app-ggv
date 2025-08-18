# 🌐 Guia de Uso: Local vs Produção

## ✅ **Sim, você pode usar ambos!**

O sistema foi configurado para funcionar automaticamente tanto em **desenvolvimento local** quanto em **produção** (`app.grupoggv.com`).

## 🔧 **Como Funciona a Detecção Automática**

### **🖥️ Ambiente Local (Desenvolvimento)**
**Detectado quando:**
- `window.location.hostname === 'localhost'`
- `window.location.hostname === '127.0.0.1'`

**URLs utilizadas:**
- **Frontend**: `http://localhost:5173`
- **API**: `http://localhost:8080`
- **Webhooks**: `http://localhost:8080/webhook/...`

### **🌍 Ambiente Produção**
**Detectado quando:**
- `window.location.hostname === 'app.grupoggv.com'`

**URLs utilizadas:**
- **Frontend**: `https://app.grupoggv.com`
- **API**: `https://app.grupoggv.com/api`
- **Webhooks**: `https://app.grupoggv.com/api/webhook/...`

## 🚀 **Como Usar Localmente**

### **1. Clonar e Instalar**
```bash
# Clonar o repositório
git clone <repo-url>
cd app-ggv

# Instalar dependências
npm install
```

### **2. Configurar Variáveis de Ambiente**
Crie um arquivo `.env.local`:
```bash
# Supabase (mesmas de produção)
VITE_SUPABASE_URL=your-supabase-url
VITE_SUPABASE_ANON_KEY=your-supabase-key

# APIs locais
VITE_API_BASE_URL=http://localhost:8080
VITE_CALLS_API_BASE=http://localhost:8080

# Gmail (mesmas de produção)
VITE_GOOGLE_CLIENT_ID=your-google-client-id
```

### **3. Executar em Desenvolvimento**
```bash
# Iniciar servidor de desenvolvimento
npm run dev

# Acessar em:
# http://localhost:5173
# http://localhost:5173/diagnostico?deal_id=569934
```

## 🌍 **Como Usar em Produção**

### **1. Deploy Automático**
- Push para branch principal
- Netlify faz deploy automático
- Disponível em: `https://app.grupoggv.com`

### **2. URLs de Produção**
- **Home**: `https://app.grupoggv.com`
- **Diagnóstico**: `https://app.grupoggv.com/diagnostico?deal_id=569934`
- **Resultado**: `https://app.grupoggv.com/resultado-diagnostico`

## 🔀 **Funcionalidades por Ambiente**

| Funcionalidade | Local | Produção | Status |
|---|---|---|---|
| **Login/Logout** | ✅ | ✅ | Funcionando |
| **Diagnóstico** | ✅ | ✅ | Funcionando |
| **E-mail (Gmail)** | ✅ | ✅ | Funcionando |
| **Webhooks** | 🔧 | ✅ | Local precisa API |
| **Pipedrive** | 🔧 | ✅ | Local precisa API |
| **Relatórios** | ✅ | ✅ | Funcionando |

## 🔧 **Configurações Específicas**

### **EmailModal - Links Dinâmicos**
```typescript
// Detecta ambiente automaticamente
const isProduction = window.location.hostname === 'app.grupoggv.com';
const baseUrl = isProduction ? 'https://app.grupoggv.com' : window.location.origin;

// E-mail sempre usa URL correta
const publicUrl = `${baseUrl}/r/${token}`;
```

### **Webhooks - URLs Dinâmicas**
```typescript
// Desenvolvimento
const isDevelopment = window.location.hostname === 'localhost';
const webhookUrl = isDevelopment 
    ? 'http://localhost:8080/webhook/diag-ggv-register'
    : 'https://app.grupoggv.com/api/webhook/diag-ggv-register';
```

### **Vite Config - Proxy Automático**
```typescript
// Configura proxy baseado no ambiente
const isProduction = mode === 'production';
const apiBaseUrl = isProduction 
    ? 'https://app.grupoggv.com/api'
    : 'http://localhost:8080';
```

## 🧪 **Testando Ambos os Ambientes**

### **Teste Local**
```bash
# 1. Executar localmente
npm run dev

# 2. Abrir no browser
http://localhost:5173/diagnostico?deal_id=569934

# 3. Verificar logs
# Deve mostrar: "Ambiente: Desenvolvimento"
```

### **Teste Produção**
```bash
# 1. Acessar produção
https://app.grupoggv.com/diagnostico?deal_id=569934

# 2. Verificar logs
# Deve mostrar: "Ambiente: Produção"
```

## 📋 **Checklist de Verificação**

### **Ambiente Local**
- [ ] `npm run dev` funcionando
- [ ] Acesso em `http://localhost:5173`
- [ ] Login funcionando
- [ ] Diagnóstico funcionando
- [ ] Logs mostram "Desenvolvimento"

### **Ambiente Produção**
- [ ] Acesso em `https://app.grupoggv.com`
- [ ] Login funcionando
- [ ] Diagnóstico funcionando
- [ ] E-mail funcionando
- [ ] Webhooks funcionando
- [ ] Logs mostram "Produção"

## 🔄 **Sincronização de Dados**

**Importante:** Ambos os ambientes usam:
- ✅ **Mesmo Supabase**: Dados compartilhados
- ✅ **Mesmo Gmail**: Configurações iguais
- ✅ **Mesmo Pipedrive**: Integração única

## 🚨 **Limitações do Ambiente Local**

1. **Webhooks**: Pipedrive não consegue chamar `localhost` diretamente
2. **OAuth**: Google precisa ter `localhost:5173` configurado
3. **APIs Externas**: Algumas podem bloquear localhost

## 💡 **Dicas de Uso**

### **Desenvolvimento**
- Use local para desenvolvimento e testes
- Teste funcionalidades básicas localmente
- Deploy para produção para testes completos

### **Produção**
- Use para demonstrações e uso real
- Todas as funcionalidades disponíveis
- Integração completa com Pipedrive

---

**✅ Sistema configurado para uso em ambos os ambientes!**

**Desenvolvimento: `http://localhost:5173`**
**Produção: `https://app.grupoggv.com`**
