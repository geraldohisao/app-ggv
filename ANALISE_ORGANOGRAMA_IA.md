# 🤖 ANÁLISE ROBUSTA: ORGANOGRAMA INTELIGENTE COM IA

**Data:** 08/01/2026  
**Status:** Análise Arquitetural Completa  
**Objetivo:** Sistema backend robusto com IA para geração e atualização automática do organograma

---

## 📊 VISÃO GERAL

Sistema de IA que analisa a estrutura organizacional atual, detecta inconsistências, sugere melhorias e atualiza automaticamente a hierarquia com base em:
- Títulos de cargos (CEO, COO, Head, SDR, etc)
- Departamentos (Comercial, Marketing, Projetos, etc)
- Relações de subordinação (quem reporta para quem)
- Dados do Google Workspace (se disponível)
- Histórico de mudanças organizacionais

---

## 🏗️ ARQUITETURA PROPOSTA

### **1. COMPONENTES PRINCIPAIS**

```
┌─────────────────────────────────────────────────────────────┐
│                     FRONTEND (React)                         │
│  - Visualização do Organograma                              │
│  - Painel de Sugestões da IA                                │
│  - Aprovação/Rejeição de Mudanças                           │
└─────────────────┬───────────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────────┐
│              SUPABASE EDGE FUNCTIONS                         │
│  1. analyze-org-structure (IA Analysis)                     │
│  2. apply-org-changes (Batch Update)                        │
│  3. detect-org-anomalies (Validation)                       │
└─────────────────┬───────────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────────┐
│                   GOOGLE GEMINI AI                           │
│  - Análise de estrutura organizacional                      │
│  - Detecção de inconsistências                              │
│  - Geração de sugestões hierárquicas                        │
│  - Validação de mudanças propostas                          │
└─────────────────┬───────────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────────┐
│              SUPABASE POSTGRES (RPCs)                        │
│  - validate_org_structure()                                 │
│  - suggest_reporting_lines()                                │
│  - batch_update_hierarchy()                                 │
│  - log_org_changes()                                        │
└─────────────────┬───────────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────────┐
│                  DATABASE TABLES                             │
│  - profiles (users + cargo + department)                    │
│  - cargos (hierarchy levels 1-5)                            │
│  - departments (organizational units)                       │
│  - org_suggestions (AI recommendations) ← NOVA              │
│  - org_change_log (audit trail) ← NOVA                      │
│  - reporting_lines (who reports to whom) ← NOVA             │
└─────────────────────────────────────────────────────────────┘
```

---

## 🧠 FUNCIONALIDADES INTELIGENTES

### **A. ANÁLISE AUTOMÁTICA**

**O que a IA analisa:**
1. ✅ **Consistência Hierárquica**
   - SDR não pode gerenciar um Head
   - Operacional (nível 5) não pode reportar direto ao CEO
   - Cada departamento deve ter no máximo 1 Head
   
2. ✅ **Detecção de Anomalias**
   - Usuário sem cargo definido
   - Departamento sem líder (Head/Gerente)
   - Cargo incompatível com departamento (ex: SDR no dept. Projetos)
   - Níveis hierárquicos pulados (Analista reportando direto ao CEO)

3. ✅ **Sugestões Inteligentes**
   - "Eduardo (Analista de Marketing) deveria reportar para o Head de Marketing, não para o CEO"
   - "Departamento Comercial tem 15 pessoas, sugerimos criar 2 Gerentes intermediários"
   - "Samuel (Coordenador Comercial) pode ser promovido a Head com base no time atual"

4. ✅ **Importação do Google Workspace**
   - Analisar campo `Manager Email` do Workspace
   - Mapear automaticamente linhas de reporte
   - Sincronizar mudanças de cargo/departamento

---

### **B. MOTOR DE REGRAS DE NEGÓCIO**

