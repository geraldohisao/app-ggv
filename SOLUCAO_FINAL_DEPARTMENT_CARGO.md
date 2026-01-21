# ✅ **SOLUÇÃO FINAL: DEPARTMENT + CARGO (Simplificada)**

---

## **🎯 ABORDAGEM ADOTADA**

**Sua sugestão foi PERFEITA!** Ao invés de ter um campo separado `user_function`, agora usamos:

```
DEPARTMENT + CARGO = Determina automaticamente se tem OTE
```

---

## **📊 LÓGICA SIMPLIFICADA**

### **✅ DEPARTAMENTO COMERCIAL:**

| Cargo | Tem OTE? | Perfil OTE |
|-------|----------|------------|
| **SDR** | ✅ Sim | SDR |
| **Closer** | ✅ Sim | Closer |
| **Coordenador** | ✅ Sim | Coordenador |
| Head Comercial | ❌ Não | - |

### **✅ DEPARTAMENTO MARKETING:**

| Cargo | Tem OTE? | Perfil OTE |
|-------|----------|------------|
| **Analista de Marketing** | ✅ Sim | Analista de Marketing |
| Head Marketing | ❌ Não | - |

### **❌ OUTROS DEPARTAMENTOS:**

| Cargo | Tem OTE? |
|-------|----------|
| Todos (Desenvolvedor, Gerente de Projetos, COO, etc) | ❌ Não |

---

## **🎯 RESULTADO PARA OS 6 USUÁRIOS:**

| Nome | Cargo | Departamento | Tem OTE? | Vê OTEs? | Role |
|------|-------|--------------|----------|----------|------|
| **César Intrieri** | Gerente de Projetos | projetos | ❌ Não | ✅ Todos | ADMIN |
| **Samuel Bueno** | Coordenador | **comercial** | ✅ **Sim** | ✅ Todos | ADMIN |
| **Tarcis Danilo** | COO | geral | ❌ Não | ✅ Todos | ADMIN |
| **Dev Team** | Desenvolvedor | inovação | ❌ Não | ❌ Nada | USER |
| **Eduardo Espindola** | Head Marketing | marketing | ❌ Não | ❌ Nada | USER |
| **Giancarlo Blanco** | Closer | **comercial** | ✅ **Sim** | ✅ Só Closer | USER |

---

## **✅ BENEFÍCIOS DA NOVA ABORDAGEM**

### **Antes (user_function):**
- ❌ Duplicação de dados (cargo E user_function)
- ❌ Possibilidade de inconsistência (cargo="SDR" mas function="Closer")
- ❌ Manutenção manual de 2 campos
- ❌ Confusão sobre qual campo usar

### **Agora (department + cargo):**
- ✅ **Um só conceito:** department + cargo
- ✅ **Impossível ter inconsistência**
- ✅ **Lógica clara:** comercial/marketing + cargo específico = OTE
- ✅ **Fácil de expandir:** novo cargo com OTE? Só adicionar à lógica
- ✅ **Organização natural:** por departamento

---

## **🔧 ARQUIVOS CRIADOS/MODIFICADOS**

### **1. SQL (EXECUTAR ESTE):**
✅ **`components/okr/sql/fix_user_data_department_cargo.sql`** ⭐

**O que faz:**
- Adiciona cargos faltantes
- Define `department` + `cargo` para os 6 usuários
- Limpa `user_function` (não precisa mais)
- Gera 3 relatórios de verificação

### **2. TypeScript (já ajustados):**
✅ **`types.ts`**
- Interface `User` agora tem `department` e `cargo`
- `user_function` marcado como `[DEPRECATED]`

✅ **`components/CalculadoraOTE.tsx`**
- Nova lógica: verifica `department` + `cargo`
- Departamento comercial → verifica cargo (SDR, Closer, Coordenador)
- Departamento marketing → verifica cargo (Analista de Marketing)

✅ **`contexts/DirectUserContext.tsx`**
- Todas as queries carregam `department` e `cargo`
- Logs mostram department + cargo

---

## **🚀 IMPLEMENTAÇÃO (3 PASSOS)**

### **1️⃣ Execute o Script SQL** *(2 min)*

```bash
# No Supabase SQL Editor
components/okr/sql/fix_user_data_department_cargo.sql
```

**Relatórios gerados:**
1. Lista completa de usuários com status OTE
2. Estatísticas por departamento
3. Lista de usuários comerciais (que têm OTE)

---

### **2️⃣ Deploy do Código** *(1 min)*

Arquivos modificados:
- `types.ts`
- `components/CalculadoraOTE.tsx`
- `contexts/DirectUserContext.tsx`

**Ação:** Commit + push + deploy normal

---

### **3️⃣ Teste** *(5 min)*

