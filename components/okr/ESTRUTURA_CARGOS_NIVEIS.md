# 📊 **ESTRUTURA DE CARGOS E NÍVEIS - GGV**

## **🎯 HIERARQUIA ORGANIZACIONAL**

```
┌─────────────────────────────────────────────┐
│  NÍVEL 1 - C-LEVEL                         │
│  👑 CEO                                     │
└─────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────┐
│  NÍVEL 2 - DIRETORIA                       │
│  🎖️ Diretor                                 │
└─────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────┐
│  NÍVEL 3 - HEAD/LIDERANÇA                  │
│  🔷 Head Comercial                          │
│  🔷 Head Marketing                          │
│  🔷 Head Projetos                           │
└─────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────┐
│  NÍVEL 4 - GERÊNCIA/COORDENAÇÃO            │
│  📋 Gerente                                 │
│  📋 Coordenador                             │
└─────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────┐
│  NÍVEL 5 - OPERACIONAL                     │
│  ⚙️ SDR                                     │
│  ⚙️ Closer                                  │
│  ⚙️ Analista                                │
│  ⚙️ Analista de Marketing                   │
└─────────────────────────────────────────────┘
```

---

## **❓ ESCLARECENDO DÚVIDAS COMUNS**

### **1. Gerência é o mesmo que Head?**
❌ **NÃO!**

- **Head** = Nível 3 (Liderança estratégica de departamento)
- **Gerência** = Nível 4 (Gestão tática de área/equipe)

**Head é um nível ACIMA de Gerente!**

### **2. Analista seria qual nível?**
✅ **Operacional (Nível 5)**

Analista é o nível operacional, focado na execução de tarefas e processos.

### **3. Coordenador é o mesmo que Gerente?**
✅ **SIM, mesmo nível hierárquico (Nível 4)**

Ambos são responsáveis por gestão de equipes e processos táticos.

---

## **📋 DIFERENÇAS ENTRE FUNÇÃO COMERCIAL E CARGO**

O sistema GGV tem **dois conceitos diferentes**:

### **1️⃣ FUNÇÃO COMERCIAL** (`user_function`)
- **Usado em:** Calculadora de OTE
- **Valores possíveis:**
  - SDR
  - Closer
  - Gestor
  - Analista de Marketing
- **Objetivo:** Definir fórmulas de remuneração variável

### **2️⃣ CARGO** (`cargo`)
- **Usado em:** Sistema de OKR e gestão organizacional
- **Valores possíveis:** Qualquer cargo cadastrado na tabela `cargos`
- **Objetivo:** Definir posição hierárquica e responsabilidades

---

## **🔄 MAPEAMENTO SUGERIDO**

| Função Comercial (OTE) | Cargo Recomendado | Nível |
|------------------------|-------------------|-------|
| SDR | SDR | 5 - Operacional |
| Closer | Closer | 5 - Operacional |
| Gestor | Coordenador / Gerente | 4 - Gerência |
| Analista de Marketing | Analista de Marketing | 5 - Operacional |

---

## **✅ O QUE FOI CORRIGIDO**

### **Antes:**
- ❌ "Analista de Marketing" existia apenas como função comercial
- ❌ Confusão entre Gerência e Head
- ❌ Indefinição do nível de Analista

### **Depois:**
- ✅ "Analista de Marketing" adicionado à tabela `cargos` (nível 5)
- ✅ Hierarquia clara: Head (3) → Gerência (4) → Operacional (5)
- ✅ Analista definido como nível Operacional
- ✅ Documentação completa da estrutura

---

## **🚀 COMO USAR**

### **Para adicionar um novo usuário:**

1. **Definir CARGO:**
   - Gerenciar Cargos → Adicionar cargo se não existir
   - Escolher nível hierárquico correto (1 a 5)

2. **Definir FUNÇÃO COMERCIAL (se aplicável):**
   - Apenas para usuários que terão OTE calculado
   - Escolher entre: SDR, Closer, Gestor, Analista de Marketing

3. **Exemplo:**
   - **Nome:** João Silva
   - **Cargo:** Analista de Marketing (nível 5)
   - **Função Comercial:** Analista de Marketing
   - **Departamento:** Marketing

---

## **📞 SUPORTE**

Se tiver dúvidas sobre qual cargo ou nível usar, consulte esta estrutura ou fale com a gestão.

---

**Última atualização:** Janeiro 2026