```typescript
// Regras de Validação Organizacional

interface OrgRule {
  id: string;
  severity: 'error' | 'warning' | 'info';
  check: (org: OrgStructure) => ValidationResult;
}

const ORG_RULES: OrgRule[] = [
  {
    id: 'R001',
    severity: 'error',
    check: (org) => {
      // Regra: CEO/COO (nível 1) não pode reportar para ninguém
      const cLevelWithManager = org.users
        .filter(u => u.nivel === 1 && u.manager_id !== null);
      
      return {
        valid: cLevelWithManager.length === 0,
        message: 'C-Level não deve ter superior hierárquico',
        affectedUsers: cLevelWithManager
      };
    }
  },
  {
    id: 'R002',
    severity: 'warning',
    check: (org) => {
      // Regra: Departamento com mais de 10 pessoas deve ter Gerente/Head
      const largeDepts = org.departments
        .filter(d => d.userCount > 10 && !d.hasHead && !d.hasManager);
      
      return {
        valid: largeDepts.length === 0,
        message: 'Departamentos grandes devem ter liderança definida',
        affectedDepts: largeDepts
      };
    }
  },
  {
    id: 'R003',
    severity: 'error',
    check: (org) => {
      // Regra: Nível hierárquico deve respeitar subordinação
      const invalidReporting = org.reportingLines
        .filter(line => line.subordinate.nivel <= line.manager.nivel);
      
      return {
        valid: invalidReporting.length === 0,
        message: 'Subordinado não pode ter nível igual ou superior ao gestor',
        affectedLines: invalidReporting
      };
    }
  },
  // ... +20 regras adicionais
];
```

---

## 🗄️ NOVAS TABELAS DO BANCO

### **1. org_suggestions** (Sugestões da IA)

```sql
CREATE TABLE org_suggestions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Tipo de sugestão
  type TEXT NOT NULL CHECK (type IN (
    'add_reporting_line',     -- Adicionar relação de subordinação
    'remove_reporting_line',  -- Remover relação
    'change_cargo',           -- Alterar cargo do usuário
    'change_department',      -- Alterar departamento
    'promote_user',           -- Promover usuário
    'create_position'         -- Criar novo cargo/posição
  )),
  
  -- Dados da sugestão
  affected_user_id UUID REFERENCES profiles(id),
  current_state JSONB,       -- Estado atual
  proposed_state JSONB,      -- Estado proposto
  
  -- Justificativa da IA
  reason TEXT NOT NULL,
  confidence_score FLOAT CHECK (confidence_score BETWEEN 0 AND 1),
  
  -- Aprovação
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  reviewed_by UUID REFERENCES profiles(id),
  reviewed_at TIMESTAMPTZ,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by_ai_version TEXT DEFAULT 'gemini-2.0-flash-exp'
);

CREATE INDEX idx_org_suggestions_status ON org_suggestions(status);
CREATE INDEX idx_org_suggestions_user ON org_suggestions(affected_user_id);
```

### **2. reporting_lines** (Linhas de Reporte)

```sql
CREATE TABLE reporting_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  subordinate_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  manager_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  
  -- Tipo de relação
  relationship_type TEXT DEFAULT 'direct' CHECK (relationship_type IN (
    'direct',      -- Reporta diretamente
    'dotted',      -- Reporta indiretamente (linha pontilhada)
    'functional'   -- Reporta funcionalmente (ex: projetos)
  )),
  
  -- Validação
  is_primary BOOLEAN DEFAULT TRUE,  -- Linha de reporte principal
  effective_from DATE DEFAULT CURRENT_DATE,
  effective_until DATE,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES profiles(id),
  
  -- Constraints
  UNIQUE(subordinate_id, manager_id, relationship_type),
  CHECK (subordinate_id != manager_id),  -- Ninguém reporta para si mesmo
  CHECK (effective_until IS NULL OR effective_until > effective_from)
);

CREATE INDEX idx_reporting_subordinate ON reporting_lines(subordinate_id);
CREATE INDEX idx_reporting_manager ON reporting_lines(manager_id);
CREATE INDEX idx_reporting_active ON reporting_lines(effective_until) 
  WHERE effective_until IS NULL;
```

### **3. org_change_log** (Auditoria de Mudanças)

```sql
CREATE TABLE org_change_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  change_type TEXT NOT NULL,
  affected_user_id UUID REFERENCES profiles(id),
  
  before_state JSONB,
  after_state JSONB,
  
  reason TEXT,
  applied_from_suggestion_id UUID REFERENCES org_suggestions(id),
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES profiles(id)
);

CREATE INDEX idx_org_log_user ON org_change_log(affected_user_id);
CREATE INDEX idx_org_log_date ON org_change_log(created_at DESC);
```

---

## ⚙️ RPCs (FUNCTIONS) NO POSTGRES

### **1. validate_org_structure()**

