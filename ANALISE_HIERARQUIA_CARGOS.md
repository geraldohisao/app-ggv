# 🔧 ANÁLISE E CORREÇÃO: HIERARQUIA DE CARGOS

**Data:** 08/01/2026  
**Problema:** Cargos com níveis hierárquicos incorretos no organograma

---

## 🔍 PROBLEMAS IDENTIFICADOS

### **PROBLEMA 1: Marketing - Todos no mesmo nível**

**Situação Atual:**
```
MARKETING (todos nível 5)
├─ Estagiário       (nível 5) ❌
├─ Trainee          (nível 5) ❌
└─ Analista de Mkt  (nível 5) ❌
```

**Situação Correta:**
```
MARKETING
├─ Analista de Marketing (nível 5) ✅ GERENCIA ↓
    ├─ Trainee          (nível 6) ✅
    └─ Estagiário       (nível 7) ✅
```

**Lógica:**
- **Analista de Marketing** = Posição sênior (gerencia campanhas + equipe júnior)
- **Trainee** = Em desenvolvimento (aprende com analista)
- **Estagiário** = Iniciante (tarefas básicas)

---

### **PROBLEMA 2: Projetos - Gerente = Coordenador**

**Situação Atual:**
```
PROJETOS
├─ Gerente de Projetos    (nível 4) ❌
└─ Coordenador de Projetos (nível 4) ❌ <- MESMO NÍVEL!
```

**Situação Correta:**
```
PROJETOS
├─ Gerente de Projetos      (nível 4) ✅
    └─ Coordenador de Projetos (nível 5) ✅ REPORTA ↑
```

**Lógica:**
- **Gerente** = Responsável por múltiplas equipes/projetos
- **Coordenador** = Gerencia equipe específica, reporta ao Gerente

---

### **PROBLEMA 3: Consultores - Departamento Errado?**

**Situação Atual:**
```
PROJETOS (departamento)
└─ Consultores (vendedores externos) ❓
```

**Você mencionou:**
> "Dentro de projetos tem os consultores que são comercial e o time de inteligência de mercado"

**Opções de Correção:**

#### **OPÇÃO A: Criar cargo específico "Consultor Comercial"**
```sql
INSERT INTO cargos (name, description, level) VALUES
  ('Consultor Comercial', 'Vendedor externo (atua em campo)', 6);

-- Depois atualizar usuários:
UPDATE profiles 
SET cargo = 'Consultor Comercial', 
    department = 'comercial'
WHERE cargo = 'Consultor' AND /* critério para identificar comerciais */;
```

#### **OPÇÃO B: Mover consultores comerciais para dept. Comercial**
```sql
UPDATE profiles 
SET department = 'comercial'
WHERE cargo = 'Consultor' AND name IN ('Eduardo', 'Rafael', ...);
```

#### **OPÇÃO C: Criar departamento "Inteligência de Mercado"**
```sql
INSERT INTO departments (name, description, color) VALUES
  ('Inteligência de Mercado', 'Análise e pesquisa de mercado', '#F59E0B');

UPDATE profiles 
SET department = 'inteligência de mercado'
WHERE cargo = 'Consultor' AND /* critério para time de BI */;
```

---

## ✅ SOLUÇÃO IMPLEMENTADA

### **NOVA HIERARQUIA DE NÍVEIS (1-7)**

```
┌─────────────────────────────────────────────┐
│ Nível 1: C-LEVEL                            │
│ ├─ CEO, COO, Sócio                          │
└─────────────────────────────────────────────┘
        ↓
┌─────────────────────────────────────────────┐
│ Nível 2: DIRETORIA                          │
│ ├─ Diretor                                  │
└─────────────────────────────────────────────┘
        ↓
┌─────────────────────────────────────────────┐
│ Nível 3: HEADS                              │
│ ├─ Head Comercial                           │
│ ├─ Head Marketing                           │
│ ├─ Head Projetos                            │
│ └─ Head Financeiro                          │
└─────────────────────────────────────────────┘
        ↓
┌─────────────────────────────────────────────┐
│ Nível 4: GERENTES                           │
│ ├─ Gerente                                  │
│ └─ Gerente de Projetos                      │
└─────────────────────────────────────────────┘
        ↓
┌─────────────────────────────────────────────┐
│ Nível 5: COORDENADORES / ANALISTAS SÊNIOR   │
│ ├─ Coordenador                              │
│ ├─ Coordenador Comercial                    │
│ ├─ Coordenador de Projetos                  │
│ └─ Analista de Marketing ⭐ GERENCIA ↓     │
└─────────────────────────────────────────────┘
        ↓
┌─────────────────────────────────────────────┐
│ Nível 6: OPERACIONAL / JÚNIOR               │
│ ├─ SDR, Closer                              │
│ ├─ Analista, Trainee                        │
│ ├─ Consultor, Consultor Comercial           │
│ └─ Desenvolvedor                            │
└─────────────────────────────────────────────┘
        ↓
┌─────────────────────────────────────────────┐
│ Nível 7: ESTAGIÁRIOS                        │
│ └─ Estagiário                               │
└─────────────────────────────────────────────┘
```

