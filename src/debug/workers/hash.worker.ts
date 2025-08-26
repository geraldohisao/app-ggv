/**
 * Web Worker para geração de hashes de incidentes
 * Processa normalização e hashing em background thread
 */

export interface HashRequest {
  id: string;
  data: {
    title: string;
    message: string;
    stack?: string;
    url?: string;
    errorType?: string;
    componentStack?: string;
    context?: Record<string, any>;
  };
}

export interface HashResponse {
  id: string;
  hash: string;
  normalizedKey: string;
}

// Worker principal
self.onmessage = async (event: MessageEvent<HashRequest>) => {
  const { id, data } = event.data;
  
  try {
    const normalizedKey = normalizeErrorKey(data);
    const hash = computeHash(normalizedKey);
    
    const response: HashResponse = {
      id,
      hash: hash.toString(16),
      normalizedKey,
    };
    
    self.postMessage(response);
  } catch (error) {
    // Fallback para hash simples
    const fallbackHash = simpleHash(JSON.stringify(data));
    
    const response: HashResponse = {
      id,
      hash: fallbackHash.toString(16),
      normalizedKey: 'fallback',
    };
    
    self.postMessage(response);
  }
};

/**
 * Normaliza a chave do erro para agrupamento
 */
function normalizeErrorKey(data: HashRequest['data']): string {
  const parts: string[] = [];
  
  // Normalizar título
  if (data.title) {
    parts.push(`title:${normalizeString(data.title)}`);
  }
  
  // Normalizar mensagem
  if (data.message) {
    parts.push(`message:${normalizeString(data.message)}`);
  }
  
  // Normalizar tipo de erro
  if (data.errorType) {
    parts.push(`type:${data.errorType}`);
  }
  
  // Normalizar URL
  if (data.url) {
    parts.push(`url:${normalizeUrl(data.url)}`);
  }
  
  // Normalizar stack trace
  if (data.stack) {
    parts.push(`stack:${normalizeStack(data.stack)}`);
  }
  
  // Normalizar component stack
  if (data.componentStack) {
    parts.push(`component:${normalizeStack(data.componentStack)}`);
  }
  
  // Normalizar contexto (apenas chaves)
  if (data.context) {
    const contextKeys = Object.keys(data.context).sort();
    if (contextKeys.length > 0) {
      parts.push(`context:${contextKeys.join(',')}`);
    }
  }
  
  return parts.join('|');
}

/**
 * Normaliza string removendo variações superficiais
 */
function normalizeString(text: string): string {
  if (!text || typeof text !== 'string') return '';
  
  return text
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ') // Normalizar espaços
    .replace(/[^\w\s]/g, '') // Remover pontuação
    .substring(0, 100); // Limitar tamanho
}

/**
 * Normaliza URL removendo parâmetros dinâmicos
 */
function normalizeUrl(url: string): string {
  if (!url || typeof url !== 'string') return '';
  
  try {
    const urlObj = new URL(url);
    
    // Remover parâmetros dinâmicos
    const dynamicParams = ['timestamp', 'id', 'token', 'key', 'session', 'cache'];
    dynamicParams.forEach(param => {
      urlObj.searchParams.delete(param);
    });
    
    // Normalizar path segments
    const pathSegments = urlObj.pathname.split('/').map(segment => {
      if (/^\d+$/.test(segment)) return 'NUM';
      if (/^[a-f0-9]{8,}$/i.test(segment)) return 'ID';
      if (segment.length > 20) return 'LONG';
      return segment;
    });
    
    urlObj.pathname = pathSegments.join('/');
    
    return urlObj.toString();
  } catch {
    return normalizeString(url);
  }
}

/**
 * Normaliza stack trace removendo informações variáveis
 */
function normalizeStack(stack: string): string {
  if (!stack || typeof stack !== 'string') return '';
  
  return stack
    .split('\n')
    .map(line => {
      // Remover números de linha/coluna
      line = line.replace(/:\d+:\d+\)?$/, '');
      
      // Remover caminhos absolutos
      line = line.replace(/\/[\/\w\-\.]+\.(js|ts|jsx|tsx):/, 'file:');
      
      // Remover hashes de build
      line = line.replace(/[a-f0-9]{8,}/gi, 'HASH');
      
      // Remover timestamps
      line = line.replace(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/g, 'TIMESTAMP');
      
      // Remover UUIDs
      line = line.replace(/[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}/gi, 'UUID');
      
      // Remover tokens e chaves
      line = line.replace(/[a-zA-Z0-9\-._~+/]{20,}=*/g, 'TOKEN');
      
      // Remover emails
      line = line.replace(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}/g, 'EMAIL');
      
      // Remover CPF/CNPJ
      line = line.replace(/\d{3}\.?\d{3}\.?\d{3}-?\d{2}|\d{2}\.?\d{3}\.?\d{3}\/?\d{4}-?\d{2}/g, 'DOCUMENT');
      
      // Remover telefones
      line = line.replace(/\(\d{2}\)\s?\d{4,5}-?\d{4}|\d{2}\s?\d{4,5}-?\d{4}/g, 'PHONE');
      
      // Normalizar espaços múltiplos
      line = line.replace(/\s+/g, ' ');
      
      return line.trim();
    })
    .filter(line => line.length > 0)
    .slice(0, 10) // Limitar a 10 linhas
    .join('\n');
}

/**
 * Computa hash robusto da chave normalizada
 */
function computeHash(key: string): number {
  if (!key || typeof key !== 'string') return 0;
  
  let hash = 0;
  const prime = 31;
  const modulo = 2147483647; // 2^31 - 1
  
  for (let i = 0; i < key.length; i++) {
    const char = key.charCodeAt(i);
    hash = ((hash * prime) % modulo + char) % modulo;
  }
  
  // Adicionar entropia baseada no conteúdo
  const contentHash = simpleHash(key);
  hash = ((hash * prime) % modulo + contentHash) % modulo;
  
  return Math.abs(hash);
}

/**
 * Hash simples para fallback
 */
function simpleHash(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash);
}
