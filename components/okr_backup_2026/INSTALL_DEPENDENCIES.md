# **📦 Instalação de Dependências - Fase 3**

## **🎯 Dependências Necessárias**

Para habilitar **TODAS** as funcionalidades da Fase 3 (Polish):

### **1. Exportação de PDF Profissional:**

```bash
npm install html2canvas jspdf
```

**Habilita:**
- ✅ Exportar mapa visual em PDF
- ✅ Exportar análise em PDF
- ✅ Relatório completo PDF
- ✅ Alta qualidade (2x scale)

### **2. Toast Notifications:**

```bash
npm install react-hot-toast
```

**Habilita:**
- ✅ Notificações elegantes
- ✅ Feedback visual melhor
- ✅ Loading states bonitos
- ✅ Sem alerts nativos

### **3. Animações (Opcional):**

```bash
npm install framer-motion
```

**Habilita:**
- ✅ Transições suaves
- ✅ Animações de entrada/saída
- ✅ Drag & drop animado

---

## **⚡ Instalação Rápida (Recomendada)**

Instale tudo de uma vez:

```bash
cd /Users/geraldohisao/Projects/app-ggv

npm install html2canvas jspdf react-hot-toast
```

---

## **✅ O que funciona SEM instalar:**

**Core (Fase 1 + 2):**
- ✅ Dashboard
- ✅ CRUD completo
- ✅ Histórico de versões
- ✅ Compartilhamento
- ✅ Análise SWOT
- ✅ Validações
- ✅ Auto-save

**Com fallback:**
- ⚠️ Exportar → Gera TXT (sem PDF)
- ⚠️ Notificações → Alerts nativos

---

## **🎯 O que NÃO funciona sem instalar:**

**Apenas:**
- ❌ PDF profissional
- ❌ Toast notifications

**Mas tem fallback funcional!** ✅

---

## **📊 Tamanho das Dependências**

| Pacote | Tamanho | Essencial? |
|--------|---------|------------|
| `html2canvas` | ~350KB | Para PDF |
| `jspdf` | ~150KB | Para PDF |
| `react-hot-toast` | ~50KB | Para UX |
| `framer-motion` | ~300KB | Opcional |

**Total:** ~850KB (com tudo)
**Essencial:** ~550KB (sem framer-motion)

---

## **🚀 Após Instalar**

### **1. Verificar:**
```bash
npm list html2canvas jspdf react-hot-toast
```

### **2. Testar PDF:**
```
No editor → Click "📄 PDF"
Deve gerar PDF profissional ✅
```

### **3. Ver Toasts:**
```
Salvar OKR → Toast verde no canto
Deletar OKR → Toast vermelho
Loading → Toast com spinner
```

---

## **💡 Alternativa: Uso Sem Instalar**

Se **NÃO** quiser instalar dependências:

**O módulo funciona 100%!**
- Exporta TXT ao invés de PDF
- Usa alerts ao invés de toasts
- **Tudo funcional!** ✅

---

## **✅ Conclusão**

**Obrigatório:** Nada! Tudo tem fallback

**Recomendado:** html2canvas + jspdf + react-hot-toast

**Comando:**
```bash
npm install html2canvas jspdf react-hot-toast
```

**Benefício:** PDF profissional + UX melhor 🎯

