# 🎯 SOLUÇÃO: Camila não vê visão Closer no OTE

## **📋 PROBLEMA IDENTIFICADO:**

A usuária **Camila Ataliba** (`camila.ataliba@grupoggv.com`) não conseguia visualizar a visão de **Closer** no cálculo de OTE, mesmo tendo esse perfil.

---

## **🔍 CAUSA RAIZ:**

### **1. Bug no Código:**
O componente `CalculadoraOTE.tsx` estava usando uma variável global que **nunca era definida**:

```typescript
// ❌ CÓDIGO ANTIGO (ERRADO)
return (window as any).__USER_FUNCTION__ || OTEProfile.SDR;
```

Como `__USER_FUNCTION__` nunca existia, o sistema sempre fazia fallback para **SDR**, ignorando a função real do usuário.

### **2. Possível Problema no Banco:**
O campo `user_function` da Camila pode não estar definido como `'Closer'` na tabela `profiles`.

---

## **✅ SOLUÇÃO IMPLEMENTADA:**

### **1. Correção do Código TypeScript** ✅

**Arquivo:** `components/CalculadoraOTE.tsx`

```typescript
// ✅ CÓDIGO NOVO (CORRETO)
const allowedProfile: OTEProfile | 'ALL' = useMemo(() => {
    if (!user) return OTEProfile.SDR;
    
    // Super Admin e Admin têm acesso a todos os perfis
    if (user.role === UserRole.SuperAdmin || user.role === UserRole.Admin) return 'ALL';
    
    if (user.email === 'geraldo@grupoggv.com') return 'ALL';
    
    // ✅ Usar a função comercial carregada do banco pelo contexto
    if (user.user_function) {
        return user.user_function as OTEProfile;
    }
    
    // fallback: SDR
    return OTEProfile.SDR;
}, [user]);
```

**Mudança:** Agora o sistema usa `user.user_function` que é carregado corretamente do banco de dados pelo contexto!

---

### **2. Script SQL para Corrigir o Banco** ✅

**Arquivo criado:** `FIX_CAMILA_CLOSER_PROFILE.sql`

Este script:
- ✅ Verifica a situação atual da Camila
- ✅ Atualiza `user_function = 'Closer'` no banco
- ✅ Cria o profile se não existir
- ✅ Faz verificação final

---

## **📝 COMO APLICAR A CORREÇÃO:**

### **Passo 1: Deploy do Código** 🚀

As alterações no código **já estão aplicadas** no arquivo:
- ✅ `components/CalculadoraOTE.tsx`

**Ações necessárias:**
1. Fazer commit das alterações
2. Fazer deploy da aplicação

```bash
# Se usar Git
git add components/CalculadoraOTE.tsx
git commit -m "fix: Corrigir carregamento da função de usuário no OTE"
git push

# Deploy (depende da sua infraestrutura)
# Vercel, Netlify, etc.
```

---

### **Passo 2: Executar Script SQL** 🗄️

1. **Acesse o SQL Editor do Supabase**
   - Entre no dashboard do Supabase
   - Vá em "SQL Editor"

2. **Execute o script:** `FIX_CAMILA_CLOSER_PROFILE.sql`
   - Cole todo o conteúdo do arquivo
   - Clique em "Run" ou pressione `Ctrl+Enter`

3. **Verifique os resultados:**
   - O script mostra várias seções de verificação
   - Procure por "✅ CORRETO" na seção "VERIFICAÇÃO FINAL"

**Saída esperada:**
```
email                          | role | user_function | status
-------------------------------|------|---------------|----------------
camila.ataliba@grupoggv.com   | USER | Closer        | ✅ CORRETO
```

---

### **Passo 3: Camila Refazer Login** 🔄

**IMPORTANTE:** Após executar o script SQL, a Camila deve:

1. **Fazer LOGOUT** da plataforma
2. **Fazer LOGIN** novamente
3. **Acessar** o OTE (Calcule seu On-Target Earnings)
4. **Verificar** se agora consegue ver a opção "Closer"

---

## **🎯 REGRAS DE ACESSO AO OTE:**

| Perfil/Função     | Visão Disponível    |
|-------------------|---------------------|
| **SUPER_ADMIN**   | Todas (SDR, Closer, Coordenador) |
| **ADMIN**         | Todas (SDR, Closer, Coordenador) |
| **Closer**        | Apenas Closer       |
| **Coordenador**   | Apenas Coordenador  |
| **SDR** / Sem função | Apenas SDR       |

---

## **✅ CHECKLIST DE VERIFICAÇÃO:**

- [ ] Código alterado em `CalculadoraOTE.tsx`
- [ ] Deploy realizado
- [ ] Script SQL executado no Supabase
- [ ] `user_function = 'Closer'` confirmado no banco
- [ ] Camila fez logout
- [ ] Camila fez login novamente
- [ ] Camila consegue ver visão de Closer no OTE

---

## **🐛 SE O PROBLEMA PERSISTIR:**

### **Debug no Console do Navegador:**

Peça para a Camila:

1. Abrir o OTE
2. Pressionar `F12` para abrir DevTools
3. Ir na aba "Console"
4. Procurar por logs que começam com:
   - `✅ DIRECT CONTEXT - Role e função carregados do banco:`

**Deve mostrar algo como:**
```javascript
{ role: "USER", function: "Closer" }
```

Se mostrar `function: undefined` ou `function: "SDR"`, o problema está no banco.

---

### **Verificação Manual no Banco:**

Execute no SQL Editor:

```sql
SELECT 
    u.email,
    p.role,
    p.user_function,
    p.name
FROM auth.users u
LEFT JOIN public.profiles p ON p.id = u.id
WHERE u.email = 'camila.ataliba@grupoggv.com';
```

**Resultado esperado:**
```
email                       | role | user_function | name
----------------------------|------|---------------|----------------
camila.ataliba@grupoggv.com | USER | Closer        | Camila Ataliba
```

---

## **📞 SUPORTE:**

Se após todos esses passos o problema persistir:

1. Capture print da verificação SQL
2. Capture print do console do navegador
3. Capture print da tela do OTE mostrando o problema
4. Entre em contato com detalhes completos

---

## **🎉 SOLUÇÃO CONCLUÍDA!**

Essa correção resolve definitivamente o problema de:
- ✅ Usuários Closer não conseguirem ver sua visão no OTE
- ✅ Sistema sempre fazendo fallback para SDR
- ✅ Função comercial não sendo respeitada

**Arquivos modificados:**
- `components/CalculadoraOTE.tsx` (correção do bug)
- `FIX_CAMILA_CLOSER_PROFILE.sql` (correção do banco)
- `GUIA_CORRECAO_CAMILA_OTE.md` (este guia)


