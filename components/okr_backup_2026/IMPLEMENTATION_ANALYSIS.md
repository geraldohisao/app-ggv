# Análise da Implementação - Módulo OKR

## 📋 Visão Geral

O módulo OKR foi implementado para permitir a criação, edição e gestão de mapas estratégicos com objetivos (Objectives) e resultados-chave (Key Results). A implementação atual passou por múltiplas iterações e mudanças de escopo.

---

## 🏗️ Arquitetura Atual

### Estrutura de Componentes

```
components/okr/
├── OKRPage.tsx                    # Orquestrador principal (rotas internas)
├── OKRDashboard.tsx               # Listagem de mapas salvos
├── OKRContextForm.tsx             # Formulário de contexto para IA
├── StrategicMapBuilder.tsx        # Editor principal (1287 linhas)
├── hooks/
│   ├── useAutoSave.ts            # Auto-save localStorage (REMOVIDO do fluxo)
│   └── useThrottledSave.ts       # Throttle de salvamento servidor
├── utils/
│   ├── validation.ts             # Validação de dados
│   ├── retryWithBackoff.ts       # Retry com backoff exponencial
│   ├── exportToPDF.ts            # Exportação PDF
│   └── toast.ts                  # Notificações
└── components/
    ├── VersionHistory.tsx        # Histórico de versões
    ├── ShareModal.tsx            # Compartilhamento
    └── AdvancedAnalysisModal.tsx # Análise avançada IA
```

---

## 📊 Estrutura de Dados

### Tipos Principais (types.ts)

```typescript
interface StrategicMap {
  id?: string;
  user_id?: string;
  company_name: string;
  date: string;
  mission?: string;
  vision?: string;
  values?: string[];
  motors?: Motor[];           // Motores estratégicos
  okrs?: OKRItem[];          // ⚠️ NOVO: substituiu objectives
  objectives?: Objective[];   // LEGADO: mantido para compatibilidade
  actionPlans?: ActionPlan[];
  roles?: Role[];
  rituals?: Ritual[];
  tracking?: TrackingMetric[];
  created_at?: string;
  updated_at?: string;
}

interface OKRItem {
  id: string;
  title: string;
  keyResults: KeyResult[];
}

interface KeyResult {
  id: string;
  name: string;
  target?: string | number;
}
```

**⚠️ PROBLEMA**: Existem dois modelos concorrentes:
- `objectives` (antigo, com KPIs, frequência, indicadores)
- `okrs` (novo, simplificado, só título + KRs)

---

## 🔄 Fluxo de Dados

### 1. Criação de Mapa

```
OKRPage (initial) 
  → Botão "Gerar com IA" → OKRContextForm
  → generateStrategicMapWithAI()
  → OpenAI/Gemini → JSON estruturado
  → StrategicMapBuilder (edição)

OU

OKRPage (initial)
  → Botão "Construir do Zero"
  → StrategicMapBuilder (mapa vazio)
```

### 2. Auto-Save

```
StrategicMapBuilder
  → useEffect (depende de map, okrs, etc.)
  → Validações (nome empresa, okrs, KRs)
  → saveToServer({ auto: true })
  → useThrottledSave (throttle de 60s)
  → saveStrategicMap (Supabase)
```

**⚠️ PROBLEMA**: Auto-save só dispara se TODAS as condições forem atendidas:
- Usuário autenticado
- Nome da empresa preenchido
- Pelo menos 1 OKR
- TODOS os OKRs têm pelo menos 1 KR

Se faltar 1 KR em qualquer OKR, nada é salvo.

### 3. Listagem

```
OKRDashboard
  → listStrategicMaps(user.id)
  → Supabase: SELECT * FROM strategic_maps WHERE user_id = ?
  → Renderiza cards
```

---

## 🤖 Integrações

### OpenAI (Primário)

**Modelo**: `gpt-4o-mini`  
**Configuração**: `app_settings.openai_api_key`

**Prompts**:
- `generateStrategicMapWithAI()`: Gera mapa completo
- `generateExecutiveAnalysis()`: Análise executiva
- `generateAdvancedAnalysis()`: SWOT, tendências, recomendações

**Schema JSON**: Estrutura rígida para garantir formato correto

### Gemini (Fallback)

**Modelo**: `gemini-2.5-flash` → `gemini-2.5-pro` → `gemini-2.0-flash`  
**Configuração**: `app_settings.gemini_api_key`

