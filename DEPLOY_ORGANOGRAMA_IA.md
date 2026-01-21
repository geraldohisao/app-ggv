# 🚀 GUIA DE DEPLOY: ORGANOGRAMA INTELIGENTE COM IA

**Status:** Pronto para implementação  
**Última atualização:** 08/01/2026  
**Tempo estimado:** 30-45 minutos

---

## 📋 PRÉ-REQUISITOS

- [x] Acesso ao Supabase (SQL Editor + Edge Functions)
- [x] Google Gemini API Key configurada
- [x] Git branch atualizada
- [x] Backup do banco de dados (recomendado)

---

## 🗂️ ARQUIVOS CRIADOS

```
✅ ANALISE_ORGANOGRAMA_IA.md                       # Documentação completa
✅ components/okr/sql/create_ai_org_structure.sql  # Tabelas + RPCs principais
✅ components/okr/sql/create_ai_org_triggers.sql   # Triggers + Fila de análise
✅ supabase/functions/analyze-org-structure/index.ts  # Edge Function
✅ components/settings/OrgAISuggestionsPanel.tsx   # UI React
```

---

## 🔧 PASSO A PASSO DE DEPLOY

### **FASE 1: DATABASE (Supabase SQL Editor)** ⏱️ ~5 min

#### **1.1. Criar Tabelas e RPCs Principais**

1. Abrir **Supabase Dashboard** → **SQL Editor**
2. Copiar conteúdo de `components/okr/sql/create_ai_org_structure.sql`
3. Clicar em **Run**
4. Verificar mensagem de sucesso:
   ```
   ✅ Tabelas e RPCs do Organograma Inteligente criados com sucesso!
   ```

**Tabelas criadas:**
- `org_suggestions` - Sugestões da IA
- `reporting_lines` - Linhas de reporte
- `org_change_log` - Auditoria de mudanças

**RPCs criadas:**
- `validate_org_structure()` - Valida estrutura
- `suggest_reporting_lines()` - Sugere linhas de reporte
- `batch_update_hierarchy()` - Aplica mudanças em lote

#### **1.2. Criar Sistema de Triggers**

1. Ainda no **SQL Editor**
2. Copiar conteúdo de `components/okr/sql/create_ai_org_triggers.sql`
3. Clicar em **Run**
4. Verificar mensagem:
   ```
   ✅ Sistema de Análise em Tempo Real configurado com sucesso!
   🔔 Triggers ativos em: profiles, reporting_lines
   ```

**Tabelas criadas:**
- `org_analysis_queue` - Fila de análises

**RPCs criadas:**
- `queue_org_analysis()` - Enfileira análise
- `process_analysis_queue()` - Processa fila
- `mark_analysis_completed()` - Marca como concluída
- `cleanup_old_analysis_queue()` - Limpeza automática

**Triggers criados:**
- `trg_org_analysis_profile_update` - Dispara quando profile muda
- `trg_org_analysis_reporting_change` - Dispara quando linha de reporte muda

#### **1.3. Verificar se tudo funcionou**

Execute no SQL Editor:
```sql
-- Verificar tabelas criadas
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name LIKE 'org_%';

-- Verificar RPCs criadas
SELECT routine_name 
FROM information_schema.routines 
WHERE routine_schema = 'public' 
  AND routine_name LIKE '%org%';

-- Ver estatísticas da fila
SELECT * FROM v_analysis_queue_stats;
```

**Resultado esperado:**
- 4 tabelas (`org_suggestions`, `org_change_log`, `reporting_lines`, `org_analysis_queue`)
- 7+ RPCs
- Stats da fila vazias (inicial)

---

### **FASE 2: EDGE FUNCTION (Supabase Functions)** ⏱️ ~10 min

#### **2.1. Via Supabase CLI (Recomendado)**

1. **Instalar Supabase CLI** (se ainda não tiver):
   ```bash
   npm install -g supabase
   ```

2. **Login no Supabase:**
   ```bash
   supabase login
   ```

3. **Link com seu projeto:**
   ```bash
   supabase link --project-ref SEU_PROJECT_ID
   ```

4. **Deploy da Edge Function:**
   ```bash
   supabase functions deploy analyze-org-structure
   ```

5. **Verificar:**
   ```bash
   supabase functions list
   ```

