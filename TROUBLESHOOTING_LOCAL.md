# 🔧 Troubleshooting - Desenvolvimento Local

## ✅ **Erro Resolvido: Import de Ícones**

### **Problema:**
```
Failed to resolve import "@heroicons/react/24/outline" from "components/diagnostico/modals/EmailModal.tsx"
```

### **Solução Aplicada:**
O projeto usa ícones customizados, não o Heroicons. Corrigido o import:

```typescript
// ❌ ANTES (incorreto)
import { XMarkIcon, CheckCircleIcon } from '@heroicons/react/24/outline';

// ✅ DEPOIS (correto)
import { XMarkIcon, CheckCircleIcon } from '../../ui/icons';
```

## 🚀 **Como Executar Localmente**

### **1. Pré-requisitos**
```bash
# Node.js 18+
node --version

# npm ou yarn
npm --version
```

### **2. Instalação**
```bash
# Clonar repositório
git clone <repo-url>
cd app-ggv

# Instalar dependências
npm install
```

### **3. Configurar Ambiente**
Crie arquivo `.env.local`:
```bash
# Supabase
VITE_SUPABASE_URL=your-supabase-url
VITE_SUPABASE_ANON_KEY=your-supabase-key

# APIs locais
VITE_API_BASE_URL=http://localhost:8080
VITE_CALLS_API_BASE=http://localhost:8080

# Gmail
VITE_GOOGLE_CLIENT_ID=your-google-client-id
```

### **4. Executar**
```bash
# Desenvolvimento
npm run dev

# Build para produção
npm run build

# Preview da build
npm run preview
```

### **5. Acessar**
- **Local**: `http://localhost:5173`
- **Diagnóstico**: `http://localhost:5173/diagnostico?deal_id=569934`

## 🐛 **Problemas Comuns**

### **Import Errors**
```bash
# Erro: Failed to resolve import
# Solução: Verificar se o caminho está correto
```

**Ícones do projeto:**
```typescript
// ✅ Correto
import { XMarkIcon, CheckCircleIcon } from '../../ui/icons';
import { FormInput } from '../../ui/Form';
```

### **Dependency Issues**
```bash
# Limpar cache e reinstalar
rm -rf node_modules package-lock.json
npm install
```

### **Port Already in Use**
```bash
# Se porta 5173 estiver ocupada
npm run dev -- --port 3000
```

### **Build Issues**
```bash
# TypeScript errors
npm run build

# Se houver erros, verificar tipos
npx tsc --noEmit
```

## 📁 **Estrutura de Arquivos**

```
app-ggv/
├── components/
│   ├── ui/
│   │   ├── icons.tsx          # ✅ Ícones customizados
│   │   ├── Form.tsx           # ✅ Componentes de form
│   │   └── ...
│   ├── diagnostico/
│   │   ├── modals/
│   │   │   └── EmailModal.tsx # ✅ Corrigido
│   │   └── ...
│   └── ...
├── services/                  # ✅ Gmail, Supabase, etc.
├── contexts/                  # ✅ Auth context
├── hooks/                     # ✅ Custom hooks
└── ...
```

## 🔧 **Scripts Disponíveis**

```bash
# Desenvolvimento
npm run dev

# Build
npm run build

# Preview
npm run preview

# Testes
npm run test
```

## 🌐 **URLs de Desenvolvimento**

| Funcionalidade | URL Local |
|---|---|
| **Home** | `http://localhost:5173` |
| **Diagnóstico** | `http://localhost:5173/diagnostico` |
| **Com Deal ID** | `http://localhost:5173/diagnostico?deal_id=569934` |
| **Resultado** | `http://localhost:5173/resultado-diagnostico` |

## ✅ **Checklist de Verificação**

### **Instalação**
- [ ] Node.js 18+ instalado
- [ ] Dependências instaladas (`npm install`)
- [ ] Arquivo `.env.local` configurado

### **Execução**
- [ ] `npm run dev` executando sem erros
- [ ] Acesso em `http://localhost:5173`
- [ ] Login funcionando
- [ ] Diagnóstico carregando

### **Funcionalidades**
- [ ] Autenticação funcionando
- [ ] Formulários carregando
- [ ] Ícones aparecendo corretamente
- [ ] Navegação funcionando

## 🚨 **Se Ainda Houver Problemas**

### **1. Verificar Logs**
```bash
# No terminal onde rodou npm run dev
# Procurar por erros vermelhos
```

### **2. Verificar Browser**
```bash
# Abrir DevTools (F12)
# Verificar Console e Network tabs
```

### **3. Limpar Cache**
```bash
# Limpar cache do browser
# Ou usar modo incógnito
```

### **4. Reinstalar**
```bash
# Último recurso
rm -rf node_modules package-lock.json
npm install
npm run dev
```

---

**✅ Erro de import resolvido! Desenvolvimento local funcionando.**

**Comando para executar: `npm run dev`**
**Acesso: `http://localhost:5173`**