---

## 📋 ARQUIVO SQL CRIADO

**Arquivo:** `components/okr/sql/fix_cargo_hierarchy.sql`

**O que faz:**
1. ✅ Ajusta níveis de todos os cargos
2. ✅ Cria cargo "Consultor Comercial" (opcional)
3. ✅ Adiciona comentários e validações
4. ✅ Mostra hierarquia completa no final

---

## 🚀 COMO APLICAR

### **PASSO 1: Executar SQL**
```bash
# No Supabase Dashboard → SQL Editor
# Copiar e executar: fix_cargo_hierarchy.sql
```

### **PASSO 2: Validar Resultado**
```sql
SELECT level, name, description 
FROM cargos 
WHERE is_active = TRUE 
ORDER BY level, name;
```

**Resultado Esperado:**
```
level | name                    | description
------+-------------------------+---------------------------
1     | CEO                     | Chief Executive Officer
1     | COO                     | Chief Operating Officer
1     | Sócio                   | Sócio da empresa
2     | Diretor                 | Diretoria executiva
3     | Head Comercial          | Head do departamento...
3     | Head Marketing          | Head do departamento...
4     | Gerente                 | Gerente de área
4     | Gerente de Projetos     | Gerente de projetos
5     | Analista de Marketing   | Gerencia campanhas + equipe
5     | Coordenador             | Coordenador de equipe
5     | Coordenador Comercial   | Coordenador do time...
6     | Analista                | Analista operacional
6     | Closer                  | Closer de vendas
6     | Consultor               | Consultor de projetos
6     | SDR                     | Sales Development...
6     | Trainee                 | Trainee em desenvolvimento
7     | Estagiário              | Estagiário em treinamento
```

### **PASSO 3: Organograma Visual**
Após aplicar o SQL, o organograma vai renderizar corretamente:

**Marketing (ANTES):**
```
MARKETING
├─ [Nível 5] Barbara (Estagiário)    ❌
├─ [Nível 5] Carolina (Trainee)      ❌
└─ [Nível 5] Eduardo (Analista)      ❌
```

**Marketing (DEPOIS):**
```
MARKETING
└─ [Nível 5] Eduardo (Analista de Marketing) ✅
    ├─ [Nível 6] Carolina (Trainee)          ✅
    └─ [Nível 7] Barbara (Estagiário)        ✅
```

---

## 🤔 PRÓXIMAS DECISÕES (VOCÊ DECIDE)

### **DECISÃO 1: Consultores**

**Opção A:** Manter todos como "Consultor" (nível 6) em Projetos
- ✅ Simples
- ❌ Mistura vendedores com implementadores

**Opção B:** Separar por tipo
- Criar "Consultor Comercial" (vendedores) → dept. Comercial
- Manter "Consultor" (implementadores) → dept. Projetos
- ✅ Mais claro
- ⚠️ Precisa atualizar usuários manualmente

**Opção C:** Criar dept. "Inteligência de Mercado"
- Mover consultores de BI para novo departamento
- ✅ Estrutura mais clara
- ⚠️ Precisa criar departamento + atualizar usuários

---

### **DECISÃO 2: Time de Inovação**

Você mencionou "time de inteligência de mercado" dentro de Projetos.

**Sugestão:**
```sql
-- Criar departamento específico
INSERT INTO departments (name, description, color) VALUES
  ('Inovação', 'Desenvolvimento e inovação tecnológica', '#EC4899');

-- Mover desenvolvedores
UPDATE profiles 
SET department = 'inovação'
WHERE cargo = 'Desenvolvedor';
```

---

## 📊 RESUMO DAS MUDANÇAS

| Cargo | Nível ANTES | Nível DEPOIS | Impacto |
|-------|-------------|--------------|---------|
| Analista de Marketing | 5 | 5 | ✅ Mantido (posição sênior) |
| Trainee | 5 | 6 | ⬇️ Desceu (júnior) |
| Estagiário | 5 | 7 | ⬇️ Desceu (iniciante) |
| Gerente de Projetos | 4 | 4 | ✅ Mantido |
| Coordenador de Projetos | 4 | 5 | ⬇️ Desceu (reporta a Gerente) |
| Consultor | 5 | 6 | ⬇️ Desceu (operacional) |
| SDR, Closer, Analista | 5 | 6 | ⬇️ Desceu (operacional) |

---

## ❓ ME DIGA

1. **Executar o SQL agora?** ✅ / ⏸️
2. **Consultores:** Opção A, B ou C?
3. **Departamentos:** Criar "Inteligência de Mercado"? Sim / Não
4. **Algum cargo específico que precisa ajustar?**

Aguardando suas decisões! 🚀

