import { AIMessage } from '../types';

export type AIStreamOptions = { 
  requestId?: string; 
  forceWeb?: boolean; 
};

export type StreamChunk = {
  type: 'text' | 'meta' | 'done';
  data: any;
};

// Simula streaming palavra por palavra como o comportamento atual
function* simulateWordByWordStreamDelta(delta: string): Generator<string, void, unknown> {
  if (!delta) return;
  const words = delta.split(/(\s+)/);
  for (const word of words) {
    yield word;
  }
}

export async function* getAssistantStream(
  message: string,
  persona: any, 
  history: AIMessage[],
  knowledgeBase: string,
  options: AIStreamOptions = {}
): AsyncGenerator<string, void, unknown> {
  try {
    // Fast-path: quando explicitamente solicitada busca web, usa o pipeline local
    // (geminiService) que integra RAG + Web Search. O roteador Netlify atual
    // não executa web search, então delegamos diretamente aqui.
    if (options.forceWeb === true) {
      const mod = await import('./geminiService');
      const stream = mod.getAIAssistantResponseStream as any;
      const it = stream(message, persona, history, knowledgeBase, { forceWeb: true, requestId: options.requestId });
      for await (const delta of it) {
        yield delta as string;
      }
      try {
        const metas = (mod as any).getLastSourcesMeta?.();
        if (metas) {
          (globalThis as any).__LAST_SOURCES_META__ = metas;
        }
      } catch {}
      return;
    }

    const requestId = options.requestId || `req_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    
    const personaId = typeof persona === 'string' ? persona : persona?.id || 'sdr';
    
    const payload = {
      message,
      personaId,
      persona,
      history,
      knowledgeBase,
      flags: {
        forceWeb: options.forceWeb || false
      },
      requestId
    } as any;

    const base = (typeof import.meta !== 'undefined' && (import.meta as any).env)
      ? ((import.meta as any).env.VITE_API_BASE_URL || '')
      : '';
    const endpoint = (base ? `${String(base).replace(/\/$/, '')}` : '') + '/api/ai/stream';
    const winBase = (typeof window !== 'undefined' && (window as any).API_BASE_URL) ? (window as any).API_BASE_URL : '';
    const response = await fetch((winBase || base ? `${(winBase || base).replace(/\/$/, '')}` : '') + '/api/ai/stream', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      throw new Error(`AI Router error: ${response.status}`);
    }

    if (!response.body) {
      throw new Error('No response body from AI Router');
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let fullText = '';

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.trim()) continue;
          
          try {
            const chunk: StreamChunk = JSON.parse(line);
            
            if (chunk.type === 'text') {
              const delta: string = String(chunk.data || '');
              fullText += delta;
              // Emite apenas o delta para evitar re-renderizações pesadas
              yield* simulateWordByWordStreamDelta(delta);
            } else if (chunk.type === 'meta') {
              // Metadados (fontes, etc.) - podem ser processados mas não afetam o stream
              if (chunk.data.sources) {
                (globalThis as any).__LAST_SOURCES_META__ = chunk.data.sources;
              }
            } else if (chunk.type === 'done') {
              // Stream finalizado
              break;
            }
          } catch (e) {
            console.warn('Failed to parse stream chunk:', line, e);
          }
        }
      }
    } finally {
      reader.releaseLock();
    }

    // Do not yield full text again; deltas already streamed

  } catch (error) {
    console.error('AI Router stream error:', error);
    
    // Fallback gracioso - usar o serviço antigo como backup
    try {
      const { getAIAssistantResponseStream: originalStream } = await import('./geminiService');
      yield* originalStream(message, persona, history, knowledgeBase, options);
    } catch (fallbackError) {
      yield `❌ Erro no assistente IA: ${(error as any)?.message || 'Falha na comunicação'}. Tente novamente.`;
    }
  }
}

// Função para manter compatibilidade com getLastSourcesMeta
export function getLastSourcesMeta(): any[] {
  return (globalThis as any).__LAST_SOURCES_META__ || [];
}

// Manter compatibilidade com a API existente
export { getAssistantStream as getAIAssistantResponseStream };
