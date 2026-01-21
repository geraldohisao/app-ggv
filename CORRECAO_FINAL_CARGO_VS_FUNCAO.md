# ✅ **CORREÇÃO FINAL: CARGO vs FUNÇÃO COMERCIAL**

---

## **🎯 PROBLEMA IDENTIFICADO**

Os campos `cargo` e `user_function` estavam **TROCADOS**:

| Usuário | user_function (estava) | ❌ Problema | cargo (estava) |
|---------|----------------------|-------------|---------------|
| César Intrieri | "Gerente de Projetos" | Isso é CARGO! | NULL |
| Samuel Bueno | "Coordenador" | Isso é CARGO! | NULL |
| Tarcis Danilo | "COO" | Isso é CARGO! | NULL |
| Dev Team | "Desenvolvedor" | Isso é CARGO! | NULL |
| Eduardo Espindola | "Head Marketing" | Isso é CARGO! | NULL |
| Giancarlo Blanco | "Closer" | OK (é ambos) | NULL |

---

## **📋 CONCEITOS CORRIGIDOS**

### **`cargo` (Posição Hierárquica)**
- **Usado em:** Organograma, OKRs, hierarquia organizacional
- **Valores:** Qualquer cargo da tabela `cargos`
- **Exemplos:** CEO, COO, Gerente de Projetos, Coordenador, SDR, Closer, Desenvolvedor, Head Marketing

### **`user_function` (Função Comercial)**
- **Usado em:** Calculadora de OTE
- **Valores válidos:** `SDR`, `Closer`, `Gestor`, `Analista de Marketing`, ou `NULL`
- **Regra:** Apenas quem tem OTE calculado precisa ter valor aqui

### **Quem TEM OTE:**
- ✅ SDR
- ✅ Closer
- ✅ Coordenador (usa função "Gestor" no OTE)
- ✅ Analista de Marketing
- ❌ CEO, COO, Diretor, Gerente de Projetos, Desenvolvedor, Head Marketing

---

## **✅ ARQUIVOS MODIFICADOS**

### **1. SQL - Correção de Dados:**
**`components/okr/sql/fix_user_function_vs_cargo.sql`**
- Adiciona cargos faltantes (COO, Gerente de Projetos, Desenvolvedor, Head Marketing)
- Migra dados dos 6 usuários identificados
- Limpa valores inválidos de `user_function`

**Resultado esperado:**
| Usuário | cargo (correto) | user_function (correto) | Tem OTE? |
|---------|----------------|------------------------|----------|
| César Intrieri | Gerente de Projetos | NULL | ❌ Não |
| Samuel Bueno | Coordenador | Gestor | ✅ Sim |
| Tarcis Danilo | COO | NULL | ❌ Não |
| Dev Team | Desenvolvedor | NULL | ❌ Não |
| Eduardo Espindola | Head Marketing | NULL | ❌ Não |
| Giancarlo Blanco | Closer | Closer | ✅ Sim |

---

### **2. TypeScript - Ajuste de Lógica:**

#### **A. `types.ts`**
```typescript
export interface User {
  id: string;
  email: string;
  name: string;
  initials: string;
  role: UserRole;
  user_function?: 'SDR' | 'Closer' | 'Gestor' | 'Analista de Marketing';
  cargo?: string; // ✅ NOVO CAMPO
}
```

#### **B. `components/CalculadoraOTE.tsx`**
**Antes:** Usava apenas `user_function` para determinar qual OTE mostrar

**Agora:** Usa `cargo` PRIMEIRO, `user_function` como fallback
```typescript
// Mapeamento de cargo → perfil OTE
const cargoToOTEProfile: Record<string, OTEProfile> = {
    'SDR': OTEProfile.SDR,
    'Closer': OTEProfile.Closer,
    'Coordenador': OTEProfile.Coordenador,
    'Analista de Marketing': OTEProfile.AnalistaMarketing,
};

// Tentar mapear pelo cargo primeiro
if (user.cargo && cargoToOTEProfile[user.cargo]) {
    return cargoToOTEProfile[user.cargo];
}

// Fallback: usar user_function se cargo não estiver mapeado
if (user.user_function) {
    return user.user_function as OTEProfile;
}
```

#### **C. `contexts/DirectUserContext.tsx`**
**Modificado:** Todas as queries do Supabase agora buscam `cargo` junto com `role` e `user_function`

```typescript
// Antes
.select('role, user_function')

// Agora
.select('role, user_function, cargo')
```

---

## **🔄 LÓGICA DE PERMISSÕES DE OTE**

