import { Worker, QueueEvents, Job } from 'bullmq';
import IORedis from 'ioredis';
import { env, logger } from '@calls-mvp/shared';
import { PrismaClient } from '@prisma/client';
import { createStorage } from './storage/index.js';
import { createTranscriber } from './transcribers/index.js';
import { createLLM } from './llm/index.js';
import { processSegments } from './segments.js';

const connection = new IORedis(env.redisUrl);
const queueName = 'process-call';
const prisma = new PrismaClient();

const storage = await createStorage();
const transcriber = await createTranscriber();
const llm = await createLLM();

async function handle(job: Job) {
  const { providerCallId, payload } = job.data as { providerCallId: string; payload: any };
  logger.info({ providerCallId }, 'Processing call');
  const call = await prisma.call.findUnique({ where: { providerCallId } });
  if (!call) return;
  await prisma.call.update({ where: { id: call.id }, data: { status: 'processing' } });

  // 1) Download áudio
  const originalUrl: string | undefined = payload.recording_url;
  let storageKey: string | undefined;
  if (originalUrl) {
    const buf = await fetch(originalUrl).then((r) => r.arrayBuffer()).then((b) => Buffer.from(b));
    const key = `recordings/${call.id}.wav`;
    await storage.put(key, buf, 'audio/wav');
    storageKey = key;
    await prisma.recording.upsert({
      where: { callId: call.id },
      update: { storageKey: key, originalUrl, format: 'wav' },
      create: { callId: call.id, storageKey: key, originalUrl, format: 'wav' }
    });
  }

  // 2) Transcrever
  const transcript = await transcriber.transcribe({ url: originalUrl, diarization: true, language: 'pt-BR' }).catch((e) => {
    logger.error(e, 'Transcription failed, using stub');
    return { language: 'pt-BR', text: '', words: [], diarization: [] };
  });
  await prisma.transcript.upsert({
    where: { callId: call.id },
    update: { language: transcript.language, text: transcript.text, wordsJson: transcript.words as any, diarizationJson: transcript.diarization as any },
    create: { callId: call.id, language: transcript.language, text: transcript.text, wordsJson: transcript.words as any, diarizationJson: transcript.diarization as any }
  });

  // 3) Segmentar (básico)
  const segments = processSegments(transcript);
  await prisma.segment.deleteMany({ where: { callId: call.id } });
  for (const s of segments) {
    await prisma.segment.create({ data: { callId: call.id, label: s.label, startSec: s.startSec, endSec: s.endSec, excerpt: s.excerpt } });
  }

  // 4) Insights + CRM fields + Scorecard
  const insights = await llm.extractInsights({ transcript: transcript.text, locale: 'pt-BR' }).catch(() => ({ summary: '', painPoints: [], objections: [], nextActions: [], tags: [] }));
  await prisma.insights.upsert({
    where: { callId: call.id },
    update: { summary: insights.summary, painPointsJson: insights.painPoints as any, objectionsJson: insights.objections as any, nextActionsJson: insights.nextActions as any, tags: insights.tags },
    create: { callId: call.id, summary: insights.summary, painPointsJson: insights.painPoints as any, objectionsJson: insights.objections as any, nextActionsJson: insights.nextActions as any, tags: insights.tags }
  });

  const template = { templateKey: 'diagnostico', items: [{ key: 'dor', weight: 3 }] } as any;
  const score = await llm.scorecall({ transcript: transcript.text, template, locale: 'pt-BR' }).catch(() => ({ items: [], totalScore: 0, templateKey: 'diagnostico' }));
  await prisma.scorecard.upsert({
    where: { callId: call.id },
    update: { templateKey: score.templateKey, itemsJson: score.items as any, totalScore: score.totalScore },
    create: { callId: call.id, templateKey: score.templateKey, itemsJson: score.items as any, totalScore: score.totalScore }
  });

  await prisma.call.update({ where: { id: call.id }, data: { status: 'processed' } });
  logger.info({ providerCallId }, 'Processed');
}

new Worker(queueName, handle, { connection });
new QueueEvents(queueName, { connection });
