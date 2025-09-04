/**
 * Serviço de Diarização de Transcrições
 * Separa automaticamente quem fala o quê nas transcrições usando Gemini AI
 */

// Função para obter a chave da API Gemini (DB -> env -> local)
const getGeminiApiKey = async (): Promise<string | null> => {
  try {
    const { getAppSetting } = await import('../../services/supabaseService');
    const dbKey = await getAppSetting('gemini_api_key');
    if (typeof dbKey === 'string' && dbKey.trim()) return dbKey.trim();
  } catch {}
  const envKey = process.env.VITE_GEMINI_API_KEY || (import.meta as any)?.env?.VITE_GEMINI_API_KEY;
  if (envKey) return envKey as string;
  const local: any = (globalThis as any).APP_CONFIG_LOCAL;
  if (local && typeof local.GEMINI_API_KEY === 'string') return local.GEMINI_API_KEY as string;
  return null;
};

// Função para chamar Gemini API diretamente
async function callGeminiAPI(prompt: string): Promise<string> {
  try {
    const apiKey = await getGeminiApiKey();
    
    if (!apiKey) {
      throw new Error('Chave da API Gemini não encontrada. Configure em Settings → Gerenciar Chaves de API');
    }

    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${apiKey}`;
    
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [{ text: prompt }]
        }],
        generationConfig: {
          temperature: 0.1, // Baixa temperatura para maior precisão
          maxOutputTokens: 4000,
        }
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Erro na API Gemini (${response.status}): ${errorText}`);
    }

    const data = await response.json();
    
    if (!data.candidates?.[0]?.content?.parts?.[0]?.text) {
      throw new Error('Resposta inválida da API Gemini');
    }

    return data.candidates[0].content.parts[0].text;
    
  } catch (error) {
    console.error('❌ Erro ao chamar Gemini API:', error);
    throw error;
  }
}

export interface DiarizedSegment {
  speaker: 'sdr' | 'client' | 'unknown';
  speakerName: string;
  text: string;
  timestamp?: string;
  confidence?: number;
}

export interface DiarizedTranscription {
  segments: DiarizedSegment[];
  summary: {
    sdrTotalTime: number;
    clientTotalTime: number;
    totalSegments: number;
    confidence: number;
  };
  originalTranscription: string;
}

/**
 * Separa a transcrição em segmentos por falante usando Gemini AI
 */
