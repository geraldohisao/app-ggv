import { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import crypto from 'crypto';
import { Queue } from 'bullmq';
import IORedis from 'ioredis';
import { env } from '@calls-mvp/shared';
import { diagnosisRouter } from './routes.diagnosis.js';
import { aiStreamRouter } from './routes/aiStream.js';

const redis = new IORedis(env.redisUrl);
const queue = new Queue('process-call', { connection: redis });

const WebhookSchema = z.object({
  event: z.string(),
  call_id: z.string(),
  from: z.string(),
  to: z.string(),
  agent_id: z.string(),
  duration: z.number().int().optional(),
  recording_url: z.string().optional(),
  media_id: z.string().optional(),
  timestamp: z.string(),
  consent: z.boolean().optional(),
  meta: z.any().optional()
});

export const router: FastifyPluginAsync = async (app) => {
  app.get('/healthz', async () => ({ ok: true }));

  app.post('/webhooks/voip', { config: { rawBody: true } as any }, async (req, reply) => {
    const signature = req.headers['x-signature'];
    const raw = (req as any).rawBody || JSON.stringify(req.body ?? {});
    if (env.webhookSecret) {
      const hmac = crypto.createHmac('sha256', env.webhookSecret).update(raw).digest('hex');
      if (signature !== hmac) {
        return reply.code(401).send({ ok: true }); // 200 per requirement (idempotente: não expor info)
      }
    }
    const parsed = WebhookSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(200).send({ ok: true });
    }
    const payload = parsed.data;

    // idempotência por providerCallId (call_id)
    const existing = await app.prisma.call.findUnique({ where: { providerCallId: payload.call_id } }).catch(() => null);
    if (!existing) {
      await app.prisma.call.create({
        data: {
          providerCallId: payload.call_id,
          from: payload.from,
          to: payload.to,
          agentId: payload.agent_id,
          durationSec: payload.duration ?? null,
          consent: payload.consent ?? false,
          status: 'received',
          source: 'voip'
        }
      });
    }

    await queue.add('process-call', { providerCallId: payload.call_id, payload }, { removeOnComplete: true, attempts: 3 });
    return reply.code(200).send({ ok: true });
  });

  app.get('/calls', async (req, reply) => {
    const { q, page = '1', pageSize = '20' } = (req.query as any) || {};
    const p = Math.max(1, Number(page));
    const ps = Math.min(100, Math.max(1, Number(pageSize)));
    const where = q
      ? { OR: [{ from: { contains: q } }, { to: { contains: q } }, { agentId: { contains: q } }, { providerCallId: { contains: q } }] }
      : {};
    const [items, total] = await Promise.all([
      app.prisma.call.findMany({ where, orderBy: { createdAt: 'desc' }, skip: (p - 1) * ps, take: ps }),
      app.prisma.call.count({ where })
    ]);
    return reply.send({ items, total, page: p, pageSize: ps });
  });

  app.get('/calls/:id', async (req, reply) => {
    const id = (req.params as any).id as string;
    const call = await app.prisma.call.findUnique({ where: { id }, include: { recording: true, transcript: true, insights: true, scorecard: true, segments: true } });
    if (!call) return reply.code(404).send({ error: 'not_found' });
    return reply.send(call);
  });

  app.post('/calls/:id/push-crm', async (req, reply) => {
    const id = (req.params as any).id as string;
    if (!env.enableCrmPush) return reply.code(400).send({ error: 'feature_disabled' });
    await app.prisma.cRMEvent.create({ data: { callId: id, target: 'pipedrive', payloadJson: {}, status: 'pending' } });
    // In a full impl, enqueue a CRM push job or trigger worker handler
    return reply.send({ ok: true });
  });

  // Diagnosis routes
  await app.register(diagnosisRouter);
  
  // AI Stream routes
  await app.register(aiStreamRouter);
  
  // Health endpoint for AI Router
  app.get('/internal/ai-router/health', async () => {
    const { getRouterHealth } = await import('./ai/metrics.js');
    return getRouterHealth();
  });
};
