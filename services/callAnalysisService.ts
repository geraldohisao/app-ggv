import { supabase } from './supabaseClient';

export interface ScorecardCriterion {
  id: string;
  category: string;
  text: string;
  weight: number;
  order_index: number;
}

export interface Scorecard {
  id: string;
  name: string;
  description: string;
  criteria: ScorecardCriterion[];
}

export interface CallAnalysisResult {
  finalScore: number;
  analysis: {
    summary: string;
    strengths: string[];
    improvements: string[];
    recommendations: string[];
  };
  criteria: Array<{
    id: string;
    score: number;
    justification: string;
  }>;
}

export interface CallAnalysisRequest {
  callId: string;
  transcription: string;
  callType?: string;
  duration?: number;
}

// Buscar scorecard por tipo de call
export async function getScorecardByCallType(callType: string): Promise<Scorecard | null> {
  if (!supabase) {
    console.log('⚠️ Supabase não inicializado');
    return null;
  }

  try {
    console.log('🔍 Buscando scorecard para tipo:', callType);
    
    const { data, error } = await supabase.rpc('get_scorecard_by_call_type', {
      p_call_type: callType
    });

    if (error) {
      console.error('❌ Erro ao buscar scorecard:', error);
      return null;
    }

    if (data && data.length > 0) {
      const scorecard = data[0];
      console.log('✅ Scorecard encontrado:', scorecard);
      return {
        id: scorecard.id,
        name: scorecard.name,
        description: scorecard.description,
        criteria: scorecard.criteria || []
      };
    }

    console.log('⚠️ Nenhum scorecard encontrado para tipo:', callType);
    return null;

  } catch (error) {
    console.error('❌ Erro geral ao buscar scorecard:', error);
    return null;
  }
}

// Analisar call com IA
export async function analyzeCallWithAI(request: CallAnalysisRequest): Promise<CallAnalysisResult | null> {
  try {
    console.log('🤖 Iniciando análise IA da call:', request.callId);
    
    // 1. Buscar scorecard apropriado
    const callType = request.callType || 'consultoria_vendas';
    const scorecard = await getScorecardByCallType(callType);
    
    if (!scorecard || !scorecard.criteria.length) {
      console.error('❌ Scorecard não encontrado ou sem critérios');
      return null;
    }

    console.log('📋 Scorecard carregado:', scorecard.name);
    console.log('📋 Critérios:', scorecard.criteria.length);

    // 2. Preparar prompt para IA
    const prompt = buildAnalysisPrompt(request.transcription, scorecard, request.duration);
    
    console.log('📝 Prompt preparado, chamando IA...');

    // 3. Chamar Gemini API
    const aiResponse = await callGeminiAPILocal(prompt);
    
    if (!aiResponse) {
      console.error('❌ Erro na resposta da IA');
      return null;
    }

    console.log('✅ Resposta da IA recebida');

    // 4. Processar resposta da IA
    const analysisResult = parseAIResponse(aiResponse, scorecard.criteria);
    
    if (!analysisResult) {
      console.error('❌ Erro ao processar resposta da IA');
      return null;
    }

    console.log('✅ Análise processada com sucesso');
    return analysisResult;

  } catch (error) {
    console.error('❌ Erro geral na análise IA:', error);
    return null;
  }
}

// Salvar análise no Supabase
export async function saveCallAnalysis(callId: string, analysis: CallAnalysisResult): Promise<boolean> {
  if (!supabase) {
    console.log('⚠️ Supabase não inicializado');
    return false;
  }

  try {
    console.log('💾 Salvando análise da call:', callId);
    
    const { data, error } = await supabase.rpc('save_call_analysis', {
      p_call_id: callId,
      p_final_score: analysis.finalScore,
      p_analysis: {
        summary: analysis.analysis.summary,
        strengths: analysis.analysis.strengths,
        improvements: analysis.analysis.improvements,
        recommendations: analysis.analysis.recommendations
      },
      p_criteria_scores: analysis.criteria
    });

    if (error) {
      console.error('❌ Erro ao salvar análise:', error);
      return false;
    }

    console.log('✅ Análise salva com sucesso');
    return true;

  } catch (error) {
    console.error('❌ Erro geral ao salvar análise:', error);
    return false;
  }
}

// Buscar análise completa de uma call
export async function getCallAnalysis(callId: string) {
  if (!supabase) {
    console.log('⚠️ Supabase não inicializado');
    return null;
  }

  try {
    console.log('🔍 Buscando análise da call:', callId);
    
    const { data, error } = await supabase.rpc('get_call_analysis', {
      p_call_id: callId
    });

    if (error) {
      console.error('❌ Erro ao buscar análise:', error);
      return null;
    }

    if (data && data.length > 0) {
      console.log('✅ Análise encontrada');
      return data[0];
    }

    console.log('⚠️ Nenhuma análise encontrada');
    return null;

  } catch (error) {
    console.error('❌ Erro geral ao buscar análise:', error);
    return null;
  }
}