Usado apenas se OpenAI falhar ou não tiver API key configurada.

### Supabase

**Tabelas**:
- `strategic_maps`: Dados principais
- `strategic_maps_history`: Versões (não usado ativamente)
- `strategic_maps_shares`: Compartilhamento (não usado ativamente)

**RLS (Row Level Security)**: Configurado para filtrar por `user_id`

**Schema SQL**: `supabase/sql/okr_schema.sql`

---

## ✅ Funcionalidades Implementadas

### Básicas
- ✅ Dashboard com listagem de mapas
- ✅ Busca por nome/missão/visão
- ✅ Criação com IA ou do zero
- ✅ Edição de todos os campos
- ✅ Auto-save no servidor (com problemas)
- ✅ Duplicação de mapas
- ✅ Exclusão de mapas
- ✅ Indicador de último salvamento

### OKRs
- ✅ Adicionar/remover OKRs
- ✅ Adicionar/remover Key Results
- ✅ Focar em um OKR específico
- ✅ Alternância Editar/Resumo
- ✅ Contadores de OKRs e KRs
- ⚠️ Validação (exige pelo menos 1 OKR com 1 KR)

### Avançadas
- ✅ Histórico de versões (estrutura criada, não integrada)
- ✅ Compartilhamento (estrutura criada, não integrada)
- ✅ Análise IA avançada (SWOT, etc.)
- ✅ Exportação PDF (requer deps: html2canvas, jspdf)
- ✅ Tracking de indicadores mensais
- ⚠️ Upload de documentos (aceita, mas não processa)

---

## 🚨 Problemas Conhecidos

### 1. Auto-Save Não Funciona Consistentemente
**Motivo**: Validação muito rígida  
**Impacto**: Usuário perde trabalho se não preencher tudo corretamente  
**Solução**: Relaxar validações ou salvar parcialmente

### 2. Dois Modelos de Dados Concorrentes
**Problema**: `objectives` (antigo) vs `okrs` (novo)  
**Impacto**: Confusão, conversões em runtime, bugs potenciais  
**Solução**: Unificar em um modelo único

### 3. Rascunho Local foi Removido
**Problema**: Sem fallback se servidor falhar  
**Impacto**: Perda de dados em caso de erro de rede  
**Solução**: Reintroduzir localStorage como backup

### 4. StrategicMapBuilder muito grande
**Arquivo**: 1287 linhas  
**Problema**: Difícil manutenção, múltiplas responsabilidades  
**Solução**: Quebrar em componentes menores

### 5. Validação Inconsistente
**Problema**: Validação no frontend ≠ backend ≠ schema Supabase  
**Solução**: Schema único compartilhado (ex: Zod)

### 6. Upload de Documentos Não Integrado
**Status**: Aceita arquivos mas não envia para IA  
**Solução**: Integrar Supabase Storage + OCR/parse

### 7. Features Avançadas Não Testadas
**Não implementado/testado**:
- Histórico de versões (restaurar versão)
- Compartilhamento (enviar por email)
- Análise avançada com Gemini

---

## 📦 Dependências

### Instaladas
- `react-hot-toast`: Notificações (fallback para console.log se não instalado)
- Supabase SDK

### Opcionais (não instaladas)
- `html2canvas`: Captura de tela para PDF
- `jspdf`: Geração de PDF

**Fallback**: Exporta como TXT se deps não estiverem instaladas

---

## 🔍 Análise de Qualidade

### Pontos Positivos ✅
1. **Modularização razoável**: Componentes separados por responsabilidade
2. **Validação frontend**: Previne envio de dados inválidos
3. **Retry com backoff**: Resiliência a falhas temporárias
4. **Throttle de salvamento**: Evita sobrecarga do servidor
5. **Fallback IA**: OpenAI → Gemini → Erro amigável
6. **RLS no Supabase**: Segurança de dados por usuário

### Pontos Negativos ❌
1. **Código duplicado**: Lógica repetida em múltiplos locais
2. **Falta de testes**: Zero testes automatizados
3. **Estado complexo**: Múltiplos `useState` interdependentes
4. **Validações inconsistentes**: Frontend, backend e DB desalinhados
5. **Performance**: Re-renders desnecessários (falta `React.memo`)
6. **Logs de debug em produção**: `console.log` excessivos
7. **TypeScript não estrito**: `any` em vários lugares

---

## 💡 Sugestões para Reconstrução

### Opção 1: Refatorar Incremental (2-3 dias)