#### **2.2. Via Dashboard (Alternativa)**

1. Abrir **Supabase Dashboard** → **Edge Functions**
2. Clicar em **Create Function**
3. Nome: `analyze-org-structure`
4. Copiar código de `supabase/functions/analyze-org-structure/index.ts`
5. Clicar em **Deploy**

#### **2.3. Configurar Secrets (IMPORTANTE!)**

A Edge Function precisa da `GEMINI_API_KEY`:

```bash
# Via CLI
supabase secrets set GEMINI_API_KEY=SUA_API_KEY_AQUI

# Ou via Dashboard → Settings → Edge Functions → Secrets
```

**⚠️ ATENÇÃO:** Sem a API Key, a função vai falhar!

#### **2.4. Testar a Edge Function**

```bash
# Via Supabase Dashboard → Functions → analyze-org-structure → Invoke

# Payload de teste:
{
  "analysisType": "quick"
}
```

**Resultado esperado:**
```json
{
  "success": true,
  "analysis": {...},
  "suggestionsCount": 0-N,
  "duration": 2000-5000
}
```

---

### **FASE 3: FRONTEND (React Components)** ⏱️ ~15 min

#### **3.1. Adicionar Painel ao SettingsPage**

Editar `components/SettingsPage.tsx`:

```typescript
// 1. Import
import OrgAISuggestionsPanel from './settings/OrgAISuggestionsPanel';

// 2. Adicionar ao array de cards (dentro do useMemo):
(isSuperAdmin || isAdmin) ? {
  id: 'orgAISuggestions',
  title: '🤖 Inteligência Organizacional',
  description: 'Sugestões automáticas de IA para melhorar a estrutura do organograma.',
  icon: <CpuChipIcon className="w-6 h-6 text-purple-600"/>,
  kbd: 'Alt+I',
} : null,

// 3. Adicionar ao filtro de cards (linha ~312):
cards.filter(c => [
  'apiStatus',
  'userManager',
  'workspaceImport',
  'organogramaVisual',  // Existente
  'orgAISuggestions',   // ← ADICIONAR AQUI
  'departments',
  'cargos',
  // ... resto
].includes(c.id))

// 4. Adicionar modal (após outros modais, linha ~397+):
{activeModal === 'orgAISuggestions' && (
  <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-[100] p-6">
    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl max-h-[90vh] overflow-y-auto">
      <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex justify-between items-center z-10">
        <h2 className="text-xl font-bold text-slate-900">🤖 Inteligência Organizacional</h2>
        <button
          onClick={() => setActiveModal(null)}
          className="text-slate-400 hover:text-slate-600 transition-colors"
        >
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
      <div className="p-6">
        <OrgAISuggestionsPanel />
      </div>
    </div>
  </div>
)}
```

#### **3.2. Atualizar atalhos de teclado**

No `useEffect` de atalhos (linha ~189), adicionar:

```typescript
const map: Record<string, string> = {
  // ... existentes
  'i': 'orgAISuggestions',  // ← ADICIONAR
  'I': 'orgAISuggestions',
};
```

#### **3.3. Verificar imports necessários**

Certifique-se que `CpuChipIcon` está importado:

```typescript
import { 
  CpuChipIcon,  // ← Verificar se existe
  ChartBarIcon, 
  // ... resto
} from './ui/icons';
```

---

### **FASE 4: PROCESSAR FILA (Opcional mas Recomendado)** ⏱️ ~5 min

#### **4.1. Criar Cron Job (Supabase Cron)**

Para processar a fila automaticamente a cada 5 minutos:

```sql
-- No SQL Editor do Supabase
SELECT cron.schedule(
  'process-org-analysis-queue',
  '*/5 * * * *',  -- A cada 5 minutos
  $$
  SELECT net.http_post(
    url := 'https://SEU_PROJECT_ID.supabase.co/functions/v1/analyze-org-structure',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key'),
      'Content-Type', 'application/json'
    ),
    body := '{}'::jsonb
  );
  $$
);
```

**Ou via código TypeScript** (executar manualmente ou via webhook):

```typescript
// Chamar Edge Function para processar fila
const { data } = await supabase.functions.invoke('analyze-org-structure', {
  body: { batchSize: 10 }
});
```

