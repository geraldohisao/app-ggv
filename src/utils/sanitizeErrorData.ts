/**
 * Sanitiza dados de erro removendo informações sensíveis
 * Previne vazamento de dados pessoais em logs
 * Funções puras para uso em workers
 */

// Padrões de dados sensíveis para remoção
const SENSITIVE_PATTERNS = [
  // Tokens de autenticação - Padrões mais abrangentes
  /(?:token|auth|key|secret|password|api_key|access_token|refresh_token|bearer|authorization)\s*[:=]\s*['"]?[a-zA-Z0-9\-_\.]{20,}['"]?/gi,
  
  // Chaves de API específicas - Mais abrangentes
  /(?:AIza[0-9A-Za-z\-_]{20,})/g, // Google API
  /(?:sk-[0-9A-Za-z]{20,})/g, // OpenAI API
  /(?:pk_[0-9A-Za-z]{20,})/g, // Stripe API
  /(?:Bearer\s+[a-zA-Z0-9\-_\.]{20,})/gi, // Bearer tokens
  /(?:eyJ[a-zA-Z0-9\-_]{20,})/g, // JWT tokens (base64)
  
  // URLs com tokens - Mais específico
  /(?:https?:\/\/[^\/\s]+)(?:\/[a-zA-Z0-9\-_]{20,})/g,
  
  // Emails - Mascaramento mais seguro
  /([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g,
  
  // CPF/CNPJ - Padrões mais abrangentes
  /(\d{3}\.?\d{3}\.?\d{3}-?\d{2})/g,
  /(\d{2}\.?\d{3}\.?\d{3}\/?\d{4}-?\d{2})/g,
  
  // Telefones - Padrões brasileiros e internacionais
  /(\+?55\s?\(?\d{2}\)?\s?\d{4,5}-?\d{4})/g,
  /(\+?\d{1,3}\s?\(?\d{1,4}\)?\s?\d{3,4}-?\d{4})/g,
  
  // IDs de usuário longos - Mais abrangente
  /(?:user_id|id|uid|userid)\s*[:=]\s*['"]?[a-zA-Z0-9\-_]{20,}['"]?/gi,
  
  // Chaves de sessão e cookies
  /(?:session|sessionid|cookie)\s*[:=]\s*['"]?[a-zA-Z0-9\-_]{20,}['"]?/gi,
  
  // Chaves privadas e certificados
  /(?:private_key|privatekey|certificate|cert)\s*[:=]\s*['"]?[a-zA-Z0-9\-_\.\/\+]{20,}['"]?/gi,
  
  // Hash de senhas (mesmo que parcial)
  /(?:password|pwd|pass)\s*[:=]\s*['"]?[a-zA-Z0-9\-_\.\/\+]{8,}['"]?/gi,
];

// Campos que devem ser sempre removidos
const SENSITIVE_FIELDS = [
  'password',
  'token',
  'apiKey',
  'secret',
  'privateKey',
  'accessToken',
  'refreshToken',
  'authorization',
  'cookie',
  'session',
  'auth',
  'credentials',
  'key',
  'pwd',
  'pass',
  'sessionid',
  'userid',
  'certificate',
  'cert',
  'privatekey'
];

/**
 * Sanitiza string removendo dados sensíveis
 * Função pura para uso em workers
 */
export function sanitizeString(text: string): string {
  if (!text || typeof text !== 'string') return text;
  
  let sanitized = text;
  
  // Aplicar padrões de remoção
  SENSITIVE_PATTERNS.forEach(pattern => {
    sanitized = sanitized.replace(pattern, '[REDACTED]');
  });
  
  // Remover linhas que contenham campos sensíveis
  const lines = sanitized.split('\n');
  const filteredLines = lines.filter(line => {
    const lowerLine = line.toLowerCase();
    return !SENSITIVE_FIELDS.some(field => lowerLine.includes(field));
  });
  
  return filteredLines.join('\n');
}

/**
 * Sanitiza objeto recursivamente
 * Função pura para uso em workers
 */
export function sanitizeObject(obj: any, maxDepth: number = 3, currentDepth: number = 0): any {
  if (currentDepth >= maxDepth) return '[MAX_DEPTH]';
  if (!obj || typeof obj !== 'object') return obj;
  
  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeObject(item, maxDepth, currentDepth + 1));
  }
  
  const sanitized: any = {};
  
  for (const [key, value] of Object.entries(obj)) {
    const lowerKey = key.toLowerCase();
    
    // Pular campos sensíveis
    if (SENSITIVE_FIELDS.some(field => lowerKey.includes(field))) {
      sanitized[key] = '[REDACTED]';
      continue;
    }
    
    // Sanitizar valores
    if (typeof value === 'string') {
      sanitized[key] = sanitizeString(value);
    } else if (typeof value === 'object' && value !== null) {
      sanitized[key] = sanitizeObject(value, maxDepth, currentDepth + 1);
    } else {
      sanitized[key] = value;
    }
  }
  
  return sanitized;
}

/**
 * Sanitiza dados de erro para envio em alertas
 */
export function sanitizeErrorData(errorData: {
  title?: string;
  message?: string;
  stack?: string;
  context?: any;
  url?: string;
  user?: any;
}): {
  title: string;
  message: string;
  stack: string;
  context: any;
  url: string;
  user: any;
} {
  return {
    title: sanitizeString(errorData.title || ''),
    message: sanitizeString(errorData.message || ''),
    stack: sanitizeString(errorData.stack || ''),
    context: sanitizeObject(errorData.context || {}),
    url: sanitizeUrl(errorData.url || ''),
    user: sanitizeUserData(errorData.user)
  };
}

/**
 * Sanitiza URL removendo parâmetros sensíveis
 */
export function sanitizeUrl(url: string): string {
  if (!url) return '';
  
  try {
    const urlObj = new URL(url);
    
    // Lista expandida de parâmetros sensíveis
    const sensitiveParams = [
      'token', 'key', 'auth', 'password', 'secret', 'api_key', 
      'access_token', 'refresh_token', 'bearer', 'authorization',
      'session', 'sessionid', 'cookie', 'userid', 'private_key',
      'certificate', 'cert', 'pwd', 'pass'
    ];
    
    sensitiveParams.forEach(param => {
      urlObj.searchParams.delete(param);
    });
    
    return urlObj.toString();
  } catch {
    // Se não for uma URL válida, sanitizar como string
    return sanitizeString(url);
  }
}

/**
 * Sanitiza dados do usuário mantendo apenas informações seguras
 */
export function sanitizeUserData(user: any): any {
  if (!user || typeof user !== 'object') return user;
  
  return {
    id: user.id ? '[REDACTED_ID]' : undefined,
    email: user.email ? sanitizeEmail(user.email) : undefined,
    name: user.name || user.full_name || undefined,
    role: user.role || undefined,
    // Remover outros campos sensíveis
  };
}

/**
 * Sanitiza email mantendo apenas parte visível
 */
export function sanitizeEmail(email: string): string {
  if (!email || typeof email !== 'string') return email;
  
  const [local, domain] = email.split('@');
  if (!domain) return email;
  
  if (local.length <= 2) {
    return `${local}***@${domain}`;
  }
  
  return `${local.slice(0, 2)}***@${domain}`;
}

/**
 * Verifica se uma string contém dados sensíveis
 */
export function containsSensitiveData(text: string): boolean {
  if (!text || typeof text !== 'string') return false;
  
  return SENSITIVE_PATTERNS.some(pattern => pattern.test(text)) ||
         SENSITIVE_FIELDS.some(field => text.toLowerCase().includes(field));
}

/**
 * Log de segurança para monitorar tentativas de vazamento
 */
export function logSensitiveDataAttempt(originalData: any, sanitizedData: any, source: string): void {
  if (process.env.NODE_ENV === 'development') {
    console.warn('🔒 SENSITIVE_DATA - Dados sensíveis detectados e sanitizados:', {
      source,
      originalLength: JSON.stringify(originalData).length,
      sanitizedLength: JSON.stringify(sanitizedData).length,
      timestamp: new Date().toISOString()
    });
  }
}

/**
 * Sanitização adicional para stack traces específicos
 */
export function sanitizeStackTrace(stack: string): string {
  if (!stack) return stack;
  
  let sanitized = stack;
  
  // Remover números de linha e coluna que podem conter dados sensíveis
  sanitized = sanitized.replace(/:\d+:\d+/g, ':LINE:COL');
  
  // Remover caminhos absolutos que podem conter informações sensíveis
  sanitized = sanitized.replace(/\/[^\/]+\/[^\/]+\/[^\/]+/g, '/PATH');
  
  // Remover hashes de build
  sanitized = sanitized.replace(/[a-f0-9]{8,}/g, 'HASH');
  
  // Aplicar sanitização geral
  return sanitizeString(sanitized);
}
