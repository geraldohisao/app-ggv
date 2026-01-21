// supabase/functions/analyze-org-structure/index.ts
// Edge Function para análise automática da estrutura organizacional com IA

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS"
};

interface OrgAnalysisRequest {
  queueId?: string;  // Se vier da fila
  includeInactive?: boolean;
  focusDepartment?: string;
  analysisType?: 'full' | 'quick' | 'validation_only';
  batchSize?: number;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const startTime = Date.now();
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

  try {
    const body: OrgAnalysisRequest = req.method === "POST" 
      ? await req.json() 
      : {};

    const { 
      queueId,
      includeInactive = false, 
      focusDepartment, 
      analysisType = 'full',
      batchSize = 10 
    } = body;

    console.log('🤖 [ORG-AI] Iniciando análise organizacional', { 
      queueId, analysisType, focusDepartment 
    });

    // ========================================
    // MODO 1: Processar fila de análises
    // ========================================
    if (!queueId) {
      // Buscar próximas análises da fila
      const { data: queueItems, error: queueError } = await supabase
        .rpc('process_analysis_queue', { batch_size: batchSize });

      if (queueError) {
        console.error('❌ Erro ao buscar fila:', queueError);
        throw queueError;
      }

      if (!queueItems || queueItems.length === 0) {
        return new Response(
          JSON.stringify({ 
            message: 'Nenhuma análise pendente na fila',
            queueStats: await getQueueStats(supabase)
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      console.log(`📋 [ORG-AI] Processando ${queueItems.length} análises da fila`);

      // Processar cada item da fila
      const results = [];
      for (const item of queueItems) {
        try {
          const result = await analyzeOrgStructure(supabase, {
            includeInactive,
            focusDepartment,
            analysisType,
            triggerContext: item.change_details
          });

          results.push({
            queueId: item.queue_id,
            success: true,
            ...result
          });

          // Marcar como concluído
          await supabase.rpc('mark_analysis_completed', {
            p_queue_id: item.queue_id,
            p_success: true,
            p_duration_ms: Date.now() - startTime
          });

        } catch (error) {
          console.error(`❌ Erro ao processar queue_id ${item.queue_id}:`, error);
          
          results.push({
            queueId: item.queue_id,
            success: false,
            error: error.message
          });

          await supabase.rpc('mark_analysis_completed', {
            p_queue_id: item.queue_id,
            p_success: false,
            p_error_message: error.message,
            p_duration_ms: Date.now() - startTime
          });
        }
      }

      return new Response(
        JSON.stringify({
          success: true,
          processedCount: results.length,
          results,
          duration: Date.now() - startTime
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ========================================
    // MODO 2: Análise direta (manual)
    // ========================================
    const result = await analyzeOrgStructure(supabase, {
      includeInactive,
      focusDepartment,
      analysisType
    });

    return new Response(
      JSON.stringify({
        success: true,
        ...result,
        duration: Date.now() - startTime
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("❌ [ORG-AI] Erro geral:", error);
    
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error.message,
        stack: error.stack
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      }
    );
  }
});

// ========================================
// FUNÇÃO PRINCIPAL: Análise Organizacional
// ========================================

async function analyzeOrgStructure(
  supabase: any,
  options: {
    includeInactive?: boolean;
    focusDepartment?: string;
    analysisType?: string;
    triggerContext?: any;
  }
) {
  const { includeInactive, focusDepartment, analysisType, triggerContext } = options;

  // 1. Buscar dados da estrutura organizacional
  console.log('📊 [ORG-AI] Buscando dados organizacionais...');
  
  let userQuery = supabase
    .from("profiles")
    .select("id, name, email, cargo, department, role, is_active");

  if (!includeInactive) {
    userQuery = userQuery.eq("is_active", true);
  }

  if (focusDepartment) {
    userQuery = userQuery.eq("department", focusDepartment);
  }

  const [
    { data: users, error: usersError },
    { data: cargos, error: cargosError },
    { data: reportingLines, error: rlError },
    { data: departments, error: deptsError }
  ] = await Promise.all([
    userQuery,
    supabase.from("cargos").select("name, level, is_active").eq("is_active", true),
    supabase.from("reporting_lines").select("*").is("effective_until", null),
    supabase.from("departments").select("*").eq("is_active", true)
  ]);

  if (usersError || cargosError || rlError || deptsError) {
    throw new Error(`Database error: ${usersError || cargosError || rlError || deptsError}`);
  }

  // 2. Executar validações básicas via RPC
  console.log('🔍 [ORG-AI] Executando validações...');
  
  const { data: validationResults, error: validationError } = await supabase
    .rpc('validate_org_structure');

  if (validationError) {
    console.warn('⚠️ Erro na validação:', validationError);
  }

  // 3. Preparar contexto para a IA
  const orgContext = {
    totalUsers: users?.length || 0,
    users: (users || []).map((u: any) => ({
      id: u.id,
      name: u.name,
      cargo: u.cargo,
      department: u.department,
      nivel: cargos?.find((c: any) => c.name === u.cargo)?.level || 5,
      hasManager: (reportingLines || []).some((rl: any) => rl.subordinate_id === u.id)
    })),
    reportingLines: reportingLines || [],
    hierarchy: cargos || [],
    departments: departments?.map((d: any) => d.name) || [],
    validationIssues: validationResults || [],
    triggerContext: triggerContext || null
  };

  console.log(`📈 [ORG-AI] Contexto preparado: ${orgContext.totalUsers} usuários, ${orgContext.departments.length} departamentos`);

  // 4. Se for apenas validação, retornar sem chamar IA
  if (analysisType === 'validation_only') {
    return {
      analysis: {
        summary: 'Validação executada sem IA',
        healthScore: calculateHealthScore(validationResults || []),
        totalIssues: validationResults?.length || 0
      },
      inconsistencies: validationResults || [],
      suggestions: [],
      opportunities: []
    };
  }

  // 5. Chamar Gemini AI
  console.log('🧠 [ORG-AI] Chamando Gemini AI...');
  
  if (!GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY não configurado');
  }

  const prompt = buildAnalysisPrompt(orgContext, analysisType === 'quick');

  const geminiResponse = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${GEMINI_API_KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.2,  // Mais determinístico
          responseMimeType: "application/json"
        }
      })
    }
  );

  if (!geminiResponse.ok) {
    const errorText = await geminiResponse.text();
    throw new Error(`Gemini API error ${geminiResponse.status}: ${errorText}`);
  }

  const geminiData = await geminiResponse.json();
  
  if (!geminiData.candidates?.[0]?.content?.parts?.[0]?.text) {
    throw new Error('Resposta inválida da Gemini AI');
  }

  const aiAnalysis = JSON.parse(geminiData.candidates[0].content.parts[0].text);

  console.log(`✅ [ORG-AI] Análise concluída: ${aiAnalysis.suggestions?.length || 0} sugestões geradas`);

  // 6. Salvar sugestões no banco
  if (aiAnalysis.suggestions && aiAnalysis.suggestions.length > 0) {
    const suggestionsToInsert = aiAnalysis.suggestions
      .filter((s: any) => s.confidence >= 0.6)  // Só sugestões com confiança >= 60%
      .map((s: any) => ({
        type: s.type,
        affected_user_id: s.userId,
        current_state: s.currentState || {},
        proposed_state: s.proposedState || {},
        reason: s.reason,
        confidence_score: s.confidence,
        impact_level: s.impact || 'medium',
        status: 'pending',
        analysis_context: {
          trigger: triggerContext,
          analysisType,
          timestamp: new Date().toISOString()
        }
      }));

    if (suggestionsToInsert.length > 0) {
      const { error: insertError } = await supabase
        .from("org_suggestions")
        .insert(suggestionsToInsert);

      if (insertError) {
        console.error('⚠️ Erro ao salvar sugestões:', insertError);
      } else {
        console.log(`💾 [ORG-AI] ${suggestionsToInsert.length} sugestões salvas no banco`);
      }
    }
  }

  return {
    analysis: aiAnalysis.analysis || {},
    inconsistencies: aiAnalysis.inconsistencies || [],
    suggestions: aiAnalysis.suggestions || [],
    opportunities: aiAnalysis.opportunities || [],
    suggestionsCount: aiAnalysis.suggestions?.length || 0
  };
}

// ========================================
// HELPERS
// ========================================

function buildAnalysisPrompt(orgContext: any, isQuick: boolean): string {
  const basePrompt = `
Você é um consultor de RH especializado em estrutura organizacional.

**DADOS DA ORGANIZAÇÃO:**
${JSON.stringify(orgContext, null, 2)}

**REGRAS HIERÁRQUICAS:**
1. C-Level (nível 1): CEO, COO, Sócios - Não reportam para ninguém
2. Diretoria (nível 2): Reportam para C-Level
3. Head (nível 3): Reportam para Diretoria ou C-Level
4. Gerência (nível 4): Reportam para Heads ou Diretoria
5. Operacional (nível 5): Reportam para Gerência ou Heads

**SUA TAREFA:**
${isQuick ? '(ANÁLISE RÁPIDA - Foque apenas nos problemas críticos)' : '(ANÁLISE COMPLETA)'}

1. **INCONSISTÊNCIAS:** Liste problemas hierárquicos detectados
2. **SUGESTÕES:** Proponha correções específicas e acionáveis
3. **OPORTUNIDADES:** Identifique melhorias estratégicas

**FORMATO DE RESPOSTA (JSON):**
{
  "analysis": {
    "summary": "Resumo executivo em 1-2 frases",
    "healthScore": 0-100,
    "totalIssues": número,
    "criticalIssues": número
  },
  "inconsistencies": [
    {
      "severity": "error" | "warning" | "info",
      "type": "tipo_do_problema",
      "description": "Descrição clara e objetiva",
      "affectedUsers": ["user_id"],
      "recommendation": "Como corrigir"
    }
  ],
  "suggestions": [
    {
      "type": "add_reporting_line" | "change_cargo" | "change_department" | "promote_user",
      "userId": "uuid",
      "currentState": {...},
      "proposedState": {...},
      "reason": "Justificativa clara com dados",
      "confidence": 0.0-1.0,
      "impact": "low" | "medium" | "high"
    }
  ],
  "opportunities": [
    {
      "title": "Título curto",
      "description": "Descrição do benefício",
      "effort": "low" | "medium" | "high"
    }
  ]
}

**IMPORTANTE:**
- Seja específico e acionável
- Justifique com dados do contexto
- Priorize sugestões de alto impacto e alta confiança
- Retorne apenas JSON válido
`;

  return basePrompt.trim();
}

function calculateHealthScore(issues: any[]): number {
  if (!issues || issues.length === 0) return 100;
  
  const errorCount = issues.filter((i: any) => i.severity === 'error').length;
  const warningCount = issues.filter((i: any) => i.severity === 'warning').length;
  
  // Fórmula: 100 - (errors * 15) - (warnings * 5)
  const score = Math.max(0, 100 - (errorCount * 15) - (warningCount * 5));
  
  return Math.round(score);
}

async function getQueueStats(supabase: any) {
  const { data } = await supabase
    .from('v_analysis_queue_stats')
    .select('*')
    .single();
  
  return data || {};
}

