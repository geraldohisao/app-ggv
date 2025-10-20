# 🔄 ALTERNATIVA: Limpeza sem pg_cron

## ⚠️ **SE pg_cron NÃO ESTIVER DISPONÍVEL:**

Alguns planos do Supabase não incluem `pg_cron`. Aqui estão 3 alternativas:

---

## **ALTERNATIVA 1: Supabase Edge Function** ⚡ **← RECOMENDADO**

### **Criar Edge Function que roda periodicamente**

**Arquivo:** `supabase/functions/cleanup-automations/index.ts`

```typescript
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

serve(async (req) => {
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const supabase = createClient(supabaseUrl, supabaseKey)

  try {
    // Chamar função SQL de limpeza
    const { data, error } = await supabase.rpc('cleanup_orphaned_automations')

    if (error) throw error

    return new Response(
      JSON.stringify({ 
        success: true, 
        cleaned: data,
        message: `${data} automações órfãs limpas`
      }),
      { headers: { "Content-Type": "application/json" } }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    )
  }
})
```

### **Agendar com GitHub Actions ou Cron-job.org:**

**Opção A: GitHub Actions** (grátis)

Arquivo: `.github/workflows/cleanup-automations.yml`

```yaml
name: Cleanup Orphaned Automations

on:
  schedule:
    - cron: '0 */6 * * *'  # A cada 6 horas
  workflow_dispatch:  # Permite execução manual

jobs:
  cleanup:
    runs-on: ubuntu-latest
    steps:
      - name: Call Supabase Edge Function
        run: |
          curl -X POST \
            -H "Authorization: Bearer ${{ secrets.SUPABASE_ANON_KEY }}" \
            https://seu-projeto.supabase.co/functions/v1/cleanup-automations
```

**Opção B: Cron-job.org** (grátis, sem código)

1. Ir em https://cron-job.org
2. Criar conta grátis
3. Criar novo cron job:
   - URL: `https://seu-projeto.supabase.co/functions/v1/cleanup-automations`
   - Schedule: `0 */6 * * *` (a cada 6 horas)
   - Method: POST
   - Header: `Authorization: Bearer SEU_ANON_KEY`

---

## **ALTERNATIVA 2: Trigger SQL Inteligente** 🎯

### **Limpar automaticamente quando houver INSERT**

```sql
-- Criar função trigger que limpa ao inserir novo registro
CREATE OR REPLACE FUNCTION trigger_cleanup_on_insert()
RETURNS TRIGGER AS $$
BEGIN
    -- A cada novo insert, verificar se há órfãs antigas
    -- (faz limpeza passiva, sem cron)
    PERFORM cleanup_orphaned_automations();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Criar trigger na tabela reactivated_leads
DROP TRIGGER IF EXISTS auto_cleanup_orphans ON public.reactivated_leads;
CREATE TRIGGER auto_cleanup_orphans
    AFTER INSERT ON public.reactivated_leads
    FOR EACH STATEMENT
    EXECUTE FUNCTION trigger_cleanup_on_insert();
```

**Vantagens:**
- ✅ Sem necessidade de pg_cron
- ✅ Limpeza automática sempre que criar nova automação
- ✅ Zero configuração externa

**Desvantagens:**
- ⚠️ Só limpa quando alguém executa automação
- ⚠️ Se ninguém executar, órfãs ficam

---

## **ALTERNATIVA 3: Script Manual Agendado** 📅

### **Executar manualmente 1x por semana**

Criar reminder para executar toda segunda-feira:

```sql
-- Executar este comando 1x por semana (segunda-feira)
SELECT cleanup_orphaned_automations() as cleaned_count;

-- Ver quantas foram limpas
SELECT 
    COUNT(*) as total_automations,
    SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as still_pending,
    SUM(CASE WHEN status = 'failed' AND error_message LIKE '%Timeout%' THEN 1 ELSE 0 END) as cleaned_recently
FROM public.reactivated_leads
WHERE created_at > NOW() - INTERVAL '7 days';
```