```sql
CREATE OR REPLACE FUNCTION validate_org_structure()
RETURNS TABLE (
  rule_id TEXT,
  severity TEXT,
  message TEXT,
  affected_count INT,
  details JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- R001: C-Level sem superior
  RETURN QUERY
  SELECT 
    'R001'::TEXT,
    'error'::TEXT,
    'C-Level não deve ter superior hierárquico'::TEXT,
    COUNT(*)::INT,
    jsonb_agg(jsonb_build_object('id', p.id, 'name', p.name))
  FROM profiles p
  INNER JOIN cargos c ON p.cargo = c.name
  INNER JOIN reporting_lines rl ON p.id = rl.subordinate_id
  WHERE c.level = 1
  GROUP BY 1,2,3
  HAVING COUNT(*) > 0;
  
  -- R002: Departamentos grandes sem liderança
  -- R003: Hierarquia invertida
  -- ... outras regras
  
END;
$$;
```

### **2. suggest_reporting_lines()**

```sql
CREATE OR REPLACE FUNCTION suggest_reporting_lines()
RETURNS TABLE (
  user_id UUID,
  user_name TEXT,
  suggested_manager_id UUID,
  suggested_manager_name TEXT,
  reason TEXT,
  confidence FLOAT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Lógica baseada em heurísticas:
  -- 1. Mesmo departamento
  -- 2. Nível hierárquico superior mais próximo
  -- 3. Menor distância na árvore organizacional
  
  RETURN QUERY
  WITH user_dept_leaders AS (
    SELECT 
      p.id as user_id,
      p.name as user_name,
      p.department,
      c.level as user_level,
      (
        SELECT p2.id 
        FROM profiles p2
        INNER JOIN cargos c2 ON p2.cargo = c2.name
        WHERE p2.department = p.department
          AND c2.level < c.level
          AND p2.is_active = TRUE
        ORDER BY c2.level DESC
        LIMIT 1
      ) as suggested_manager_id
    FROM profiles p
    INNER JOIN cargos c ON p.cargo = c.name
    WHERE p.is_active = TRUE
      AND c.level > 1  -- Não processar C-Level
      AND NOT EXISTS (
        SELECT 1 FROM reporting_lines rl 
        WHERE rl.subordinate_id = p.id 
        AND rl.is_primary = TRUE
      )
  )
  SELECT 
    udl.user_id,
    udl.user_name,
    udl.suggested_manager_id,
    (SELECT name FROM profiles WHERE id = udl.suggested_manager_id),
    CASE 
      WHEN suggested_manager_id IS NOT NULL 
      THEN 'Mesmo departamento, nível hierárquico imediatamente superior'
      ELSE 'Nenhum líder identificado no departamento'
    END as reason,
    CASE 
      WHEN suggested_manager_id IS NOT NULL THEN 0.85
      ELSE 0.0
    END as confidence
  FROM user_dept_leaders udl;
  
END;
$$;
```

### **3. batch_update_hierarchy()**

```sql
CREATE OR REPLACE FUNCTION batch_update_hierarchy(
  changes JSONB
)
RETURNS TABLE (
  success BOOLEAN,
  changes_applied INT,
  errors JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  change JSONB;
  applied_count INT := 0;
  error_list JSONB := '[]'::JSONB;
BEGIN
  -- Iterar sobre cada mudança
  FOR change IN SELECT * FROM jsonb_array_elements(changes)
  LOOP
    BEGIN
      -- Aplicar mudança baseado no tipo
      CASE change->>'type'
        WHEN 'add_reporting_line' THEN
          INSERT INTO reporting_lines (subordinate_id, manager_id, created_by)
          VALUES (
            (change->>'subordinate_id')::UUID,
            (change->>'manager_id')::UUID,
            auth.uid()
          );
          
        WHEN 'change_cargo' THEN
          UPDATE profiles 
          SET cargo = change->>'new_cargo',
              updated_at = NOW()
          WHERE id = (change->>'user_id')::UUID;
          
        -- ... outros tipos
      END CASE;
      
      -- Log da mudança
      INSERT INTO org_change_log (change_type, affected_user_id, after_state, created_by)
      VALUES (
        change->>'type',
        (change->>'user_id')::UUID,
        change,
        auth.uid()
      );
      
      applied_count := applied_count + 1;
      
    EXCEPTION WHEN OTHERS THEN
      error_list := error_list || jsonb_build_object(
        'change', change,
        'error', SQLERRM
      );
    END;
  END LOOP;
  
  RETURN QUERY SELECT TRUE, applied_count, error_list;
END;
$$;
```

---

