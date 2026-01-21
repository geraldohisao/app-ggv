# 🚀 OKR v2.0 - IA Avançada + Multi-Unidades

**Data**: 2026-01-07  
**Visão**: Sistema OKR inteligente com IA consultora e suporte multi-empresas

---

## 🎯 Visão Geral

### Objetivos Estratégicos

1. **IA Contextualizada** - Usar cérebro da IA existente para gerar KRs mais inteligentes
2. **IA Consultora** - Assistente que sugere oportunidades, prioriza e alerta
3. **Multi-Unidades** - Suporte para Grupo GGV (GGV, Harpia, Sellbot)
4. **Integração Total** - Conectar OKR com Diagnóstico, Assistente, Calls

---

## 📋 Fase 1: IA Contextualizada (2-3 dias)

### 1.1. Integração com Banco Vetorial

**Objetivo:** Usar base de conhecimento existente para gerar KRs

**Implementação:**

```typescript
// services/okrIntelligentAIService.ts

import { getRelevantDocuments } from '../../services/embeddingService';
import { callOpenAIJson, callGeminiJson } from '../../services/geminiService';

async function suggestKRsWithContext(objective: string, companyContext?: string) {
  // 1. Buscar documentos relevantes do banco vetorial
  const relevantDocs = await getRelevantDocuments(objective, 3);
  
  // 2. Montar contexto rico
  const context = `
CONTEXTO DA EMPRESA (Base de Conhecimento):
${relevantDocs.map(d => d.content).join('\n\n')}

${companyContext || ''}

HISTÓRICO DE OKRs ANTERIORES:
${await getPreviousOKRs()} // Buscar OKRs anteriores para aprender padrões

DADOS DO DIAGNÓSTICO COMERCIAL:
${await getLatestDiagnosticData()} // Usar resultados do diagnóstico
  `;
  
  // 3. Gerar KRs com contexto
  const prompt = `Você é um consultor de OKRs da GGV.
  
OBJETIVO:
"${objective}"

CONTEXTO COMPLETO:
${context}

TAREFA:
Sugira 3-5 Key Results SMART considerando:
- O contexto da empresa (base de conhecimento)
- Histórico de OKRs anteriores
- Dados do diagnóstico comercial
- Melhores práticas de OKRs

Retorne JSON com sugestões contextualizadas e justificativas detalhadas.`;

  // Usar IA existente
  return await callAIWithFallback(prompt, krSchema);
}
```

**Banco de Dados:**
```sql
-- Tabela para armazenar histórico de OKRs alcançados
CREATE TABLE okr_achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  okr_id UUID REFERENCES okrs(id),
  achievement_date DATE,
  final_progress INTEGER,
  lessons_learned TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- IA aprende com sucessos e falhas
```

**Benefícios:**
- KRs mais alinhados com a realidade da empresa
- Usa conhecimento acumulado
- Sugestões mais precisas

---

## 📋 Fase 2: IA Consultora (3-4 dias)

### 2.1. Dashboard de IA (Insights e Alertas)

**Novo componente:** `OKRInsightsPanel`

**Funcionalidades:**

#### A. Análise de Saúde dos OKRs
```typescript
async function analyzeOKRHealth(okrs: OKR[]) {
  const prompt = `Você é um consultor de OKRs da GGV.

OKRS ATUAIS:
${JSON.stringify(okrs, null, 2)}

ANÁLISE:
1. Identifique OKRs em risco (progresso < 40%)
2. Detecte padrões de problema (ex: sempre atrasam no Q1)
3. Sugira ações corretivas específicas
4. Priorize intervenções (1-5, onde 5 = urgente)

Retorne JSON com insights acionáveis.`;

  return await callAI(prompt);
}
```

**Output:**
```json
{
  "insights": [
    {
      "okr_id": "...",
      "risk_level": "high",
      "message": "OKR 'Aumentar receita em 30%' está 60% atrasado. KR de faturamento está em 24% vs meta de 70% para este período.",
      "actions": [
        "Revisar estratégia de precificação",
        "Intensificar prospecção ativa",
        "Considerar desconto para Q1"
      ],
      "priority": 5
    }
  ],
  "opportunities": [
    {
      "title": "NPS está 92% - explorar casos de sucesso",
      "description": "Com NPS alto, considere criar programa de indicação ou case studies.",
      "impact": "medium"
    }
  ]
}
```

#### B. Sugestão de Próximos OKRs
```typescript
async function suggestNextQuarterOKRs() {
  const currentOKRs = await getCurrentOKRs();
  const diagnosticData = await getLatestDiagnosticData();
  
  const prompt = `Com base no desempenho atual e diagnóstico comercial, sugira 3 OKRs prioritários para o próximo trimestre.`;
  
  return await callAI(prompt);
}
```

