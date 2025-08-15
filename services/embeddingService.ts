
import { StoredKnowledgeDocument } from '../types';
import { startStep } from '../src/utils/logger';

// Cache simples e flag para controlar o uso de rede (desligado por padrão para máxima estabilidade)
let cachedApiKey: string | null | undefined = undefined;
let disableNetworkEmbedding = true;
if (typeof window !== 'undefined') {
  const flag = (window as any).APP_CONFIG_LOCAL?.USE_REMOTE_EMBEDDINGS;
  if (flag === true) disableNetworkEmbedding = false;
}

// Cache de embeddings para queries repetidas
const embeddingCache = new Map<string, { embedding: number[]; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutos

// Função para obter a chave da API do Gemini do Supabase (aceita string ou objeto { apiKey })
const getGeminiApiKey = async (): Promise<string | null> => {
  try {
    if (cachedApiKey !== undefined) return cachedApiKey || null;
    // Tentar obter do Supabase primeiro
    const { getAppSetting } = await import('./supabaseService');
    const value = await getAppSetting('gemini_api_key');
    let resolved: string | null = null;
    if (typeof value === 'string') resolved = value;
    else if (value && typeof value === 'object' && typeof value.apiKey === 'string') resolved = value.apiKey;
    if (resolved) { cachedApiKey = resolved; return resolved; }

    // Fallback para config local
    if (typeof window !== 'undefined' && (window as any).APP_CONFIG_LOCAL?.GEMINI_API_KEY) {
      cachedApiKey = (window as any).APP_CONFIG_LOCAL.GEMINI_API_KEY;
      return cachedApiKey;
    }
    cachedApiKey = null;
    return null;
  } catch (error) {
    console.error('Erro ao obter chave da API:', error);
    return null;
  }
};

const fetchWithTimeout = async (url: string, options: any, ms = 4000): Promise<Response> => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
    return response;
  } finally {
    clearTimeout(timer);
  }
};

/**
 * Generates a high-quality embedding vector for a given text using Google's Embedding API.
 * @param text The text to embed.
 * @param taskType The type of task (e.g., storing a document or querying).
 * @param title Optional title for the document to improve embedding quality.
 * @returns A promise that resolves to an embedding vector.
 */
export const setUseRemoteEmbeddings = (value: boolean) => { disableNetworkEmbedding = !value; };

