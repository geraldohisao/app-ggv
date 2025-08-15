import Fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import { env, logger } from '@calls-mvp/shared';
import { router } from './routes.js';
import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';

dotenv.config();

const app = Fastify({ logger });

await app.register(cors, { origin: true });
await app.register(helmet);
await app.register(rateLimit, { max: 1000, timeWindow: '1 minute' });

const prisma = new PrismaClient();
app.decorate('prisma', prisma);

await app.register(router, { prefix: '/' });

const port = Number(process.env.PORT_API || 8080);
app.listen({ port, host: '0.0.0.0' }).then(() => {
  logger.info({ port }, 'API listening');
});

declare module 'fastify' {
  interface FastifyInstance {
    prisma: PrismaClient;
  }
}