#### C. Detecção de Gaps
```typescript
async function detectGaps() {
  // IA identifica:
  // - Departamentos sem OKRs
  // - Áreas estratégicas negligenciadas
  // - Desequilíbrios (ex: muito foco em vendas, pouco em retenção)
}
```

---

## 📋 Fase 3: Multi-Unidades de Negócio (2-3 dias)

### 3.1. Modelo de Dados

```sql
-- Tabela de empresas do grupo
CREATE TABLE companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL,
  description TEXT,
  logo_url TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seeds
INSERT INTO companies (name, description) VALUES
  ('GGV Inteligência em Vendas', 'Consultoria e inteligência comercial'),
  ('Harpia Consultoria Empresarial', 'Consultoria estratégica'),
  ('Harpia BPO', 'Terceirização de processos'),
  ('Sellbot', 'Automação de vendas e chatbots');

-- Adicionar company_id em okrs
ALTER TABLE okrs ADD COLUMN company_id UUID REFERENCES companies(id);
ALTER TABLE profiles ADD COLUMN company_id UUID REFERENCES companies(id);

-- Usuários podem trabalhar em múltiplas empresas
CREATE TABLE user_company_access (
  user_id UUID REFERENCES profiles(id),
  company_id UUID REFERENCES companies(id),
  role TEXT, -- OWNER, ADMIN, VIEWER
  PRIMARY KEY (user_id, company_id)
);
```

### 3.2. UI de Seleção de Empresa

**Componente:** `CompanySelector` (dropdown no header)

```typescript
// Usuário seleciona empresa atual
const [selectedCompany, setSelectedCompany] = useState<Company>();

// Filtrar OKRs pela empresa
const companyOKRs = okrs.filter(o => o.company_id === selectedCompany.id);
```

### 3.3. Dashboard Consolidado (Grupo)

**Visão CEO do Grupo:**
- Ver OKRs de todas as empresas
- Comparar performance entre unidades
- Identificar sinergias

```typescript
// Dashboard executivo do grupo
function GroupExecutiveDashboard() {
  return (
    <div>
      <h1>Performance Grupo GGV 2026</h1>
      
      {companies.map(company => (
        <CompanyCard 
          company={company}
          okrs={okrsByCompany[company.id]}
          progress={calculateCompanyProgress(company.id)}
        />
      ))}
      
      {/* IA Insights para o grupo */}
      <AIInsightsPanel companies={companies} />
    </div>
  );
}
```

---

## 📋 Fase 4: IA Consultora Avançada (5-7 dias)

### 4.1. Agente IA Especializado em OKRs

**Novo módulo:** "Consultor IA de OKRs"

**Funcionalidades:**

#### A. Chat com IA sobre OKRs
```typescript
// Conversar com IA sobre estratégia
const messages = [
  "Por que o OKR de faturamento está atrasado?",
  "Qual OKR devo priorizar esta semana?",
  "Como melhorar a conversão SQL → Won?",
];

// IA responde baseada em:
// - Dados dos OKRs
// - Histórico de performance
// - Diagnóstico comercial
// - Dados de Calls
// - Base de conhecimento
```

#### B. Análise Preditiva
```typescript
async function predictOKRSuccess(okr: OKR) {
  // IA prevê:
  // - Probabilidade de atingir meta (0-100%)
  // - Fatores de risco
  // - Recomendações para aumentar sucesso
  
  const prompt = `Baseado no histórico e contexto, qual a probabilidade deste OKR ser alcançado?
  
  OKR: ${okr.objective}
  Progresso atual: ${okr.progress}%
  Tempo restante: ${diasRestantes} dias
  Histórico similar: ${okrsSimilares}
  
  Analise e preveja.`;
}
```

#### C. Sugestão de Priorização (Sprint Planning)
```typescript
async function suggestSprintPriorities() {
  // IA analisa todos os OKRs e sugere:
  // - Quais KRs focar esta semana
  // - Quais iniciativas criar na sprint
  // - Onde alocar recursos
  
  return {
    "high_priority": [
      "KR: Aumentar conversão SQL → Won (impacto: alto, esforço: médio)",
      "Iniciativa sugerida: Roleplay diário com time de Closers"
    ],
    "medium_priority": [...],
    "low_priority": [...]
  };
}
```

---

## 📋 Fase 5: Integrações (3-4 dias)

### 5.1. Integração com Diagnóstico

**Auto-criar OKRs baseado no diagnóstico:**