## 🚀 EDGE FUNCTION: analyze-org-structure

```typescript
// supabase/functions/analyze-org-structure/index.ts

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");

interface OrgAnalysisRequest {
  includeInactive?: boolean;
  focusDepartment?: string;
  analysisType: 'full' | 'quick' | 'validation_only';
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { includeInactive = false, focusDepartment, analysisType = 'full' }: OrgAnalysisRequest = await req.json();

    // 1. Buscar dados do organograma
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: users } = await supabase
      .from("profiles")
      .select("id, name, email, cargo, department, role, is_active")
      .eq("is_active", includeInactive ? undefined : true);

    const { data: cargos } = await supabase
      .from("cargos")
      .select("name, level, is_active");

    const { data: reportingLines } = await supabase
      .from("reporting_lines")
      .select("*")
      .is("effective_until", null);

    // 2. Preparar contexto para a IA
    const orgContext = {
      totalUsers: users.length,
      users: users.map(u => ({
        id: u.id,
        name: u.name,
        cargo: u.cargo,
        department: u.department,
        nivel: cargos.find(c => c.name === u.cargo)?.level || 5
      })),
      reportingLines: reportingLines || [],
      hierarchy: cargos,
      departments: [...new Set(users.map(u => u.department).filter(Boolean))]
    };

    // 3. Prompt para Gemini
    const prompt = `
Você é um consultor de RH especializado em estrutura organizacional.

Analise a seguinte estrutura organizacional e identifique:

**DADOS DA ORGANIZAÇÃO:**
${JSON.stringify(orgContext, null, 2)}

**REGRAS DE VALIDAÇÃO:**
1. C-Level (nível 1): CEO, COO - Não reportam para ninguém
2. Diretoria (nível 2): Reportam para C-Level
3. Head (nível 3): Reportam para Diretoria ou C-Level
4. Gerência (nível 4): Reportam para Heads ou Diretoria
5. Operacional (nível 5): Reportam para Gerência ou Heads

**SUA TAREFA:**
1. **INCONSISTÊNCIAS:** Liste problemas hierárquicos (subordinado com nível >= gestor, C-Level com superior, etc)
2. **GAPS:** Identifique usuários sem linha de reporte definida
3. **SUGESTÕES:** Proponha linhas de reporte baseadas em departamento e nível
4. **OPORTUNIDADES:** Sugira melhorias (criar posições intermediárias, reestruturar departamentos, etc)

**FORMATO DE RESPOSTA (JSON):**
{
  "analysis": {
    "summary": "Resumo geral da estrutura",
    "healthScore": 0-100,
    "totalIssues": número
  },
  "inconsistencies": [
    {
      "severity": "error" | "warning",
      "type": "tipo_do_problema",
      "description": "Descrição clara",
      "affectedUsers": ["user_id1", "user_id2"],
      "recommendation": "Como corrigir"
    }
  ],
  "suggestions": [
    {
      "type": "add_reporting_line" | "change_cargo" | "promote_user",
      "userId": "uuid",
      "currentState": {...},
      "proposedState": {...},
      "reason": "Justificativa clara",
      "confidence": 0.0-1.0,
      "impact": "low" | "medium" | "high"
    }
  ],
  "opportunities": [
    {
      "title": "Título da oportunidade",
      "description": "Descrição detalhada",
      "expectedBenefit": "Benefício esperado",
      "effort": "low" | "medium" | "high"
    }
  ]
}
`;

    // 4. Chamar Gemini AI
    const geminiResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.3,  // Mais determinístico para análise
            responseMimeType: "application/json"
          }
        })
      }
    );

    if (!geminiResponse.ok) {
      throw new Error(`Gemini API error: ${geminiResponse.status}`);
    }

    const geminiData = await geminiResponse.json();
    const aiAnalysis = JSON.parse(
      geminiData.candidates[0].content.parts[0].text
    );

    // 5. Salvar sugestões no banco
    if (aiAnalysis.suggestions && aiAnalysis.suggestions.length > 0) {
      const suggestionsToInsert = aiAnalysis.suggestions.map((s: any) => ({
        type: s.type,
        affected_user_id: s.userId,
        current_state: s.currentState,
        proposed_state: s.proposedState,
        reason: s.reason,
        confidence_score: s.confidence,
        status: 'pending'
      }));

      await supabase.from("org_suggestions").insert(suggestionsToInsert);
    }

    // 6. Retornar análise completa
    return new Response(
      JSON.stringify({
        success: true,
        analysis: aiAnalysis,
        suggestionsCount: aiAnalysis.suggestions?.length || 0,
        timestamp: new Date().toISOString()
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      }
    );

  } catch (error) {
    console.error("Error in org analysis:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      }
    );
  }
});

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS"
};
```