**Manter**:
- Estrutura de componentes principal
- Integração Supabase
- Fluxo de IA

**Corrigir**:
1. Unificar modelo de dados (`okrs` único)
2. Quebrar `StrategicMapBuilder` em 5-6 componentes
3. Validação com Zod compartilhada
4. Reintroduzir localStorage como backup
5. Relaxar validações de auto-save
6. Remover `console.log` de produção
7. Adicionar testes básicos

**Complexidade**: Média  
**Risco**: Baixo (mudanças incrementais)

---

### Opção 2: Reconstruir do Zero (5-7 dias)

**Nova Arquitetura Sugerida**:

```typescript
// 1. Schema único com Zod
const OKRSchema = z.object({
  id: z.string().uuid().optional(),
  title: z.string().min(1),
  keyResults: z.array(KeyResultSchema).min(1)
});

// 2. Context API para estado global
const OKRContext = createContext<OKRState>();

// 3. Componentes menores e focados
- OKRList (dashboard)
- OKRForm (criação/edição)
- OKRCard (visualização individual)
- KeyResultInput (input de KR)

// 4. Hooks customizados
- useOKRs() // CRUD operations
- useAutoSave() // localStorage + server
- useAIGeneration() // OpenAI/Gemini

// 5. Server-first approach
- Salvar sempre no servidor primeiro
- localStorage apenas como cache/offline
```

**Benefícios**:
- Código limpo e testável
- Estado previsível (Context API ou Zustand)
- Validação consistente (Zod)
- Performance otimizada
- Fácil manutenção

**Desvantagens**:
- Tempo de desenvolvimento maior
- Risco de regressão de features
- Necessário re-testar tudo

---

## 📊 Métricas de Complexidade

| Métrica | Valor | Status |
|---------|-------|--------|
| Linhas de código | ~3.500 | 🔴 Alto |
| Componentes | 12 | 🟢 OK |
| Funções > 50 linhas | 8 | 🟡 Médio |
| Dependências externas | 3 | 🟢 OK |
| Cobertura de testes | 0% | 🔴 Crítico |
| Complexidade ciclomática (avg) | 12 | 🔴 Alto |

---

## 🎯 Recomendação Final

### ⚡ Refatoração Incremental (RECOMENDADO)

**Por quê?**
1. Funcionalidades core já funcionam
2. Estrutura base é sólida
3. Menor risco de regressão
4. Entrega mais rápida
5. Permite iteração contínua

**Prioridades (em ordem)**:
1. **Crítico**: Corrigir auto-save (relaxar validações)
2. **Crítico**: Unificar modelo de dados (remover `objectives`)
3. **Alto**: Quebrar `StrategicMapBuilder` em componentes
4. **Alto**: Reintroduzir backup localStorage
5. **Médio**: Validação com Zod
6. **Médio**: Remover logs de debug
7. **Baixo**: Testes automatizados
8. **Baixo**: Otimizações de performance

**Estimativa**: 2-3 dias de trabalho focado

---

### 🚀 Reconstruir do Zero

**Considere SE**:
- Houver tempo disponível (5-7 dias)
- Quiser adicionar muitas features novas
- A arquitetura atual estiver travando desenvolvimento
- Precisar de alta testabilidade/manutenibilidade

**Não recomendado SE**:
- Prazo apertado
- Features core já atendem necessidades
- Equipe pequena

---

## 📝 Checklist para Decisão

```
[ ] O auto-save atual está impedindo o uso?
[ ] A estrutura de dados atual causa bugs frequentes?
[ ] O código é difícil de entender/modificar?
[ ] Há necessidade de adicionar muitas features novas?
[ ] Há tempo para reconstrução (5-7 dias)?
[ ] A equipe tem experiência com a arquitetura proposta?
```

**Se marcou 4+ itens**: Reconstruir do zero  
**Se marcou 2-3 itens**: Refatorar incremental  
**Se marcou 0-1 itens**: Manter e corrigir bugs críticos apenas

---

## 📞 Próximos Passos

1. **Analise este documento**
2. **Teste a funcionalidade atual** (com Console aberto)
3. **Decida**: Refatorar ou Reconstruir
4. **Me informe a decisão** para eu prosseguir

---

**Documento gerado em**: 2026-01-07  
**Versão do código analisado**: Commit mais recente (sem commit das últimas mudanças)  
**Autor da análise**: Claude AI (Cursor Agent)