```typescript
async function generateOKRsFromDiagnostic(diagnosticResult: any) {
  // IA lê o diagnóstico e sugere OKRs
  const prompt = `Baseado neste diagnóstico comercial, sugira 3 OKRs prioritários:
  
  Benchmark atual: ${diagnosticResult.score}
  Gaps identificados: ${diagnosticResult.gaps}
  Oportunidades: ${diagnosticResult.opportunities}
  `;
  
  return await suggestOKRs(prompt);
}
```

**Botão no Diagnóstico:**
- "Gerar OKRs deste Diagnóstico" → cria OKRs automaticamente

### 5.2. Integração com Calls

**KRs alimentados automaticamente:**

```typescript
// KR: "Taxa de conversão SQL → Won acima de 35%"
// Auto-atualiza current_value baseado em dados reais de Calls

async function syncKRWithCallsData(kr: KeyResult) {
  if (kr.title.includes('conversão')) {
    const conversionRate = await getConversionRateFromCalls();
    await updateKeyResult(kr.id, { current_value: conversionRate });
  }
}

// Cron job diário ou webhook
```

### 5.3. Integração com Pipedrive

**Auto-sync de metas:**

```typescript
// Importar metas do Pipedrive como OKRs
async function importPipedriveMetas() {
  const metas = await getPipedriveGoals();
  
  metas.forEach(meta => {
    createOKR({
      objective: meta.name,
      department: 'comercial',
      key_results: [{
        title: `Alcançar ${meta.target} em vendas`,
        type: 'currency',
        direction: 'increase',
        target_value: meta.target,
      }]
    });
  });
}
```

---

## 🗂️ Cronograma de Implementação

| Fase | Funcionalidade | Esforço | Prioridade |
|------|----------------|---------|------------|
| **1** | IA Contextualizada (banco vetorial) | 2-3 dias | 🔴 Alta |
| **2A** | Análise de Saúde (IA Insights) | 2 dias | 🔴 Alta |
| **2B** | Análise Preditiva | 2 dias | 🟡 Média |
| **2C** | Sugestão de Priorização | 2 dias | 🟡 Média |
| **3** | Multi-Unidades de Negócio | 3 dias | 🟡 Média |
| **4** | Chat IA sobre OKRs | 3 dias | 🟢 Baixa |
| **5A** | Integração Diagnóstico | 1 dia | 🔴 Alta |
| **5B** | Integração Calls | 2 dias | 🟡 Média |
| **5C** | Integração Pipedrive | 2 dias | 🟢 Baixa |

**Total estimado:** 18-22 dias úteis (~4-5 semanas)

---

## 🔧 Arquitetura Técnica

### IA Contextualizada

```
┌─────────────────────────────────────┐
│  Objetivo do Usuário                │
│  "Aumentar receita em 30%"          │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│  Sistema de IA Contextualizada      │
├─────────────────────────────────────┤
│  1. Buscar no Banco Vetorial        │
│     • Documentos sobre vendas       │
│     • Estratégias da empresa        │
│     • Melhores práticas GGV         │
│                                     │
│  2. Buscar OKRs Anteriores          │
│     • Padrões de sucesso            │
│     • KRs que funcionaram           │
│     • Lições aprendidas             │
│                                     │
│  3. Buscar Diagnóstico              │
│     • Gaps atuais                   │
│     • Oportunidades identificadas   │
│     • Benchmark                     │
│                                     │
│  4. Buscar Dados de Calls           │
│     • Taxa de conversão atual       │
│     • Performance por SDR           │
│     • Gargalos identificados        │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│  LLM (GPT-4 ou Gemini)              │
│  + Contexto Rico                    │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│  KRs Inteligentes e Contextualizados│
│                                     │
│  1. "Aumentar faturamento de        │
│     R$ 1.2M para R$ 2M"             │
│     (baseado em histórico real)     │
│                                     │
│  2. "Melhorar taxa SQL→Won de       │
│     22% para 35%"                   │
│     (baseado em dados de Calls)     │
│                                     │
│  3. "Reduzir ciclo de vendas de     │
│     90 para 60 dias"                │
│     (gap do diagnóstico)            │
└─────────────────────────────────────┘
```

### Multi-Unidades

```
Grupo GGV
├── GGV Inteligência em Vendas
│   ├── OKRs Estratégicos
│   ├── OKRs Setoriais (Comercial, Marketing)
│   └── Sprints
│
├── Harpia Consultoria
│   ├── OKRs Estratégicos
│   └── OKRs Setoriais
│
├── Harpia BPO
│   └── ...
│
└── Sellbot
    └── ...
```

