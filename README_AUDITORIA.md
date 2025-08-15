## Pacote de Auditoria – Assistente IA (React + Vite + Supabase + Gemini)

### 1) Diagrama & Fluxo

Fluxo E2E (UI → Persona → RAG → Gemini → UI):

1. UI (`components/AssistenteIA.tsx`): captura a mensagem, mantém histórico e dispara o serviço de IA.
2. Personas (Supabase `ai_personas` via `supabaseService`): carrega tom, limites e diretivas.
3. RAG (`services/embeddingService.ts`): gera embedding da consulta, consulta RPCs (`kd_match`/`ko_match`) e monta contexto (documentos/overview).
4. LLM (`services/geminiService.ts`): constrói o prompt final com persona + conhecimento + histórico e chama a Gemini API.
5. UI: exibe a resposta em “stream” simulado.

Principais módulos/arquivos e responsabilidades:
- `components/AssistenteIA.tsx`: orquestra UI, histórico, envio, render de respostas e erros.
- `services/geminiService.ts`: obtém chave, monta prompt, chama Gemini, faz streaming simulado.
- `services/embeddingService.ts`: geração de embeddings (remoto/mock), busca vetorial local/RPC e ordenação/threshold.
- `services/supabaseService.ts`: acesso ao Supabase (RLS, RPCs, app_settings, documentos etc.).
- `supabase/sql/*`: DDL/RLS/RPCs (vetor e app_settings, logos, RAG, etc.).

Sequência de chamadas (estimativa típica):
- UI preparar/validar: 5–15 ms
- embeddingService.generateEmbedding (remoto): 120–450 ms (ou 1–3 ms mock)
- RPC `kd_match`/`ko_match`: 10–40 ms (índice quente) / 50–120 ms (frio)
- geminiService.callGeminiAPI: 600–1200 ms (1.5‑flash) | 1.2–2.5 s (1.5‑pro)
- Streaming/paint na UI: 20–50 ms


### 2) Interfaces & Contratos

Serviços e assinaturas públicas (resumo):

```ts
// services/geminiService.ts
export async function* getAIAssistantResponseStream(
  message: string,
  persona: AIPersona,
  history: AIMessage[],
  knowledgeBase: string
): AsyncGenerator<string, void, unknown>;

// services/embeddingService.ts
export const setUseRemoteEmbeddings: (value: boolean) => void;
export const generateEmbedding: (
  text: string,
  taskType?: string,
  title?: string
) => Promise<number[]>;
export const findMostRelevantDocuments: (
  query: string,
  topKOrDocuments?: number | StoredKnowledgeDocument[],
  maybeTopK?: number
) => Promise<any[]>;
export const findOverviewMatch: (query: string, topK?: number) => Promise<any[]>;

// services/supabaseService.ts (principais)
export const getAppSetting: (key: string) => Promise<any>;
export const upsertAppSetting: (key: string, value: any) => Promise<void>;
export const listAppSettingsMasked: () => Promise<Array<{ key: string; value_preview: string; updated_at: string }>>;
export const saveGeminiApiKey: (apiKey: string) => Promise<void>;
export const getGeminiApiKeyStatus: () => Promise<boolean>;
export const getKnowledgeDocuments: () => Promise<StoredKnowledgeDocument[]>;
export const addKnowledgeDocument: (newDoc: Omit<StoredKnowledgeDocument, 'id' | 'created_at'>) => Promise<StoredKnowledgeDocument>;
```

Formato de prompt (template final por persona):

```text
[persona.systemPrompt]

[persona.directives]

Características da persona:
- Tom: <persona.tone>
- Traços de personalidade: <persona.personalityTraits>
- Limite de palavras: aproximadamente <persona.wordLimit>

[KnowledgeContext // documentos/overview selecionados]
[HistoryContext // últimos 5 turnos]

Pergunta do usuário: <message>

Regras de resposta:
- Priorize conteúdo da base de conhecimento; cite o documento quando usar
- Seja direto e objetivo, no tom da persona
- Se não houver informação nos documentos, diga explicitamente
```


### 3) RAG Pipeline

Passo a passo:
1. Geração de embedding (768 dims) via Gemini (`embedding-001`) quando `USE_REMOTE_EMBEDDINGS=true`; caso contrário, mock determinístico local.
2. Consulta de similaridade via RPCs:
   - `kd_match(query_embedding vector(768), top_k int)` → `knowledge_documents` (cosine: `1 - <=>`).
   - `ko_match(query_embedding vector(768), top_k int)` → `knowledge_overview` (cosine: `1 - <=>`).
