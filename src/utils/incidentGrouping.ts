/**
 * Utilitários para agrupamento de incidentes de erro
 * Gera hashes estáveis para agrupar erros similares
 * Funções puras para uso em workers
 */

import { sanitizeString, sanitizeUrl } from './sanitizeErrorData';

interface IncidentData {
  title?: string;
  message?: string;
  stack?: string;
  url?: string;
  errorType?: string;
  componentStack?: string;
  context?: any;
}

/**
 * Normaliza stack trace para gerar hash estável
 */
function normalizeStack(stack: string): string {
  if (!stack) return '';
  
  let normalized = stack;
  
  // Remover números de linha e coluna (variam entre builds)
  normalized = normalized.replace(/:\d+:\d+/g, ':LINE:COL');
  
  // Remover caminhos absolutos (variam entre ambientes)
  normalized = normalized.replace(/\/[^\/]+\/[^\/]+\/[^\/]+/g, '/PATH');
  
  // Remover hashes de build
  normalized = normalized.replace(/[a-f0-9]{8,}/g, 'HASH');
  
  // Remover timestamps
  normalized = normalized.replace(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/g, 'TIMESTAMP');
  
  // Remover IDs dinâmicos (UUIDs)
  normalized = normalized.replace(/[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}/g, 'UUID');
  
  // Remover tokens e chaves sensíveis
  normalized = normalized.replace(/(?:token|key|secret|password|api_key|access_token|refresh_token|bearer)\s*[:=]\s*['"]?[a-zA-Z0-9\-_\.]{20,}['"]?/gi, '[SENSITIVE]');
  
  // Remover emails
  normalized = normalized.replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, '[EMAIL]');
  
  // Remover CPF/CNPJ
  normalized = normalized.replace(/\d{3}\.?\d{3}\.?\d{3}-?\d{2}/g, '[CPF]');
  normalized = normalized.replace(/\d{2}\.?\d{3}\.?\d{3}\/?\d{4}-?\d{2}/g, '[CNPJ]');
  
  // Remover telefones
  normalized = normalized.replace(/(\+?55\s?\(?\d{2}\)?\s?\d{4,5}-?\d{4})/g, '[PHONE]');
  
  // Normalizar espaços múltiplos
  normalized = normalized.replace(/\s+/g, ' ');
  
  return normalized.trim();
}

/**
 * Extrai tipo de erro da mensagem ou stack
 */
function extractErrorType(message: string, stack: string): string {
  // Padrões comuns de tipos de erro
  const errorPatterns = [
    /TypeError: (.+)/,
    /ReferenceError: (.+)/,
    /SyntaxError: (.+)/,
    /RangeError: (.+)/,
    /URIError: (.+)/,
    /EvalError: (.+)/,
    /NetworkError: (.+)/,
    /FetchError: (.+)/,
    /TimeoutError: (.+)/,
    /ValidationError: (.+)/,
    /AuthenticationError: (.+)/,
    /AuthorizationError: (.+)/,
    /NotFoundError: (.+)/,
    /ServerError: (.+)/,
    /ClientError: (.+)/,
  ];
  
  // Tentar extrair da mensagem primeiro
  for (const pattern of errorPatterns) {
    const match = message.match(pattern);
    if (match) {
      return match[1].split(' ')[0]; // Primeira palavra após o tipo
    }
  }
  
  // Tentar extrair do stack
  for (const pattern of errorPatterns) {
    const match = stack.match(pattern);
    if (match) {
      return match[1].split(' ')[0];
    }
  }
  
  // Fallback: usar primeira palavra da mensagem
  const firstWord = message.split(' ')[0];
  return firstWord.length > 3 ? firstWord : 'Unknown';
}

/**
 * Normaliza URL removendo parâmetros dinâmicos
 */
function normalizeUrl(url: string): string {
  if (!url) return '';
  
  try {
    const urlObj = new URL(url);
    
    // Remover parâmetros dinâmicos que não afetam o erro
    const dynamicParams = [
      'timestamp', 'time', 'date', 'id', 'token', 'key', 'auth',
      'session', 'cache', 'v', 'version', 'build', 'hash'
    ];
    
    dynamicParams.forEach(param => {
      urlObj.searchParams.delete(param);
    });
    
    // Normalizar path removendo IDs dinâmicos
    let path = urlObj.pathname;
    path = path.replace(/\/[a-f0-9]{8,}/g, '/ID'); // UUIDs
    path = path.replace(/\/\d+/g, '/NUM'); // Números
    
    return `${urlObj.origin}${path}`;
  } catch {
    return sanitizeUrl(url);
  }
}

/**
 * Gera hash estável para agrupamento de incidentes
 */
export function generateIncidentHash(data: IncidentData): string {
  const {
    title = '',
    message = '',
    stack = '',
    url = '',
    errorType = '',
    componentStack = '',
    context = {}
  } = data;
  
  // Normalizar dados
  const normalizedTitle = sanitizeString(title).toLowerCase();
  const normalizedMessage = sanitizeString(message).toLowerCase();
  const normalizedStack = normalizeStack(stack);
  const normalizedUrl = normalizeUrl(url);
  const normalizedErrorType = errorType.toLowerCase();
  const normalizedComponentStack = normalizeStack(componentStack);
  
  // Extrair informações chave
  const extractedErrorType = extractErrorType(normalizedMessage, normalizedStack);
  
  // Criar chave de agrupamento
  const groupingKey = {
    // Informações essenciais
    errorType: extractedErrorType || normalizedErrorType,
    title: normalizedTitle.slice(0, 100), // Limitar tamanho
    message: normalizedMessage.slice(0, 200), // Limitar tamanho
    
    // Contexto técnico
    url: normalizedUrl,
    stackSignature: normalizedStack.slice(0, 500), // Primeiros 500 chars do stack
    componentStackSignature: normalizedComponentStack.slice(0, 300),
    
    // Contexto da aplicação
    contextKeys: Object.keys(context || {}).sort(),
    
    // Versão da aplicação (para agrupar por versão)
    appVersion: (typeof window !== 'undefined' && (window as any).__APP_VERSION__) || 'unknown'
  };
  
  // Gerar hash SHA1
  const keyString = JSON.stringify(groupingKey);
  
  // Algoritmo de hash mais robusto (simulação de SHA1)
  let hash = 0;
  const prime = 31;
  
  for (let i = 0; i < keyString.length; i++) {
    const char = keyString.charCodeAt(i);
    hash = (hash * prime + char) >>> 0; // Manter como unsigned 32-bit
  }
  
  // Adicionar mais entropia baseada no conteúdo
  const contentHash = keyString.split('').reduce((acc, char) => {
    return (acc * 31 + char.charCodeAt(0)) >>> 0;
  }, 0);
  
  // Combinar hashes para maior robustez
  const combinedHash = (hash ^ contentHash) >>> 0;
  
  // Converter para hex de 12 caracteres
  return combinedHash.toString(16).padStart(12, '0').slice(0, 12);
}

/**
 * Calcula similaridade entre dois incidentes (0-1)
 */
export function calculateIncidentSimilarity(incident1: IncidentData, incident2: IncidentData): number {
  let similarity = 0;
  let totalWeight = 0;
  
  // Comparar título (peso: 0.3)
  if (incident1.title && incident2.title) {
    const title1 = sanitizeString(incident1.title).toLowerCase();
    const title2 = sanitizeString(incident2.title).toLowerCase();
    const titleSimilarity = title1 === title2 ? 1 : 
      title1.includes(title2) || title2.includes(title1) ? 0.7 : 0;
    similarity += titleSimilarity * 0.3;
    totalWeight += 0.3;
  }
  
  // Comparar tipo de erro (peso: 0.4)
  if (incident1.message && incident2.message) {
    const type1 = extractErrorType(incident1.message, incident1.stack || '');
    const type2 = extractErrorType(incident2.message, incident2.stack || '');
    const typeSimilarity = type1 === type2 ? 1 : 0;
    similarity += typeSimilarity * 0.4;
    totalWeight += 0.4;
  }
  
  // Comparar URL (peso: 0.2)
  if (incident1.url && incident2.url) {
    const url1 = normalizeUrl(incident1.url);
    const url2 = normalizeUrl(incident2.url);
    const urlSimilarity = url1 === url2 ? 1 : 0;
    similarity += urlSimilarity * 0.2;
    totalWeight += 0.2;
  }
  
  // Comparar stack (peso: 0.1)
  if (incident1.stack && incident2.stack) {
    const stack1 = normalizeStack(incident1.stack);
    const stack2 = normalizeStack(incident2.stack);
    const stackSimilarity = stack1 === stack2 ? 1 : 
      stack1.includes(stack2.slice(0, 100)) || stack2.includes(stack1.slice(0, 100)) ? 0.5 : 0;
    similarity += stackSimilarity * 0.1;
    totalWeight += 0.1;
  }
  
  return totalWeight > 0 ? similarity / totalWeight : 0;
}

/**
 * Agrupa incidentes similares
 */
export function groupSimilarIncidents(incidents: Array<{ id: string; data: IncidentData }>, threshold: number = 0.8): Array<{ hash: string; incidents: string[] }> {
  const groups: Map<string, string[]> = new Map();
  
  for (const incident of incidents) {
    const hash = generateIncidentHash(incident.data);
    
    if (!groups.has(hash)) {
      groups.set(hash, []);
    }
    
    groups.get(hash)!.push(incident.id);
  }
  
  return Array.from(groups.entries()).map(([hash, incidentIds]) => ({
    hash,
    incidents: incidentIds
  }));
}

/**
 * Valida se um hash de incidente é válido
 */
export function isValidIncidentHash(hash: string): boolean {
  return /^[a-f0-9]{12}$/.test(hash);
}
