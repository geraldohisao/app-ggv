import dotenv from 'dotenv';

dotenv.config();

export const env = {
  nodeEnv: process.env.NODE_ENV || 'development',
  databaseUrl: process.env.DATABASE_URL || '',
  redisUrl: process.env.REDIS_URL || 'redis://localhost:6379',
  webhookSecret: process.env.WEBHOOK_SECRET || '',
  enableCrmPush: (process.env.ENABLE_CRM_PUSH || 'false') === 'true',
  useTranscriber: process.env.USE_TRANSCRIBER || 'stub',
  storeAudio: (process.env.STORE_AUDIO || 'true') === 'true',
  retentionDays: parseInt(process.env.RETENTION_DAYS || '30', 10),
  hashPhones: (process.env.HASH_PHONE_NUMBERS || 'false') === 'true',
  s3: {
    endpoint: process.env.S3_ENDPOINT,
    region: process.env.S3_REGION,
    bucket: process.env.S3_BUCKET || 'calls-recordings',
    accessKey: process.env.S3_ACCESS_KEY,
    secretKey: process.env.S3_SECRET_KEY
  },
  providers: {
    deepgramKey: process.env.DEEPGRAM_API_KEY,
    openaiKey: process.env.OPENAI_API_KEY,
    whisperUrl: process.env.WHISPER_API_URL
  },
  pipedrive: {
    token: process.env.PIPEDRIVE_API_TOKEN,
    baseUrl: process.env.PIPEDRIVE_BASE_URL || 'https://api.pipedrive.com/v1'
  }
};
