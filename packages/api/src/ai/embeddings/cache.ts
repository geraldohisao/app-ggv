import { logger } from '@calls-mvp/shared';
import crypto from 'crypto';

export type EmbeddingCacheResult = {
  embedding: number[];
  cached: boolean;
};

// In-memory fallback cache
const memoryCache = new Map<string, { embedding: number[]; timestamp: number }>();
const MEMORY_CACHE_TTL = 5 * 60 * 1000; // 5 minutes
const REDIS_CACHE_TTL = 300; // 5 minutes in seconds

let redisClient: any = null;
let useRedis = false;

// Initialize Redis client if available
async function initRedis(): Promise<void> {
  if (redisClient !== null) return; // Already initialized
  
  try {
    const redisUrl = process.env.REDIS_URL;
    const useRedisCacheFlag = process.env.USE_REDIS_EMBED_CACHE === 'true';
    
    if (!redisUrl || !useRedisCacheFlag) {
      redisClient = false; // Explicitly disabled
      logger.info('Redis embedding cache disabled');
      return;
    }
    
    const { default: IORedis } = await import('ioredis');
    redisClient = new IORedis(redisUrl);
    
    // Test connection
    await redisClient.ping();
    useRedis = true;
    logger.info('Redis embedding cache enabled');
    
  } catch (error: any) {
    logger.warn({ error: error.message }, 'Redis embedding cache failed to initialize, using memory fallback');
    redisClient = false;
    useRedis = false;
  }
}

function generateCacheKey(text: string, model: string = 'embedding-001'): string {
  const hash = crypto.createHash('sha256').update(text).digest('hex');
  return `emb:${model}:${hash}`;
}

export async function getCachedEmbedding(text: string, model?: string): Promise<number[] | null> {
  await initRedis();
  
  const cacheKey = generateCacheKey(text, model);
  
  // Try Redis first if available
  if (useRedis && redisClient) {
    try {
      const cached = await redisClient.get(cacheKey);
      if (cached) {
        const embedding = JSON.parse(cached);
        if (Array.isArray(embedding)) {
          logger.debug({ cacheKey }, 'redis_embedding_cache_hit');
          return embedding;
        }
      }
    } catch (error: any) {
      logger.warn({ error: error.message, cacheKey }, 'redis_embedding_cache_error');
    }
  }
  
  // Fallback to memory cache
  const memoryCached = memoryCache.get(cacheKey);
  if (memoryCached && (Date.now() - memoryCached.timestamp) < MEMORY_CACHE_TTL) {
    logger.debug({ cacheKey }, 'memory_embedding_cache_hit');
    return memoryCached.embedding;
  }
  
  return null;
}

export async function setCachedEmbedding(text: string, embedding: number[], model?: string): Promise<void> {
  await initRedis();
  
  const cacheKey = generateCacheKey(text, model);
  
  // Store in Redis if available
  if (useRedis && redisClient) {
    try {
      await redisClient.setex(cacheKey, REDIS_CACHE_TTL, JSON.stringify(embedding));
      logger.debug({ cacheKey }, 'redis_embedding_cache_set');
    } catch (error: any) {
      logger.warn({ error: error.message, cacheKey }, 'redis_embedding_cache_set_error');
    }
  }
  
  // Always store in memory cache as fallback
  memoryCache.set(cacheKey, {
    embedding,
    timestamp: Date.now()
  });
  
  // Clean up old memory cache entries periodically
  if (memoryCache.size > 100) {
    const now = Date.now();
    for (const [key, value] of memoryCache.entries()) {
      if (now - value.timestamp > MEMORY_CACHE_TTL) {
        memoryCache.delete(key);
      }
    }
  }
}

export async function generateEmbeddingWithCache(
  text: string,
  taskType: string = 'RETRIEVAL_DOCUMENT',
  title?: string,
  model: string = 'embedding-001'
): Promise<EmbeddingCacheResult> {
  // Check cache first
  const cached = await getCachedEmbedding(text, model);
  if (cached) {
    return { embedding: cached, cached: true };
  }
  
  // Generate new embedding (implement actual generation logic)
  const embedding = await generateEmbeddingDirect(text, taskType, title, model);
  
  // Cache the result
  await setCachedEmbedding(text, embedding, model);
  
  return { embedding, cached: false };
}

async function generateEmbeddingDirect(
  text: string,
  taskType: string,
  title?: string,
  model: string = 'embedding-001'
): Promise<number[]> {
  // TODO: Implement actual embedding generation
  // For now, return mock embedding
  const mockSize = 768; // Standard embedding size
  return Array.from({ length: mockSize }, () => Math.random() - 0.5);
}

// Health check for cache
export function getCacheHealth(): any {
  return {
    redis: {
      enabled: useRedis,
      connected: useRedis && redisClient && redisClient.status === 'ready'
    },
    memory: {
      size: memoryCache.size,
      maxAge: MEMORY_CACHE_TTL
    }
  };
}