**Dashboard Consolidado:**
- Ver todas as empresas
- Comparar performance
- Identificar sinergias
- Compartilhar boas práticas

---

## 🎯 Funcionalidades da IA Consultora

### 1. **Análise de Risco** 🔴
```
IA: "⚠️ ALERTA: OKR 'Aumentar receita 30%' está em risco alto (82% de chance de não atingir)

ANÁLISE:
- Progresso atual: 24% (deveria estar em 60% para este período)
- KR crítico: Faturamento está 45% abaixo da meta
- Padrão identificado: Equipe comercial reduzida em 30% vs plano

AÇÕES RECOMENDADAS (prioridade):
1. 🔥 URGENTE: Contratar 2 Closers imediatamente
2. 🔥 URGENTE: Revisar metas de Q1 (podem estar irrealistas)
3. ⚡ IMPORTANTE: Implementar programa de aceleração de pipeline
```

### 2. **Sugestão de Priorização** 🎯
```
IA: "📊 RECOMENDAÇÃO SEMANAL

FOQUE NESTES 3 KRs ESTA SEMANA:

1. 🔴 Taxa de conversão SQL → Won (impacto: ALTO)
   Ação: Roleplay diário + revisão de pitch
   
2. 🟡 Reduzir ciclo de vendas (impacto: MÉDIO)
   Ação: Automatizar follow-up com Sellbot
   
3. 🟢 NPS acima de 85 (impacto: BAIXO, mas fácil)
   Ação: Pesquisa de satisfação automatizada

PODE ADIAR:
- Ticket médio (já está 90% da meta)
- Campanhas de marketing (Q1 foco em conversão)
```

### 3. **Oportunidades Escondidas** 💡
```
IA: "💡 OPORTUNIDADE DETECTADA

Análise de padrões identificou:
- Clientes com NPS > 90 têm ticket médio 2.3x maior
- 15 clientes nesta categoria ainda não receberam proposta de upsell

SUGESTÃO DE OKR:
"Aumentar ticket médio via upsell para clientes promotores"

KRs sugeridos:
1. Mapear 15 clientes NPS > 90 até 15/01
2. Criar proposta de upsell até 20/01
3. Fechar 5 upsells até 31/01 (valor: R$ 150k)

Esforço estimado: BAIXO
Impacto estimado: ALTO (ROI 3.2x)
```

---

## 🛠️ Stack Técnica

### Backend
- PostgreSQL (já usado)
- Supabase Functions (Edge Functions para IA)
- Cron jobs para análises diárias

### IA/ML
- OpenAI GPT-4o (análises complexas)
- Gemini 2.0 (fallback)
- Embeddings (banco vetorial existente)
- Langchain (orquestração de agentes)

### Frontend
- React (já usado)
- Recharts (gráficos avançados)
- D3.js (visualizações de rede/organograma)

---

## 📊 Priorização Recomendada

### Sprint 1 (Semana 1-2): MVP IA
- ✅ Integrar com banco vetorial
- ✅ Gerar KRs com contexto
- ✅ Dashboard de insights básico

### Sprint 2 (Semana 3-4): Multi-Unidades
- ✅ Tabelas de companies
- ✅ Seletor de empresa
- ✅ Filtros por empresa

### Sprint 3 (Semana 5-6): IA Consultora
- ✅ Análise de risco
- ✅ Sugestão de priorização
- ✅ Detecção de oportunidades

### Sprint 4 (Semana 7-8): Integrações
- ✅ Diagnóstico → OKRs
- ✅ Calls → Auto-update KRs
- ✅ Chat IA sobre OKRs

---

## 💰 ROI Estimado

**Investimento:** 4-5 semanas de desenvolvimento

**Retorno:**
- ✅ Economia de 5h/semana (geração automática de KRs)
- ✅ Aumento de 30% na taxa de alcance de OKRs (IA identifica riscos cedo)
- ✅ Melhor alinhamento estratégico (multi-unidades)
- ✅ Decisões baseadas em dados (IA consultora)

**ROI:** 3-4x em 3 meses

---

## 🎯 Próximos Passos Imediatos

**Para começar AGORA:**

1. **Configure API Keys** (5 min)
   - OpenAI ou Gemini
   - Já tenho o código pronto

2. **Teste IA básica** (10 min)
   - Criar OKR e clicar "Sugerir com IA"
   - Ver se funciona

3. **Defina prioridade** (decisão sua)
   - Quer IA contextualizada primeiro?
   - Quer multi-unidades primeiro?
   - Quer os dois em paralelo?

---

**Me diga qual fase quer implementar primeiro e começamos!** 🚀

