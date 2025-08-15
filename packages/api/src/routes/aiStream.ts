import { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { generateDiagnosis } from '../ai/aiRouter.js';
import { recordMetric } from '../ai/metrics.js';
import { logger } from '@calls-mvp/shared';

const StreamRequestSchema = z.object({
  message: z.string(),
  personaId: z.string(),
  history: z.array(z.object({
    role: z.enum(['user', 'model']),
    content: z.string()
  })),
  flags: z.object({
    forceWeb: z.boolean().optional()
  }).optional(),
  requestId: z.string().optional()
});

export const aiStreamRouter: FastifyPluginAsync = async (app) => {
  app.post('/api/ai/stream', async (req, reply) => {
    const parsed = StreamRequestSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: 'bad_request', details: parsed.error.issues });
    }

    const { message, personaId, history, flags, requestId } = parsed.data;
    const startTime = Date.now();

    // Set headers for streaming
    reply.header('Content-Type', 'application/x-ndjson');
    reply.header('Cache-Control', 'no-cache');
    reply.header('Connection', 'keep-alive');

    try {
      // Build prompt with persona context
      const personaPrompt = buildPersonaPrompt(message, personaId, history);
      
      // Track timing for observability
      const timings = { rag: 0, web: 0, llm: 0, total: 0 };
      
      // Simulate RAG + Web search (parallel)
      const ragStart = Date.now();
      // TODO: Implement actual RAG search via context builder
      const ragContext = `📚 BASE DE CONHECIMENTO:\nConteúdo relevante encontrado nos documentos da GGV.`;
      timings.rag = Date.now() - ragStart;

      const webStart = Date.now();
      // TODO: Implement web search if forceWeb or enabled
      const webContext = flags?.forceWeb ? `🌐 BUSCA WEB:\nResultados da pesquisa web.` : '';
      timings.web = Date.now() - webStart;

      // Combine contexts
      const fullPrompt = `${personaPrompt}\n\n${ragContext}${webContext}`;

      // Call AI Router
      const llmStart = Date.now();
      const result = await generateDiagnosis({
        prompt: fullPrompt,
        responseMimeType: 'text/plain',
        temperature: 0.7,
        maxOutputTokens: 2048
      });
      timings.llm = Date.now() - llmStart;
      timings.total = Date.now() - startTime;

      if (!result.ok) {
        reply.raw.write(JSON.stringify({
          type: 'done',
          data: { error: result.error, timings }
        }) + '\n');
        return reply.raw.end();
      }

      // Stream como NDJSON de deltas para evitar crescimento exponencial no front
      const responseText = result.rawText || '';
      const chunks = splitIntoStreamChunks(responseText);
      for (const chunk of chunks) {
        reply.raw.write(JSON.stringify({ type: 'text', data: chunk }) + '\n');
        await new Promise(resolve => setTimeout(resolve, 10));
      }

      // Send metadata
      reply.raw.write(JSON.stringify({
        type: 'meta',
        data: {
          provider: result.provider,
          model: result.model,
          usage: result.usage,
          sources: [], // TODO: Add actual sources from RAG/Web
          timings
        }
      }) + '\n');

      // Send completion signal
      reply.raw.write(JSON.stringify({
        type: 'done',
        data: { success: true, timings }
      }) + '\n');

      // Record metrics asynchronously
      recordMetric({
        requestId: requestId || 'unknown',
        personaId,
        routerMode: 'primary_fallback', // TODO: Get from config
        provider: result.provider || 'unknown',
        model: result.model || 'unknown',
        ragMs: timings.rag,
        webMs: timings.web,
        llmMs: timings.llm,
        totalMs: timings.total,
        tokensIn: estimateTokens(fullPrompt),
        tokensOut: estimateTokens(responseText),
        costEstimate: 0, // Will be calculated in recordMetric
        status: 'success',
        cbState: 'closed' // TODO: Get actual circuit breaker state
      });

    } catch (error: any) {
      logger.error({ error: error.message, requestId }, 'ai_stream_error');
      
      reply.raw.write(JSON.stringify({
        type: 'done',
        data: { 
          error: { message: error.message || 'Internal server error' },
          timings: { total: Date.now() - startTime }
        }
      }) + '\n');
    }

    return reply.raw.end();
  });
};

function buildPersonaPrompt(message: string, personaId: string, history: any[]): string {
  // TODO: Load persona from database/config
  const personaMap: Record<string, string> = {
    sdr: 'Você é um SDR especialista da GGV. Ajude com prospecção e qualificação de leads.',
    closer: 'Você é um Closer da GGV. Foque em diagnósticos e fechamento de vendas.',
    gestor: 'Você é um Gestor Comercial da GGV. Analise métricas e estratégias de vendas.'
  };
  
  const systemPrompt = personaMap[personaId] || personaMap.sdr;
  const historyContext = history.length > 0 
    ? `\n\nHistórico:\n${history.slice(-3).map(h => `${h.role === 'user' ? 'Usuário' : 'Assistente'}: ${h.content}`).join('\n')}`
    : '';
  
  return `${systemPrompt}\n\nPergunta: ${message}${historyContext}`;
}

function splitIntoStreamChunks(text: string): string[] {
  if (!text) return [];
  
  // Split by sentences and paragraphs for natural streaming
  const sentences = text.split(/([.!?]\s+)/);
  const chunks: string[] = [];
  let currentChunk = '';
  
  for (const sentence of sentences) {
    currentChunk += sentence;
    if (sentence.match(/[.!?]\s+/) || currentChunk.length > 100) {
      chunks.push(currentChunk.trim());
      currentChunk = '';
    }
  }
  
  if (currentChunk.trim()) {
    chunks.push(currentChunk.trim());
  }
  
  return chunks;
}

function estimateTokens(text: string): number {
  // Rough estimation: ~4 chars per token for Portuguese
  return Math.ceil((text || '').length / 4);
}