### **SUPER_ADMIN e ADMIN:**
- ✅ Veem TODOS os perfis de OTE
- ✅ Podem simular qualquer perfil (SDR, Closer, Coordenador, Analista de Marketing)
- ℹ️ Podem ou não ter OTE próprio (depende do cargo)

**Exemplos:**
- **César** (Gerente de Projetos, ADMIN) → Vê todos OTEs, mas não tem OTE próprio
- **Tarcis** (COO, ADMIN) → Vê todos OTEs, mas não tem OTE próprio
- **Samuel** (Coordenador, ADMIN) → Vê todos OTEs E tem OTE próprio

### **USER:**
- ✅ Vê apenas o OTE do **SEU cargo**
- ❌ Não pode simular outros perfis

**Exemplos:**
- **SDR** → Vê apenas calculadora de SDR
- **Closer** → Vê apenas calculadora de Closer
- **Desenvolvedor** → Não vê calculadora (não tem OTE)

---

## **🚀 COMO IMPLEMENTAR**

### **PASSO 1: Executar Script SQL** ⏱️ ~2min

1. Abra **Supabase SQL Editor**
2. Cole o conteúdo de: **`components/okr/sql/fix_user_function_vs_cargo.sql`**
3. Clique em **Run**
4. Revise os 3 relatórios gerados

### **PASSO 2: Deploy do Código TypeScript** ⏱️ ~1min

As alterações já foram feitas nos arquivos:
- ✅ `types.ts`
- ✅ `components/CalculadoraOTE.tsx`
- ✅ `contexts/DirectUserContext.tsx`

**Ação:** Fazer commit e deploy normalmente

### **PASSO 3: Testar** ⏱️ ~5min

**Teste 1: Verificar dados corrigidos**
```sql
SELECT name, email, cargo, user_function, role
FROM profiles
WHERE is_active = TRUE
ORDER BY role, name;
```

**Teste 2: Fazer logout e login novamente**
- Para carregar o novo campo `cargo` no contexto

**Teste 3: Acessar Calculadora OTE**
- **Como ADMIN/SUPER_ADMIN:** Deve ver todos os perfis
- **Como USER (SDR, Closer, Coordenador, Analista Marketing):** Deve ver apenas seu perfil
- **Como USER (outros cargos):** Não deve ter acesso à calculadora ou ver fallback

---

## **📊 VALIDAÇÃO**

### **✅ Checklist de Sucesso:**

**No Banco de Dados:**
- [ ] Todos os 6 usuários têm `cargo` definido
- [ ] `user_function` contém APENAS: `SDR`, `Closer`, `Gestor`, `Analista de Marketing`, ou `NULL`
- [ ] Cargos COO, Gerente de Projetos, Desenvolvedor, Head Marketing existem na tabela `cargos`

**No Sistema:**
- [ ] Após login, console mostra: `cargo` carregado do banco
- [ ] Calculadora OTE mostra perfil correto baseado no cargo
- [ ] ADMIN/SUPER_ADMIN veem todos os perfis
- [ ] USER vê apenas seu perfil

---

## **🎉 RESULTADO FINAL**

### **Antes da Correção:**
- ❌ Cargos salvos no campo errado (`user_function`)
- ❌ Campo `cargo` sempre NULL
- ❌ Confusão entre posição hierárquica e função comercial
- ❌ OTE determinado por campo errado

### **Depois da Correção:**
- ✅ Cada campo tem seu propósito claro
- ✅ `cargo` → hierarquia organizacional
- ✅ `user_function` → cálculo de OTE
- ✅ Sistema usa o campo correto para cada finalidade
- ✅ Permissões de OTE baseadas em cargo E role
- ✅ 100% consistente e escalável

---

## **📞 SUPORTE**

Se tiver problemas:

**Problema: Script SQL dá erro**
- Verifique se executou `fix_complete_cargos_system.sql` antes
- Verifique permissões no Supabase

**Problema: Campo `cargo` não aparece após login**
- Faça logout e login novamente
- Verifique console do navegador (deve mostrar logs de carregamento)
- Limpe localStorage se necessário

**Problema: OTE não mostra perfil correto**
- Verifique se `cargo` está definido no banco
- Verifique se `cargo` está no mapeamento (`cargoToOTEProfile`)
- Veja console para debug

---

**Data:** 07/01/2026  
**Versão:** 2.0  
**Status:** ✅ **PRONTO PARA EXECUÇÃO**

---

## **🎯 EXECUTE AGORA:**

1. ✅ Execute `fix_user_function_vs_cargo.sql` no Supabase
2. ✅ Faça commit e deploy do código TypeScript
3. ✅ Teste com logout/login
4. ✅ Valide que tudo está funcionando

**Tempo total estimado:** 10 minutos