#### **4.2. Limpeza automática (Semanal)**

```sql
SELECT cron.schedule(
  'cleanup-org-queue',
  '0 2 * * 0',  -- Todo domingo às 2h
  $$
  SELECT cleanup_old_analysis_queue();
  $$
);
```

---

## ✅ VALIDAÇÃO FINAL

### **Checklist de Testes:**

- [ ] **Database:**
  - [ ] Executar `SELECT * FROM v_org_structure;` retorna usuários
  - [ ] Executar `SELECT * FROM validate_org_structure();` retorna validações
  - [ ] Executar `SELECT * FROM v_analysis_queue_stats;` mostra stats

- [ ] **Triggers:**
  - [ ] Atualizar cargo de um usuário → verificar `org_analysis_queue` (deve aparecer 1 item pendente)
  - [ ] Criar linha de reporte → verificar fila novamente

- [ ] **Edge Function:**
  - [ ] Invoke manual via Dashboard funciona
  - [ ] Retorna JSON válido
  - [ ] Cria sugestões em `org_suggestions`

- [ ] **Frontend:**
  - [ ] Acessar Settings → ver card "🤖 Inteligência Organizacional"
  - [ ] Clicar no card → modal abre
  - [ ] Ver sugestões pendentes (se houver)
  - [ ] Botão "Análise Manual" funciona
  - [ ] Aprovar/Rejeitar sugestão funciona

---

## 🐛 TROUBLESHOOTING

### **Problema 1: Edge Function falha com "GEMINI_API_KEY not found"**

**Solução:**
```bash
supabase secrets set GEMINI_API_KEY=sua_api_key_aqui
supabase functions deploy analyze-org-structure
```

### **Problema 2: Trigger não dispara**

**Verificar:**
```sql
-- Ver triggers ativos
SELECT trigger_name, event_object_table 
FROM information_schema.triggers 
WHERE trigger_name LIKE '%org%';

-- Testar manualmente
UPDATE profiles SET cargo = 'CEO' WHERE id = 'algum_id';
SELECT * FROM org_analysis_queue ORDER BY created_at DESC LIMIT 5;
```

### **Problema 3: Sugestões não aparecem no frontend**

**Verificar RLS:**
```sql
-- Ver policies
SELECT * FROM pg_policies WHERE tablename = 'org_suggestions';

-- Testar acesso direto
SELECT * FROM org_suggestions WHERE status = 'pending';
```

**Verificar role do usuário:**
```sql
SELECT id, email, role FROM profiles WHERE id = auth.uid();
```

### **Problema 4: Fila não processa**

**Processar manualmente:**
```sql
SELECT * FROM process_analysis_queue(10);
```

**Ou via Edge Function:**
```bash
curl -X POST https://SEU_PROJECT.supabase.co/functions/v1/analyze-org-structure \
  -H "Authorization: Bearer SEU_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"batchSize": 10}'
```

---

## 📊 MONITORAMENTO

### **Ver estatísticas em tempo real:**

```sql
-- Dashboard da fila
SELECT * FROM v_analysis_queue_stats;

-- Sugestões por tipo
SELECT 
  type,
  status,
  COUNT(*) as count,
  AVG(confidence_score) as avg_confidence
FROM org_suggestions
GROUP BY type, status
ORDER BY count DESC;

-- Mudanças recentes (últimas 24h)
SELECT 
  change_type,
  COUNT(*) as count
FROM org_change_log
WHERE created_at > NOW() - INTERVAL '24 hours'
GROUP BY change_type;
```

---

## 🎉 CONCLUSÃO

Após seguir todos os passos, você terá:

✅ **Sistema de IA funcionando em tempo real**  
✅ **Análise automática a cada mudança**  
✅ **Interface para aprovação de sugestões**  
✅ **Auditoria completa de mudanças**  
✅ **Validações organizacionais rodando**

**Custo mensal:** < $0.10 USD  
**Valor gerado:** ENORME 🚀

---

## 📞 SUPORTE

Se algo não funcionar:
1. Verificar logs do Supabase (Dashboard → Logs)
2. Verificar console do navegador (F12)
3. Testar cada componente isoladamente
4. Verificar este guia novamente

**Tudo pronto para produção!** ✨