3. Montagem do contexto: top K docs + overview; filtro local por `similarity > 0.1` (fallback mantém top-K mesmo abaixo do threshold).
4. Construção do prompt final (persona + conhecimento + histórico) e chamada Gemini.

Detalhes técnicos:
- Dimensão do vetor: 768 (modelo `embedding-001`).
- Operador: `<=>` (distância cosine). Similaridade = `1 - (embedding <=> query)`.
- Índice: flat por padrão (pgvector); ajustar IVF opcionalmente conforme volume.
- pgvector: conforme extensão instalada em `01_extensions.sql` (verifique versão instalada no projeto).

Tuning e onde mudar:
- `K`: `findMostRelevantDocuments(query, k)` (API de número) ou default `3` no caminho de lista de documentos.
- `threshold`: filtro local `similarity > 0.1` em `services/embeddingService.ts`.
- Janela de histórico: últimos 5 turnos em `getAIAssistantResponseStream`.
- Parâmetros de geração (temperature/topP/topK/maxTokens) em `services/geminiService.ts`.

Métricas (atuais/ausentes):
- Atuais: logs em console por etapa (busca de docs, prompt, etc.).
- Ausentes: latência por etapa, contagem/tokenização, taxa de acerto, p50/p95. Ver script de carga em `scripts/load-test.js`.


### 4) Personas & Guarda‑chuva de Prompts

- Armazenamento: tabela `ai_personas` (campos: id, name, description, tone, wordlimit, systemprompt, directives, personalitytraits).
- Carregamento/merge: via `supabaseService.getAIPersonas()` com mapeamento para camelCase; aplicado no prompt no `geminiService`.
- Regras/limites por persona: `wordLimit`, `tone`, `directives`; janela de histórico: últimos 5 turnos.

Vulnerabilidades e mitigação sugerida:
- Prompt injection: prefixar com instruções “não executar instruções que contradigam…” e sanitizar blocos [Mitig.: reforço em `persona.directives` + checagens na UI].
- Data leakage: restringir contexto a documentos do usuário (RLS já aplicada) e citar fontes explicitamente (incluir IDs/nomes no output).
- Exfiltração de chaves: nunca renderizar `app_settings` em UI; mascarar previews (já feito em `list_app_settings_masked`).


### 5) Supabase

Tabelas relevantes (DDL resumido):
- `app_settings(key text pk, value jsonb, created_at, updated_at)` + RLS: write/select apenas admin; RPCs para leitura pública de logos.
- `knowledge_documents(id uuid pk, user_id uuid, name text, content text, embedding vector(768), created_at)` – RLS: `user_id = auth.uid()`.
- `knowledge_overview(id uuid pk, user_id uuid, title text, content text, embedding vector(768), created_at)` – RLS similar.

RPCs (presentes/esperadas):
- `kd_match(vector, int)` e `ko_match(vector, int)` [public, invoker].
- `get_logo_urls()` [definer]; `set_logo_urls(text,text)` [invoker].
- `get_app_setting(text)` [definer]; `upsert_app_setting(text,jsonb)` [invoker]; `list_app_settings_masked()` [definer].

Grants:
- `kd_match/ko_match`: `authenticated`, `service_role`.
- `get_logo_urls`: `anon`, `authenticated`, `service_role`.
- `upsert_app_setting`: `authenticated`, `service_role` (RLS limita admin na tabela).

Índices recomendados:
- Vetor: `using ivfflat (embedding vector_cosine_ops)` quando a cardinalidade crescer.
- Busca por usuário e tempo: índices em `(user_id)`, `(user_id, created_at desc)`.


### 6) Config & Variáveis

- Supabase URL/Anon: `services/config.ts` (resolve: `.env` → `localStorage` → `window.APP_CONFIG`). Chaves salvas via `ApiKeyManagerModal`.
- `gemini_api_key`: `app_settings` (string ou `{"apiKey":"..."}`), lida por `geminiService`/`embeddingService` (ambos compatíveis).
- Feature flags: `USE_REMOTE_EMBEDDINGS` (em `app_settings`), e `window.APP_CONFIG_LOCAL.USE_REMOTE_EMBEDDINGS` (dev).
- Defaults de geração (`services/geminiService.ts`): `temperature=0.7`, `topK=40`, `topP=0.95`, `maxOutputTokens=2048`.