// Função auxiliar para construir o prompt da IA
function buildAnalysisPrompt(transcription: string, scorecard: Scorecard, duration?: number): string {
  const criteriaText = scorecard.criteria
    .map((c, index) => `${index + 1}. ${c.category}: ${c.text} (peso: ${c.weight})`)
    .join('\n');

  const durationText = duration ? `\nDuração da ligação: ${Math.round(duration / 60)} minutos` : '';

  return `Você é um especialista em vendas e análise de ligações comerciais. Sua tarefa é analisar uma transcrição de ligação e avaliá-la segundo os critérios fornecidos.

**TRANSCRIÇÃO DA LIGAÇÃO:**
${transcription}${durationText}

**CRITÉRIOS DE AVALIAÇÃO:**
${criteriaText}

**INSTRUÇÕES:**
1. Analise cada critério individualmente
2. Atribua uma nota de 0 a 10 para cada critério
3. Justifique cada nota com base na transcrição
4. Calcule a nota final ponderada
5. Forneça um resumo geral da ligação

**FORMATO DE RESPOSTA (JSON):**
{
  "finalScore": 75,
  "analysis": {
    "summary": "Resumo geral da qualidade da ligação",
    "strengths": ["Ponto forte 1", "Ponto forte 2"],
    "improvements": ["Melhoria 1", "Melhoria 2"],
    "recommendations": ["Recomendação 1", "Recomendação 2"]
  },
  "criteria": [
    {
      "id": "criterion_id_1",
      "score": 8,
      "justification": "Justificativa detalhada da nota"
    }
  ]
}

**IMPORTANTE:**
- Seja objetivo e baseado apenas na transcrição
- Justifique cada nota com exemplos específicos
- A nota final deve ser calculada considerando os pesos dos critérios
- Forneça insights acionáveis para melhorias

Responda APENAS com o JSON válido, sem texto adicional.`;
}

// Função auxiliar para processar resposta da IA
function parseAIResponse(aiResponse: string, criteria: ScorecardCriterion[]): CallAnalysisResult | null {
  try {
    // Tentar extrair JSON da resposta
    const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error('❌ JSON não encontrado na resposta da IA');
      return null;
    }

    const parsed = JSON.parse(jsonMatch[0]);
    
    // Validar estrutura
    if (!parsed.finalScore || !parsed.analysis || !parsed.criteria) {
      console.error('❌ Estrutura JSON inválida');
      return null;
    }

    // Mapear critérios com IDs corretos
    const mappedCriteria = parsed.criteria.map((criterion: any, index: number) => ({
      id: criteria[index]?.id || `criterion_${index}`,
      score: Math.max(0, Math.min(10, criterion.score || 0)),
      justification: criterion.justification || 'Sem justificativa'
    }));

    return {
      finalScore: Math.max(0, Math.min(100, parsed.finalScore || 0)),
      analysis: {
        summary: parsed.analysis.summary || 'Análise não disponível',
        strengths: Array.isArray(parsed.analysis.strengths) ? parsed.analysis.strengths : [],
        improvements: Array.isArray(parsed.analysis.improvements) ? parsed.analysis.improvements : [],
        recommendations: Array.isArray(parsed.analysis.recommendations) ? parsed.analysis.recommendations : []
      },
      criteria: mappedCriteria
    };

  } catch (error) {
    console.error('❌ Erro ao processar resposta da IA:', error);
    return null;
  }
}

// Função para sincronizar deal com empresa
export async function syncDealCompany(
  dealId: string, 
  companyName: string, 
  companyEmail?: string, 
  companyPhone?: string
): Promise<boolean> {
  if (!supabase) {
    console.log('⚠️ Supabase não inicializado');
    return false;
  }

  try {
    console.log('🔄 Sincronizando deal:', dealId, 'com empresa:', companyName);
    
    const { data, error } = await supabase.rpc('sync_deal_company', {
      p_deal_id: dealId,
      p_company_name: companyName,
      p_company_email: companyEmail || null,
      p_company_phone: companyPhone || null
    });

    if (error) {
      console.error('❌ Erro ao sincronizar deal:', error);
      return false;
    }

    console.log('✅ Deal sincronizado com sucesso');
    return true;

  } catch (error) {
    console.error('❌ Erro geral ao sincronizar deal:', error);
    return false;
  }
}

// Função para buscar empresa por deal_id
export async function getCompanyByDealId(dealId: string) {
  if (!supabase) {
    console.log('⚠️ Supabase não inicializado');
    return null;
  }

  try {
    const { data, error } = await supabase
      .from('companies')
      .select('*')
      .eq('deal_id', dealId)
      .single();

    if (error) {
      console.error('❌ Erro ao buscar empresa:', error);
      return null;
    }

    return data;

     } catch (error) {
     console.error('❌ Erro geral ao buscar empresa:', error);
     return null;
   }
 }

// Função local para chamar Gemini API
async function callGeminiAPILocal(prompt: string): Promise<string | null> {
  try {
    // Obter chave da API do Supabase
    const { data: config } = await supabase
      .from('app_settings')
      .select('value')
      .eq('key', 'GEMINI_API_KEY')
      .single();

    const apiKey = config?.value;
    if (!apiKey) {
      console.error('❌ Chave da API Gemini não configurada');
      return null;
    }

    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${apiKey}`;
    
    const body = {
      contents: [
        {
          role: 'user',
          parts: [{ text: prompt }]
        }
      ],
      generationConfig: {
        temperature: 0.3,
        topK: 40,
        topP: 0.8,
        maxOutputTokens: 2048,
      },
      safetySettings: [
        { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
        { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
        { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
        { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' }
      ]
    };

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      throw new Error(`Erro na API Gemini: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    const text = data?.candidates?.[0]?.content?.parts?.map((p: any) => p?.text).filter(Boolean).join(' ');
    return text || null;

  } catch (error) {
    console.error('❌ Erro ao chamar Gemini API:', error);
    return null;
  }
}
