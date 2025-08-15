import { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { generateDiagnosis } from './ai/aiRouter.js';

const SummarySchema = z.object({
  prompt: z.string(),
  schema: z.any().optional(),
});

const AnalysisSchema = z.object({
  prompt: z.string(),
  schema: z.any().optional(),
});

export const diagnosisRouter: FastifyPluginAsync = async (app) => {
  app.post('/diagnosis/summary', async (req, reply) => {
    const parsed = SummarySchema.safeParse((req as any).body);
    if (!parsed.success) return reply.code(400).send({ error: 'bad_request' });
    const { prompt, schema } = parsed.data;
    const res = await generateDiagnosis({ prompt, responseMimeType: 'application/json', responseSchema: schema });
    const status = res.ok ? 200 : 502;
    return reply.code(status).send(res);
  });

  app.post('/diagnosis/analysis', async (req, reply) => {
    const parsed = AnalysisSchema.safeParse((req as any).body);
    if (!parsed.success) return reply.code(400).send({ error: 'bad_request' });
    const { prompt, schema } = parsed.data;
    const res = await generateDiagnosis({ prompt, responseMimeType: 'application/json', responseSchema: schema, maxOutputTokens: 4096 });
    const status = res.ok ? 200 : 502;
    return reply.code(status).send(res);
  });
};