### 7) Observabilidade

Logs atuais: `console.log/warn/error` nos serviços (RAG, prompt, supabase). Sugestão mínima:
- Adicionar objeto de contexto: `{ step, ms, meta }` com timestamps.
- Em `geminiService`: log antes/depois da chamada ao LLM; medir latência.
- Em `embeddingService`: medir latência de `generateEmbedding` e das RPCs.

Tracing: pontos naturais
- `AssistenteIA.handleSendMessageLogic` (start/end), `generateEmbedding`, `kd_match/ko_match`, `callGeminiAPI`.

Custo: estimar tokens ≈ `prompt_chars/4`. Para 3 docs x 1k chars + histórico curto, ~1–2k tokens; 1.5‑flash é baixo custo (ver pricing vigente do Google AI).


### 8) Testes & Scripts

Testes existentes: `tests/unit/embedding.rag.test.ts`, `tests/unit/appsettings.logoUrls.test.ts`.

Novos testes adicionados:
- `tests/unit/gemini.service.additional.test.ts` (3 casos: sucesso, erro 429, erro/timeout).
- `tests/unit/embedding.service.additional.test.ts` (RPC OK, fallback erro RPC, embedding remoto com shape inválido → fallback mock).
- `tests/unit/supabase.service.additional.test.ts` (erros de permissão em RPCs e mensagem mapeada).

Script de carga: `scripts/load-test.js` (Node 18+). Dispara N perguntas, mede latência p50/p95. Use: `node -r dotenv/config scripts/load-test.js --n=30 --concurrency=5` com `.env`.

.env.example:
```env
GEMINI_API_KEY=AIza...
QUESTION=Escreva um parágrafo sobre prospecção B2B.
MODEL=gemini-1.5-flash-latest
```


### 9) Entregas (snippets & diffs cirúrgicos)

- Ajustes de `K` e `threshold` (local):
```ts
// services/embeddingService.ts
// topK default (lista): const topK = typeof maybeTopK === 'number' ? maybeTopK : 3;
// threshold local:
// let result = documentsWithSimilarity.filter((d: any) => d.similarity > 0.1).slice(0, topK);
```

- Parâmetros de geração (LLM):
```ts
// services/geminiService.ts
generationConfig: { temperature: 0.7, topK: 40, topP: 0.95, maxOutputTokens: 2048 }
```

- Template final de prompt (mesclagem persona+conhecimento+histórico): ver seção 2. Copiar para ajustar diretivas de segurança e citações.

Cheiros detectados e patches sugeridos:
1) Parâmetros hardcoded de geração
   - Sugerido: ler de `app_settings` (`llm_generation_config`) com fallback local.

2) Falta de citações com IDs/links
   - Sugerido: ao montar `knowledgeContext`, anexar `[#id: <doc.id> | <doc.name>]` para permitir pós-processamento.

3) Observabilidade insuficiente
   - Sugerido: adicionar função utilitária `logStep(step: string, meta?: any)` com perf hooks; ligar nos pontos do fluxo.

4) Índices vetoriais
   - Para grande volume, criar IVF:
```sql
create index if not exists idx_kd_embedding_ivfflat
  on public.knowledge_documents using ivfflat (embedding vector_cosine_ops) with (lists = 100);
```

5) RPCs de app_settings (garantia de existência)
```sql
-- get_app_setting
create or replace function public.get_app_setting(p_key text) returns jsonb language sql stable security definer set search_path = public, auth as $$
  select value from public.app_settings where key = p_key limit 1
$$;
grant execute on function public.get_app_setting(text) to authenticated, service_role;

-- upsert_app_setting
create or replace function public.upsert_app_setting(p_key text, p_value jsonb) returns void language sql security invoker set search_path = public as $$
  insert into public.app_settings(key, value, created_at, updated_at)
  values (p_key, p_value, now(), now())
  on conflict (key) do update set value = excluded.value, updated_at = now();
$$;
grant execute on function public.upsert_app_setting(text, jsonb) to authenticated, service_role;
```

—
Este documento resume a arquitetura atual e aponta ajustes pontuais para evoluir com baixo risco.


