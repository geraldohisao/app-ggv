# 🔧 CORREÇÃO: Erro 404 na tabela call_comments

## **❌ Problema Identificado:**
O erro `404 (Not Found)` está acontecendo porque a tabela `call_comments` não existe no Supabase.

## **✅ Solução:**

### **1. Aplicar Script SQL no Supabase:**

1. **Acesse o Supabase Dashboard**
2. **Vá para SQL Editor**
3. **Cole e execute este script:**

```sql
-- Script para criar a tabela call_comments
CREATE TABLE IF NOT EXISTS public.call_comments (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    call_id UUID NOT NULL REFERENCES public.calls(id) ON DELETE CASCADE,
    text TEXT NOT NULL,
    at_seconds INTEGER DEFAULT 0,
    author_id UUID REFERENCES auth.users(id),
    author_name TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Criar índices
CREATE INDEX IF NOT EXISTS idx_call_comments_call_id ON public.call_comments(call_id);
CREATE INDEX IF NOT EXISTS idx_call_comments_created_at ON public.call_comments(created_at DESC);

-- Habilitar RLS
ALTER TABLE public.call_comments ENABLE ROW LEVEL SECURITY;

-- Criar políticas
CREATE POLICY "Users can view call comments" ON public.call_comments 
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Users can insert call comments" ON public.call_comments 
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Users can update own call comments" ON public.call_comments 
    FOR UPDATE USING (auth.uid() = author_id);

-- Conceder permissões
GRANT SELECT, INSERT, UPDATE ON public.call_comments TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.call_comments TO service_role;
```

### **2. Verificar se funcionou:**

Execute este comando para verificar:

```sql
SELECT COUNT(*) as total_comments FROM public.call_comments;
```

## **🛡️ Proteção Implementada:**

- **Tratamento de erro:** As funções agora retornam arrays vazios em vez de quebrar
- **Fallback:** Comentários são salvos localmente se a tabela não existir
- **Logs:** Avisos no console quando há problemas

## **🎯 Resultado Esperado:**

Após aplicar o script:
- ✅ Erro 404 desaparece
- ✅ Comentários funcionam normalmente
- ✅ Sistema continua funcionando mesmo se houver problemas

## **📁 Arquivos Modificados:**

- `services/callsService.ts` - Tratamento de erro nas funções de comentários
- `test-call-comments-table.sql` - Script de teste completo
- `supabase/sql/30_fix_call_comments_table.sql` - Script oficial

**Execute o script SQL e teste novamente!** 🚀