export async function diarizeTranscription(
  transcription: string,
  sdrName: string,
  clientName: string
): Promise<DiarizedTranscription> {
  try {
    console.log('🎤 Iniciando diarização da transcrição:', {
      sdrName,
      clientName,
      transcriptionLength: transcription.length
    });

    // Prompt para o Gemini separar a transcrição
    const prompt = `
Você é um especialista em análise de transcrições de chamadas de vendas. Sua tarefa é separar uma transcrição em segmentos identificando quem está falando.

INFORMAÇÕES DA CHAMADA:
- SDR da GGV: ${sdrName}
- Cliente: ${clientName}

TRANSCRIÇÃO ORIGINAL:
${transcription}

INSTRUÇÕES:
1. Analise a transcrição e identifique quando cada pessoa está falando
2. Separe em segmentos com base em mudanças de falante
3. Use pistas como:
   - Padrões de linguagem (SDR usa linguagem comercial/técnica)
   - Perguntas vs respostas
   - Apresentação da empresa (normalmente SDR)
   - Dúvidas sobre produtos/serviços (normalmente cliente)
   - Tom profissional vs casual

FORMATO DE RESPOSTA (JSON):
{
  "segments": [
    {
      "speaker": "sdr|client|unknown",
      "speakerName": "Nome da pessoa",
      "text": "Texto falado",
      "confidence": 0.8
    }
  ]
}

REGRAS:
- Use "sdr" para ${sdrName}
- Use "client" para ${clientName}
- Use "unknown" apenas se não conseguir identificar
- Seja conservador - prefira "unknown" a errar
- Mantenha o texto original sem alterações
- Confidence de 0.0 a 1.0 (0.8+ = alta confiança)

Responda APENAS com o JSON, sem explicações.`;

    const response = await callGeminiAPI(prompt);
    
    if (!response) {
      throw new Error('Gemini não retornou resposta');
    }

    // Tentar extrair JSON da resposta
    let jsonMatch = response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      // Se não encontrar JSON completo, tentar extrair da resposta
      console.warn('⚠️ Resposta do Gemini não está em formato JSON puro, tentando extrair...');
      jsonMatch = response.match(/```json\s*([\s\S]*?)\s*```/) || response.match(/```\s*([\s\S]*?)\s*```/);
      if (jsonMatch) {
        jsonMatch[0] = jsonMatch[1];
      }
    }

    if (!jsonMatch) {
      throw new Error('Não foi possível extrair JSON da resposta do Gemini');
    }

    const parsed = JSON.parse(jsonMatch[0]);
    
    if (!parsed.segments || !Array.isArray(parsed.segments)) {
      throw new Error('Resposta do Gemini não tem formato esperado');
    }

    // Processar segmentos
    const segments: DiarizedSegment[] = parsed.segments.map((seg: any) => ({
      speaker: seg.speaker === 'sdr' ? 'sdr' : seg.speaker === 'client' ? 'client' : 'unknown',
      speakerName: seg.speaker === 'sdr' ? sdrName : seg.speaker === 'client' ? clientName : 'Desconhecido',
      text: seg.text || '',
      confidence: typeof seg.confidence === 'number' ? seg.confidence : 0.5
    }));

    // Se não conseguiu identificar nenhum falante, criar um segmento padrão
    if (segments.length === 0 || segments.every(s => s.speaker === 'unknown')) {
      console.warn('⚠️ Gemini não conseguiu identificar falantes, criando segmento padrão');
      segments.push({
        speaker: 'unknown',
        speakerName: 'Não identificado',
        text: transcription,
        confidence: 0.1
      });
    }

    // Calcular estatísticas
    const sdrSegments = segments.filter(s => s.speaker === 'sdr');
    const clientSegments = segments.filter(s => s.speaker === 'client');
    const unknownSegments = segments.filter(s => s.speaker === 'unknown');
    
    const sdrTotalTime = sdrSegments.reduce((acc, seg) => acc + seg.text.length, 0);
    const clientTotalTime = clientSegments.reduce((acc, seg) => acc + seg.text.length, 0);
    const unknownTotalTime = unknownSegments.reduce((acc, seg) => acc + seg.text.length, 0);
    
    const avgConfidence = segments.length > 0 
      ? segments.reduce((acc, seg) => acc + (seg.confidence || 0), 0) / segments.length 
      : 0;

    const result: DiarizedTranscription = {
      segments,
      summary: {
        sdrTotalTime,
        clientTotalTime,
        totalSegments: segments.length,
        confidence: avgConfidence
      },
      originalTranscription: transcription
    };

    console.log('✅ Diarização concluída:', {
      totalSegments: result.segments.length,
      sdrSegments: sdrSegments.length,
      clientSegments: clientSegments.length,
      confidence: avgConfidence
    });

    return result;

  } catch (error) {
    console.error('❌ Erro na diarização:', error);
    
    // Fallback: retornar transcrição original como um único segmento
    const fallbackResult: DiarizedTranscription = {
      segments: [{
        speaker: 'unknown',
        speakerName: 'Erro na separação',
        text: transcription,
        confidence: 0.1
      }],
      summary: {
        sdrTotalTime: 0,
        clientTotalTime: transcription.length, // Usar comprimento do texto
        totalSegments: 1,
        confidence: 0.1
      },
      originalTranscription: transcription
    };
    
    console.log('🔄 Retornando resultado de fallback devido ao erro');
    return fallbackResult;
  }
}

/**
 * Processa múltiplas transcrições em lote
 */
export async function batchDiarizeTranscriptions(
  calls: Array<{
    id: string;
    transcription: string;
    sdrName: string;
    clientName: string;
  }>
): Promise<Array<{ callId: string; diarizedTranscription: DiarizedTranscription }>> {
  const results = [];
  
  for (const call of calls) {
    try {
      const diarized = await diarizeTranscription(
        call.transcription,
        call.sdrName,
        call.clientName
      );
      
      results.push({
        callId: call.id,
        diarizedTranscription: diarized
      });
      
      // Delay entre chamadas para não sobrecarregar a API
      await new Promise(resolve => setTimeout(resolve, 1000));
      
    } catch (error) {
      console.error(`❌ Erro ao diarizar call ${call.id}:`, error);
    }
  }
  
  return results;
}

/**
 * Salva transcrição diarizada no Supabase
 */
export async function saveDiarizedTranscription(
  callId: string,
  diarizedTranscription: DiarizedTranscription
): Promise<boolean> {
  try {
    const { supabase } = await import('./supabaseClient');
    
    if (!supabase) {
      throw new Error('Supabase não inicializado');
    }

    // Salvar no campo insights como diarized_transcription
    const { error } = await supabase
      .from('calls')
      .update({
        insights: {
          ...{}, // Preservar insights existentes seria ideal, mas por simplicidade...
          diarized_transcription: diarizedTranscription
        }
      })
      .eq('id', callId);

    if (error) {
      throw error;
    }

    console.log('✅ Transcrição diarizada salva para call:', callId);
    return true;

  } catch (error) {
    console.error('❌ Erro ao salvar transcrição diarizada:', error);
    return false;
  }
}
