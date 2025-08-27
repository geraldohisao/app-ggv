# 🔧 FIX: Dropdown de Usuários Vazio

## **🎯 PROBLEMA IDENTIFICADO:**

O dropdown "Todos os Usuários" está mostrando **(0)** porque:

1. **Erro 500** na query da tabela `profiles`
2. **Stack depth limit exceeded** na consulta SQL
3. **Usuários sem perfil** (como Andressa) fizeram ligações mas não têm `profiles`
4. **Tipos incompatíveis** entre `calls.agent_id` (TEXT) e `profiles.id` (UUID)

## **📊 LOGS DO CONSOLE:**
```
❌ GET https://mwlekwyxbfbxfxskywgx.supabase.co/rest/v1/profiles?select=id&limit=1 500 (Internal Server Error)
❌ fetchRealUsers - Erro ao acessar tabela profiles: {code: '54001', message: 'stack depth limit exceeded'}
❌ fetchRealUsers - Tentando buscar usuários da tabela calls...
❌ GET https://mwlekwyxbfbxfxskywgx.supabase.co/rest/v1/calls?select=sdr_id%2Csdr_name%2Cagent_id&sdr_id=not.is.null&limit=100 400 (Bad Request)
❌ CallsPage - Usuários reais carregados: []
❌ CallsPage - Quantidade de usuários: 0
```

## **🚀 SOLUÇÕES IMPLEMENTADAS:**

### **1. Tabela de Mapeamento:**
- ✅ **`user_mapping`** mapeia todos os usuários das ligações
- ✅ **Inclui usuários sem perfil** (como Andressa)
- ✅ **Sincronização automática** de dados

### **2. Função Atualizada:**
- ✅ **Busca da `user_mapping`** em vez de joins complexos
- ✅ **Inclui todos os usuários** que fizeram ligações
- ✅ **Nomes corretos** mesmo sem perfil

## **🔧 PASSOS PARA RESOLVER:**

### **Opção 1: Criar Tabela de Mapeamento (Recomendado)**

1. **Acesse o Supabase Dashboard**
2. **Vá para SQL Editor**
3. **Execute o script:** `fix-agent-id-structure.sql`
4. **Execute o script:** `sync-users-from-calls.sql`
5. **Verifique os resultados** das queries

### **Opção 2: Usar Fallback Automático**

O sistema agora **automaticamente** busca da `user_mapping` se configurada.

### **Opção 3: Criar Tabela Profiles (Se não existir)**

Se a tabela `profiles` não existir, execute no SQL Editor:

```sql
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    full_name TEXT,
    email TEXT UNIQUE,
    avatar_url TEXT,
    role TEXT DEFAULT 'user',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Habilitar RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Política básica para permitir leitura
CREATE POLICY "Allow public read access" ON public.profiles
    FOR SELECT USING (true);
```

## **📋 VERIFICAÇÃO:**

### **1. Teste o Sistema:**
- Recarregue a página de chamadas
- Verifique os logs no console
- O dropdown deve mostrar usuários

### **2. Logs Esperados:**
```
✅ fetchRealUsers - Usuários que fizeram chamadas...
✅ fetchRealUsers - Usuários mapeados: X
✅ fetchRealUsers - Quantidade de usuários únicos: X
```

### **3. Logs de Fallback:**
```
❌ fetchRealUsers - Erro ao buscar usuários reais...
🔄 fetchRealUsers - Tentando fallback simples...
✅ fetchUsersFromCallsSimple - Usuários encontrados: X
```

## **🎯 RESULTADO ESPERADO:**

- ✅ **Dropdown funcional** com usuários
- ✅ **Filtro de usuário** funcionando
- ✅ **Chips de filtro** mostrando nomes corretos

## **📞 SUPORTE:**

Se o problema persistir:
1. Execute o script `fix-profiles-table.sql`
2. Verifique os resultados
3. Me informe os logs do console

**O sistema agora tem fallback automático e deve funcionar mesmo se a tabela `profiles` tiver problemas!** 🚀