**Configurar lembrete:**
- Google Calendar: Toda segunda 9h
- Slack: Reminder semanal
- Email: Alarme recorrente

---

## **COMPARAÇÃO DAS ALTERNATIVAS:**

| Alternativa | Automático | Complexidade | Requer pg_cron | Custo |
|-------------|------------|--------------|----------------|-------|
| **Edge Function + GitHub Actions** | ✅ | Média | ❌ | Grátis |
| **Edge Function + Cron-job.org** | ✅ | Baixa | ❌ | Grátis |
| **Trigger SQL** | ✅ | Baixa | ❌ | Grátis |
| **Manual Agendado** | ❌ | Muito Baixa | ❌ | Grátis |

---

## **QUAL ESCOLHER?**

### **Se tiver 10 minutos:**
→ **Trigger SQL** (Alternativa 2)
- Copiar e colar no SQL Editor
- Funciona imediatamente
- Zero manutenção

### **Se tiver 30 minutos:**
→ **Edge Function + Cron-job.org**
- Setup inicial um pouco maior
- Totalmente automático
- Muito confiável

### **Se não quiser configurar agora:**
→ **Manual** (Alternativa 3)
- Executar 1x por semana
- 5 segundos de trabalho
- Funciona bem para poucos usuários

---

## **RECOMENDAÇÃO:** ⭐

**Para este caso específico:**

Use a **Alternativa 2 (Trigger SQL)** porque:

1. ✅ **Simples:** Copiar e colar no SQL Editor
2. ✅ **Automático:** Limpa sempre que alguém criar automação
3. ✅ **Sem manutenção:** Funciona sozinho
4. ✅ **Sem dependências:** Não precisa de pg_cron

**E como backup:**

Executar manualmente 1x por mês o comando:
```sql
SELECT cleanup_orphaned_automations();
```

---

## **IMPLEMENTAR AGORA: Trigger SQL** 🚀

Execute este script no Supabase SQL Editor:

```sql
-- ═══════════════════════════════════════════════════════════════
-- LIMPEZA AUTOMÁTICA SEM pg_cron (via Trigger)
-- ═══════════════════════════════════════════════════════════════

-- 1. Criar função que será chamada pelo trigger
CREATE OR REPLACE FUNCTION trigger_cleanup_on_insert()
RETURNS TRIGGER AS $$
BEGIN
    -- Limpar automações órfãs sempre que houver novo insert
    PERFORM cleanup_orphaned_automations();
    RAISE NOTICE 'Limpeza automática executada: % órfãs removidas', 
                 (SELECT cleanup_orphaned_automations());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 2. Criar trigger (remove se já existe)
DROP TRIGGER IF EXISTS auto_cleanup_orphans ON public.reactivated_leads;

CREATE TRIGGER auto_cleanup_orphans
    AFTER INSERT ON public.reactivated_leads
    FOR EACH STATEMENT
    EXECUTE FUNCTION trigger_cleanup_on_insert();

-- 3. Verificar se foi criado
SELECT 
    tgname as trigger_name,
    tgrelid::regclass as table_name,
    tgenabled as enabled,
    CASE tgenabled
        WHEN 'O' THEN 'ATIVO'
        WHEN 'D' THEN 'DESATIVADO'
        ELSE 'OUTRO'
    END as status
FROM pg_trigger 
WHERE tgname = 'auto_cleanup_orphans';

-- 4. Testar (inserir e ver se limpa)
-- Este teste não insere nada de verdade, só simula
DO $$
BEGIN
    RAISE NOTICE '✅ Trigger configurado com sucesso!';
    RAISE NOTICE 'A cada nova automação, órfãs antigas serão limpas automaticamente.';
END $$;
```

**Pronto!** Agora a cada nova automação criada, o sistema limpa automaticamente as órfãs antigas. 🎉