export const generateEmbedding = async (
    text: string, 
    taskType: string = 'RETRIEVAL_DOCUMENT',
    title?: string
): Promise<number[]> => {
    try {
        if (disableNetworkEmbedding) return generateMockEmbedding(text);
        
        // Verificar cache primeiro
        const cacheKey = `${taskType}:${title || ''}:${text}`;
        const cached = embeddingCache.get(cacheKey);
        if (cached && (Date.now() - cached.timestamp) < CACHE_TTL) {
            return cached.embedding;
        }
        
        const apiKey = await getGeminiApiKey();
        if (!apiKey) return generateMockEmbedding(text);
        const endEmb = startStep({ requestId: 'n/a' }, 'embedding_generate', { len: text.length });
        const response = await fetchWithTimeout(`https://generativelanguage.googleapis.com/v1beta/models/embedding-001:embedContent?key=${apiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model: 'models/embedding-001',
                content: {
                    parts: [{
                        text: title ? `${title}: ${text}` : text
                    }]
                },
                taskType: taskType
            }),
        }, 4000);
        endEmb();

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(`Erro na API de Embedding: ${response.status} - ${errorData.error?.message || response.statusText}`);
        }
        
        const data = await response.json();
        
        if (!data.embedding?.values || !Array.isArray(data.embedding.values)) {
            throw new Error("Formato de embedding inválido recebido da API.");
        }
        
        // Armazenar no cache
        embeddingCache.set(cacheKey, {
            embedding: data.embedding.values,
            timestamp: Date.now()
        });
        
        // Limpar cache antigo periodicamente
        if (embeddingCache.size > 100) {
            const now = Date.now();
            const entries = Array.from(embeddingCache.entries());
            for (const [key, value] of entries) {
                if (now - value.timestamp > CACHE_TTL) {
                    embeddingCache.delete(key);
                }
            }
        }
        
        return data.embedding.values;

    } catch (error) {
        console.warn("Embedding remoto indisponível. Usando embedding local:", (error as any)?.message || error);
        // Desabilita chamadas remotas nesta sessão para evitar timeouts sequenciais
        disableNetworkEmbedding = true;
        return generateMockEmbedding(text);
    }
};

/**
 * Gera um embedding simulado baseado no hash do texto (para desenvolvimento/fallback)
 */
const generateMockEmbedding = (text: string): number[] => {
    // Criar um embedding de 768 dimensões (padrão do embedding-001)
    const dimensions = 768;
    const embedding = new Array(dimensions);
    
    // Usar hash simples do texto para gerar valores consistentes
    let hash = 0;
    for (let i = 0; i < text.length; i++) {
        const char = text.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32-bit integer
    }
    
    // Gerar valores pseudo-aleatórios baseados no hash
    for (let i = 0; i < dimensions; i++) {
        const seed = hash + i;
        const value = Math.sin(seed) * 0.5; // Normalizar entre -0.5 e 0.5
        embedding[i] = value;
    }
    
    // Normalizar o vetor
    const magnitude = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0));
    return embedding.map(val => val / magnitude);
};


/**
 * Calculates the cosine similarity between two vectors.
 */
const cosineSimilarity = (vecA: number[], vecB: number[]): number => {
    if (!vecA || !vecB || vecA.length !== vecB.length) {
        return 0;
    }

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;
    for (let i = 0; i < vecA.length; i++) {
        dotProduct += vecA[i] * vecB[i];
        normA += vecA[i] * vecA[i];
        normB += vecB[i] * vecB[i];
    }
    
    const magnitude = Math.sqrt(normA) * Math.sqrt(normB);
    if (magnitude === 0) {
        return 0;
    }
    
    return dotProduct / magnitude;
};

/**
 * Finds the most relevant documents for a given query using vector embeddings.
 * @param query The user's query string.
 * @param documents The list of all stored documents with their embeddings.
 * @param topK The number of top documents to return.
 * @returns A promise that resolves to an array of the most relevant documents.
 */
export const findMostRelevantDocuments = async (
    query: string,
    topKOrDocuments?: number | StoredKnowledgeDocument[],
    maybeTopK?: number
): Promise<any[]> => {
    console.log('🔍 BUSCA VETORIAL - Iniciando busca por documentos relevantes');
    // API 1: findMostRelevantDocuments(query, topK)
    if (typeof topKOrDocuments === 'number') {
        const topK = topKOrDocuments;
        try {
            const queryEmbedding = await generateEmbedding(query, 'RETRIEVAL_QUERY');
            const { supabase } = await import('./supabaseClient');
            const endKd = startStep({ requestId: 'n/a' }, 'kd_match');
            const { data, error } = await supabase.rpc('kd_match', {
                query_embedding: queryEmbedding,
                top_k: topK
            });
            endKd();
            if (error) {
                console.warn('kd_match falhou:', error?.message || error);
                return [];
            }
            return (data || []).map((r: any) => ({ ...r }));
        } catch (e) {
            console.warn('kd_match indisponível, retornando []:', (e as any)?.message || e);
            return [];
        }
    }

    // API 2: findMostRelevantDocuments(query, documents, topK?)
    const documents = Array.isArray(topKOrDocuments) ? topKOrDocuments : [];
    const topK = typeof maybeTopK === 'number' ? maybeTopK : 3;
    console.log('📊 Parâmetros:', { query: query.substring(0, 100), totalDocs: documents.length, topK });
    if (!documents || documents.length === 0) return [];
    const queryEmbedding = await generateEmbedding(query, 'RETRIEVAL_QUERY');

    const documentsWithSimilarity = documents
        .map(doc => {
            if (!doc.embedding || !Array.isArray(doc.embedding)) {
                return { ...doc, similarity: 0 } as any;
            }
            const similarity = cosineSimilarity(queryEmbedding, doc.embedding);
            return { ...doc, similarity } as any;
        })
        .filter(doc => (doc as any).embedding && (doc as any).similarity >= 0);

    documentsWithSimilarity.sort((a, b) => (b as any).similarity - (a as any).similarity);
    let result = documentsWithSimilarity.filter((d: any) => d.similarity > 0.1).slice(0, topK);
    if (result.length === 0 && documentsWithSimilarity.length > 0) {
        result = documentsWithSimilarity.slice(0, topK);
    }
    return result as any[];
};

export const findOverviewMatch = async (query: string, topK: number = 3): Promise<any[]> => {
    try {
        const queryEmbedding = await generateEmbedding(query, 'RETRIEVAL_QUERY');
        const { supabase } = await import('./supabaseClient');
        const endKo = startStep({ requestId: 'n/a' }, 'ko_match');
        const { data, error } = await supabase.rpc('ko_match', {
            query_embedding: queryEmbedding,
            top_k: topK
        });
        endKo();
        if (error) {
            console.warn('ko_match falhou:', error?.message || error);
            return [];
        }
        return (data || []).map((r: any) => ({ ...r }));
    } catch (e) {
        console.warn('ko_match indisponível, retornando []:', (e as any)?.message || e);
        return [];
    }
};

// Nova API de alto nível: retorna kdDocs/koDocs com id, nome/título, score e conteúdo
export const findRelevant = async (
  params: { query: string; topKDocs?: number; topKOverview?: number }
): Promise<{ kdDocs: Array<{ id?: string; name?: string; score: number; content: string }>; koDocs: Array<{ id?: string; title?: string; score: number; content: string }>; confidenceHint: 'low' | 'medium' | 'high' }> => {
  const { query } = params;
  // carregar config RAG dinâmica
  const { getRAGConfig } = await import('./supabaseService');
  const rag = await getRAGConfig();
  const topKDocs = params.topKDocs ?? rag.topKDocs;
  const topKOverview = params.topKOverview ?? rag.topKOverview;
  const [kd, ko] = await Promise.all([
    (async () => {
      try {
        const qv = await generateEmbedding(query, 'RETRIEVAL_QUERY');
        const { supabase } = await import('./supabaseClient');
        const { data, error } = await supabase.rpc('kd_match', { query_embedding: qv, top_k: topKDocs });
        if (error) return [] as any[];
        const minScore = rag.minScore ?? 0;
        return (data || [])
          .map((r: any) => ({ id: r.id, name: r.name, score: r.score ?? 0, content: r.content || '' }))
          .filter((r: any) => (r.score ?? 0) >= minScore);
      } catch { return [] as any[]; }
    })(),
    (async () => {
      try {
        const qv = await generateEmbedding(query, 'RETRIEVAL_QUERY');
        const { supabase } = await import('./supabaseClient');
        const { data, error } = await supabase.rpc('ko_match', { query_embedding: qv, top_k: topKOverview });
        if (error) return [] as any[];
        const minScore = rag.minScore ?? 0;
        return (data || [])
          .map((r: any) => ({ id: r.id, title: r.title, score: r.score ?? 0, content: r.content || '' }))
          .filter((r: any) => (r.score ?? 0) >= minScore);
      } catch { return [] as any[]; }
    })(),
  ]);
  const scores: number[] = [
    ...kd.map((d: any) => Number(d.score || 0)),
    ...ko.map((d: any) => Number(d.score || 0)),
  ];
  const avg = scores.length ? (scores.reduce((a, b) => a + b, 0) / scores.length) : 0;
  const confidenceHint = avg < 0.2 ? 'low' : avg <= 0.4 ? 'medium' : 'high';
  return { kdDocs: kd, koDocs: ko, confidenceHint };
};