**A) Teste no banco:**
```sql
SELECT 
  name,
  department,
  cargo,
  CASE 
    WHEN department = 'comercial' AND cargo IN ('SDR', 'Closer', 'Coordenador') THEN '✅ TEM OTE'
    WHEN department = 'marketing' AND cargo = 'Analista de Marketing' THEN '✅ TEM OTE'
    ELSE '❌ SEM OTE'
  END as ote_status
FROM profiles
WHERE is_active = TRUE;
```

**B) Teste na aplicação:**
1. Logout e login novamente
2. Console deve mostrar: `department` e `cargo` carregados
3. Acessar Calculadora OTE:
   - **Como Samuel (Coordenador, comercial, ADMIN):** Deve ver todos + seu OTE
   - **Como Giancarlo (Closer, comercial, USER):** Deve ver apenas OTE de Closer
   - **Como Dev Team (Desenvolvedor, inovação, USER):** Não deve ter acesso ao OTE

---

## **💡 EXEMPLOS DE USO FUTURO**

### **Adicionar novo cargo com OTE:**

1. **No banco:**
```sql
-- Adicionar cargo à tabela
INSERT INTO cargos (name, description, level) 
VALUES ('Gerente Comercial', 'Gerente de vendas', 4);

-- Atribuir ao usuário
UPDATE profiles 
SET cargo = 'Gerente Comercial', department = 'comercial'
WHERE email = 'usuario@grupoggv.com';
```

2. **No código (CalculadoraOTE.tsx):**
```typescript
if (department === 'comercial') {
    if (cargo === 'SDR') return OTEProfile.SDR;
    if (cargo === 'Closer') return OTEProfile.Closer;
    if (cargo === 'Coordenador') return OTEProfile.Coordenador;
    if (cargo === 'Gerente Comercial') return OTEProfile.Coordenador; // Usa OTE de Coordenador
}
```

**Pronto!** Não precisa mexer em `user_function` nem nada. Só department + cargo!

---

## **📋 ESTRUTURA DE DADOS FINAL**

### **Tabela `profiles`:**

| Campo | Tipo | Uso | Obrigatório? |
|-------|------|-----|--------------|
| `id` | UUID | Identificador único | ✅ Sim |
| `email` | TEXT | Email do usuário | ✅ Sim |
| `name` | TEXT | Nome completo | ✅ Sim |
| `role` | TEXT | SUPER_ADMIN, ADMIN, USER | ✅ Sim |
| `department` | TEXT | comercial, marketing, projetos, geral, inovação | ✅ Sim |
| `cargo` | TEXT | SDR, Closer, Coordenador, etc | ✅ Sim |
| `user_function` | TEXT | [DEPRECATED] Manter por compatibilidade | ❌ Não |

---

## **🎉 COMPARAÇÃO ANTES/DEPOIS**

### **ANTES (Complexo):**
```typescript
// ❌ Tinha que manter 2 campos sincronizados
user.cargo = "SDR"
user.user_function = "SDR"  // Duplicação!

// ❌ Possível inconsistência
user.cargo = "SDR"
user.user_function = "Closer"  // WTF?!
```

### **AGORA (Simples):**
```typescript
// ✅ Apenas 2 campos naturais
user.department = "comercial"
user.cargo = "SDR"

// ✅ Sistema deduz automaticamente
// comercial + SDR = OTE de SDR ✅
```

---

## **✅ VALIDAÇÃO FINAL**

Após executar o script, confirme:

```sql
-- Todos os usuários comerciais devem ter department = 'comercial'
SELECT * FROM profiles 
WHERE cargo IN ('SDR', 'Closer', 'Coordenador')
  AND department != 'comercial';
-- Deve retornar 0 linhas ✅

-- Analistas de Marketing devem ter department = 'marketing'
SELECT * FROM profiles 
WHERE cargo = 'Analista de Marketing'
  AND department != 'marketing';
-- Deve retornar 0 linhas ✅

-- Usuários que não são comerciais/marketing não devem ter OTE
SELECT name, cargo, department 
FROM profiles 
WHERE department NOT IN ('comercial', 'marketing')
  AND is_active = TRUE;
-- Todos devem ser cargos sem OTE (Desenvolvedor, Head, etc) ✅
```

---

## **📞 FAQ**

### **1. Posso ter um SDR no departamento de Marketing?**
Não faz sentido organizacionalmente, mas se quiser:
- SDR no Marketing = não teria OTE (lógica é comercial + SDR)
- Recomendado: SDR sempre em "comercial"

### **2. E se criar um novo departamento "Vendas"?**
Só adicionar na lógica do código:
```typescript
if (department === 'comercial' || department === 'vendas') {
    // Lógica de OTE
}
```

### **3. user_function vai ser removido?**
Sim, eventualmente. Por ora está marcado como `[DEPRECATED]` para compatibilidade.

### **4. Precisa alterar todos os usuários?**
Apenas os 6 identificados. O script já faz isso automaticamente.

---

**Data:** 07/01/2026  
**Versão:** 3.0 FINAL  
**Status:** ✅ **PRONTO PARA EXECUTAR!**

**Execute agora:** `fix_user_data_department_cargo.sql` 🚀