---

## 🎨 COMPONENTE FRONTEND: AI Suggestions Panel

```typescript
// components/settings/OrgAISuggestionsPanel.tsx

import React, { useState, useEffect } from 'react';
import { supabase } from '../../services/supabaseClient';

interface Suggestion {
  id: string;
  type: string;
  affected_user_id: string;
  current_state: any;
  proposed_state: any;
  reason: string;
  confidence_score: number;
  status: 'pending' | 'approved' | 'rejected';
}

export const OrgAISuggestionsPanel: React.FC = () => {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<any>(null);

  // Buscar sugestões pendentes
  useEffect(() => {
    fetchSuggestions();
  }, []);

  const fetchSuggestions = async () => {
    const { data } = await supabase
      .from('org_suggestions')
      .select('*')
      .eq('status', 'pending')
      .order('confidence_score', { ascending: false });
    
    setSuggestions(data || []);
  };

  // Rodar análise da IA
  const runAnalysis = async () => {
    setAnalyzing(true);
    try {
      const response = await supabase.functions.invoke('analyze-org-structure', {
        body: { analysisType: 'full' }
      });
      
      setAnalysis(response.data.analysis);
      await fetchSuggestions();  // Atualizar sugestões
    } catch (error) {
      console.error('Analysis error:', error);
    } finally {
      setAnalyzing(false);
    }
  };

  // Aprovar sugestão
  const approveSuggestion = async (suggestionId: string) => {
    const suggestion = suggestions.find(s => s.id === suggestionId);
    if (!suggestion) return;

    // Aplicar mudança
    await supabase.functions.invoke('apply-org-changes', {
      body: { suggestionId }
    });

    // Atualizar status
    await supabase
      .from('org_suggestions')
      .update({ status: 'approved', reviewed_at: new Date().toISOString() })
      .eq('id', suggestionId);

    fetchSuggestions();
  };

  // Rejeitar sugestão
  const rejectSuggestion = async (suggestionId: string) => {
    await supabase
      .from('org_suggestions')
      .update({ status: 'rejected', reviewed_at: new Date().toISOString() })
      .eq('id', suggestionId);

    fetchSuggestions();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">🤖 Sugestões da IA</h2>
          <p className="text-sm text-slate-500">
            A IA analisou a estrutura organizacional e identificou oportunidades de melhoria
          </p>
        </div>
        <button
          onClick={runAnalysis}
          disabled={analyzing}
          className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
        >
          {analyzing ? '⏳ Analisando...' : '🔍 Rodar Análise'}
        </button>
      </div>

      {/* Health Score */}
      {analysis && (
        <div className="bg-gradient-to-r from-indigo-500 to-purple-600 rounded-xl p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold">Health Score da Organização</h3>
              <p className="text-sm opacity-90">{analysis.summary}</p>
            </div>
            <div className="text-5xl font-black">{analysis.healthScore}/100</div>
          </div>
        </div>
      )}

      {/* Sugestões Pendentes */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-slate-800">
          📋 Sugestões Pendentes ({suggestions.length})
        </h3>

        {suggestions.length === 0 ? (
          <div className="text-center py-12 bg-slate-50 rounded-xl">
            <p className="text-slate-500">
              ✅ Nenhuma sugestão pendente. Sua estrutura está ótima!
            </p>
          </div>
        ) : (
          suggestions.map(suggestion => (
            <div
              key={suggestion.id}
              className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`px-2 py-1 rounded text-xs font-semibold ${
                      suggestion.type === 'add_reporting_line' ? 'bg-blue-100 text-blue-800' :
                      suggestion.type === 'change_cargo' ? 'bg-purple-100 text-purple-800' :
                      suggestion.type === 'promote_user' ? 'bg-green-100 text-green-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {suggestion.type.replace(/_/g, ' ').toUpperCase()}
                    </span>
                    <span className="text-xs text-slate-500">
                      Confiança: {(suggestion.confidence_score * 100).toFixed(0)}%
                    </span>
                  </div>
                  <p className="text-slate-700 font-medium mb-2">{suggestion.reason}</p>
                  <div className="text-sm text-slate-500">
                    <span className="font-semibold">Mudança proposta:</span>
                    <pre className="mt-1 bg-slate-50 p-2 rounded text-xs">
                      {JSON.stringify(suggestion.proposed_state, null, 2)}
                    </pre>
                  </div>
                </div>
                
                <div className="flex gap-2 ml-4">
                  <button
                    onClick={() => approveSuggestion(suggestion.id)}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm font-medium"
                  >
                    ✅ Aprovar
                  </button>
                  <button
                    onClick={() => rejectSuggestion(suggestion.id)}
                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm font-medium"
                  >
                    ❌ Rejeitar
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default OrgAISuggestionsPanel;
```

---

## 📈 FLUXO DE TRABALHO

```
1. 🤖 ANÁLISE AUTOMÁTICA (Diária/Semanal via Cron)
   ↓
   Edge Function: analyze-org-structure
   ↓
   Gemini AI processa estrutura atual
   ↓
   Salva sugestões em org_suggestions
   
2. 👤 REVISÃO HUMANA
   ↓
   Admin acessa painel de sugestões
   ↓
   Revisa cada sugestão (contexto + confiança)
   ↓
   Aprova ✅ ou Rejeita ❌
   
3. ⚙️ APLICAÇÃO AUTOMÁTICA
   ↓
   Edge Function: apply-org-changes
   ↓
   batch_update_hierarchy() atualiza banco
   ↓
   org_change_log registra auditoria
   ↓
   Organograma atualizado em tempo real (Realtime Supabase)
```

---

## 🔐 SEGURANÇA E PERMISSÕES

- ✅ **RLS (Row Level Security)**: Apenas ADMINs/SUPER_ADMINs podem aprovar sugestões
- ✅ **Auditoria Completa**: Toda mudança é registrada em `org_change_log`
- ✅ **Rollback**: Possível reverter mudanças com base no histórico
- ✅ **Validação Dupla**: IA sugere + Humano aprova
- ✅ **Dry-Run Mode**: Testar mudanças antes de aplicar

---

## 💰 CUSTOS ESTIMADOS

### **Gemini API (gemini-2.0-flash-exp)**
- Análise completa: ~2.000 tokens (input) + ~1.500 tokens (output)
- Custo por análise: ~$0.002 USD
- 30 análises/mês: ~$0.06 USD

### **Supabase**
- Edge Functions: Grátis até 500k requisições/mês
- Database: Grátis no plano Pro (já utilizado)

**Total Mensal: < $0.10 USD** ✅ Extremamente viável

---

## 📅 CRONOGRAMA DE IMPLEMENTAÇÃO

### **Fase 1: Fundação (1 semana)**
- ✅ Criar tabelas (org_suggestions, reporting_lines, org_change_log)
- ✅ Implementar RPCs de validação
- ✅ Configurar Edge Function base

### **Fase 2: IA Integration (1 semana)**
- ✅ Integração com Gemini AI
- ✅ Prompt engineering e testes
- ✅ Salvamento de sugestões no banco

### **Fase 3: Frontend (3 dias)**
- ✅ Painel de sugestões
- ✅ Aprovação/Rejeição com preview
- ✅ Integração com organograma existente

### **Fase 4: Automação (2 dias)**
- ✅ Cron job para análise semanal
- ✅ Notificações para ADMINs
- ✅ Dashboard de health score

**TOTAL: ~2.5 semanas para MVP completo**

---

## 🎯 RESULTADO ESPERADO

**Antes:**
- ❌ Estrutura organizacional desatualizada
- ❌ Inconsistências hierárquicas não detectadas
- ❌ Gestão manual e propensa a erros
- ❌ Sem visibilidade de problemas estruturais

**Depois:**
- ✅ Análise automática semanal da estrutura
- ✅ Detecção proativa de inconsistências
- ✅ Sugestões inteligentes de melhoria
- ✅ Auditoria completa de mudanças
- ✅ Health Score da organização
- ✅ Aprovação humana antes de aplicar

---

## 🚀 PRÓXIMOS PASSOS

1. **Aprovar arquitetura** ✋ (você decide)
2. **Criar branch feature/ai-org-structure**
3. **Implementar Fase 1** (tabelas + RPCs)
4. **Implementar Fase 2** (Edge Function + IA)
5. **Implementar Fase 3** (Frontend)
6. **Testes e Ajustes**
7. **Deploy em Produção**

---

**Pronto para começar?** 🚀

