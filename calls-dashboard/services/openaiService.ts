/**
 * Serviço OpenAI para Análise de Chamadas
 * Integração com GPT-4o-mini para análise de scorecards
 */

import { supabase } from '../../services/supabaseClient';

// Função para obter chave da API OpenAI (DB -> env -> local)
export const getOpenAIApiKey = async (): Promise<string | null> => {
  try {
    // 1) Banco (app_settings.openai_api_key)
    const { getAppSetting } = await import('../../services/supabaseService');
    const dbKey = await getAppSetting('openai_api_key');
    if (typeof dbKey === 'string' && dbKey.trim()) return dbKey.trim();
  } catch (error) {
    console.warn('⚠️ Erro ao buscar chave OpenAI do banco:', error);
  }

  // 2) Variáveis de ambiente do bundle
  const envKey = process.env.VITE_OPENAI_API_KEY || 
                 process.env.OPENAI_API_KEY || 
                 (import.meta as any)?.env?.VITE_OPENAI_API_KEY;
  if (envKey) return envKey as string;

  // 3) Config local (fallback de desenvolvimento)
  const local: any = (globalThis as any).APP_CONFIG_LOCAL;
  if (local && typeof local.OPENAI_API_KEY === 'string') return local.OPENAI_API_KEY as string;

  return null;
};

// Função para obter modelo OpenAI configurado
export const getOpenAIModel = async (): Promise<string> => {
  try {
    const { getAppSetting } = await import('../../services/supabaseService');
    const model = await getAppSetting('openai_model');
    if (typeof model === 'string' && model.trim()) return model.trim();
  } catch {}

  // Fallback: gpt-4o-mini (rápido e econômico)
  return 'gpt-4o-mini';
};

/**
 * Chama API da OpenAI para análise
 */
export async function callOpenAI(prompt: string): Promise<string> {
  console.log('🤖 Chamando OpenAI GPT...');

  const apiKey = await getOpenAIApiKey();
  if (!apiKey || !apiKey.trim()) {
    throw new Error('Chave da API OpenAI não configurada. Configure em app_settings.');
  }

  const model = await getOpenAIModel();
  console.log(`🤖 Usando modelo: ${model}`);

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: model,
        messages: [
          { 
            role: 'system', 
            content: 'Você é um especialista em análise de vendas B2B com 15+ anos de experiência. Analise transcrições de chamadas comerciais de forma rigorosa e construtiva. RESPONDA APENAS COM JSON VÁLIDO, SEM TEXTO ADICIONAL.' 
          },
          { 
            role: 'user', 
            content: prompt 
          }
        ],
        temperature: 0.2,
        max_tokens: 4000,
        response_format: { type: "json_object" } // Força resposta em JSON
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Erro OpenAI:', response.status, response.statusText, errorText);
      throw new Error(`OpenAI API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    const text = data.choices?.[0]?.message?.content;
    
    if (!text || !text.trim()) {
      throw new Error('OpenAI retornou resposta vazia');
    }

    console.log('✅ OpenAI respondeu com sucesso!');
    return text;

  } catch (error) {
    console.error('❌ Erro ao chamar OpenAI:', error);
    throw error;
  }
}

/**
 * Testa conexão com OpenAI
 */
export async function testOpenAIConnection(): Promise<{ success: boolean; error?: string; model?: string }> {
  try {
    const apiKey = await getOpenAIApiKey();
    if (!apiKey) {
      return { success: false, error: 'Chave da API não configurada' };
    }

    const model = await getOpenAIModel();
    
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: model,
        messages: [
          { role: 'user', content: 'Teste de conexão. Responda apenas com {"status": "ok"}' }
        ],
        max_tokens: 50
      })
    });

    if (response.ok) {
      return { success: true, model };
    } else {
      const errorText = await response.text();
      return { success: false, error: `HTTP ${response.status}: ${errorText}` };
    }
  } catch (error) {
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Erro desconhecido' 
    };
  }
}

