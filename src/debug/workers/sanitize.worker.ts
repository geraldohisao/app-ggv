/**
 * Web Worker para sanitização de dados sensíveis
 * Processa payloads de erro em background thread
 */

// Nota: implementação local definida no final do arquivo para evitar conflitos de import

export interface SanitizeRequest {
  id: string;
  payload: {
    title: string;
    message: string;
    stack?: string;
    url?: string;
    context?: Record<string, any>;
    user?: any;
  };
}

export interface SanitizeResponse {
  id: string;
  sanitized: boolean;
  payload: any;
  warnings?: string[];
}

// Worker principal
self.onmessage = async (event: MessageEvent<SanitizeRequest>) => {
  const { id, payload } = event.data;
  
  try {
    const sanitizedPayload = sanitizeErrorData(payload);
    
    const response: SanitizeResponse = {
      id,
      sanitized: true,
      payload: sanitizedPayload,
    };
    
    self.postMessage(response);
  } catch (error) {
    const response: SanitizeResponse = {
      id,
      sanitized: false,
      payload: payload, // Retornar payload original em caso de erro
      warnings: [error instanceof Error ? error.message : String(error)],
    };
    
    self.postMessage(response);
  }
};

// Função de sanitização copiada para o worker
function sanitizeErrorData(errorData: any): any {
  const SENSITIVE_PATTERNS = [
    // JWT tokens
    /\b(eyJ[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]*)\b/g,
    // API keys
    /\b(api[_-]?key|apikey|access[_-]?key|secret[_-]?key)\s*[:=]\s*['"]?[a-zA-Z0-9]{20,}['"]?/gi,
    // Bearer tokens
    /\b(bearer)\s+[a-zA-Z0-9\-._~+/]+=*\b/gi,
    // URLs with tokens
    /[?&](token|key|password|secret|auth)=[^&\s]+/gi,
    // Emails
    /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
    // CPF/CNPJ
    /\b\d{3}\.?\d{3}\.?\d{3}-?\d{2}\b|\b\d{2}\.?\d{3}\.?\d{3}\/?\d{4}-?\d{2}\b/g,
    // Phones
    /\b\(\d{2}\)\s?\d{4,5}-?\d{4}\b|\b\d{2}\s?\d{4,5}-?\d{4}\b/g,
    // Long user IDs
    /\b(user[_-]?id|uid)\s*[:=]\s*['"]?[a-zA-Z0-9]{20,}['"]?/gi,
    // Session/cookie keys
    /\b(session[_-]?id|sessionid|cookie)\s*[:=]\s*['"]?[a-zA-Z0-9]{20,}['"]?/gi,
    // Private keys/certs
    /-----BEGIN\s+(PRIVATE\s+KEY|CERTIFICATE|RSA\s+PRIVATE\s+KEY)-----[\s\S]*?-----END\s+\1-----/gi,
    // Password hashes
    /\b(password|pwd|pass)\s*[:=]\s*['"]?\$2[aby]\$\d{1,2}\$[./A-Za-z0-9]{53}['"]?/gi,
  ];

  const SENSITIVE_FIELDS = [
    'password', 'token', 'apiKey', 'secret', 'privateKey', 'accessToken',
    'refreshToken', 'authorization', 'cookie', 'session', 'auth', 'credentials',
    'key', 'pwd', 'pass', 'sessionid', 'userid', 'certificate', 'cert'
  ];

  function sanitizeString(text: string): string {
    if (!text || typeof text !== 'string') return text;
    
    let sanitized = text;
    
    // Aplicar padrões sensíveis
    SENSITIVE_PATTERNS.forEach(pattern => {
      sanitized = sanitized.replace(pattern, '[REDACTED]');
    });
    
    // Filtrar linhas com campos sensíveis
    const lines = sanitized.split('\n');
    const filteredLines = lines.filter(line => {
      const lowerLine = line.toLowerCase();
      return !SENSITIVE_FIELDS.some(field => lowerLine.includes(field));
    });
    
    return filteredLines.join('\n');
  }

  function sanitizeObject(obj: any, maxDepth: number = 3): any {
    if (maxDepth <= 0 || obj === null || typeof obj !== 'object') {
      return obj;
    }

    if (Array.isArray(obj)) {
      return obj.map(item => sanitizeObject(item, maxDepth - 1));
    }

    const sanitized: any = {};
    for (const [key, value] of Object.entries(obj)) {
      const lowerKey = key.toLowerCase();
      
      // Pular campos sensíveis
      if (SENSITIVE_FIELDS.some(field => lowerKey.includes(field))) {
        sanitized[key] = '[REDACTED]';
        continue;
      }
      
      if (typeof value === 'string') {
        sanitized[key] = sanitizeString(value);
      } else if (typeof value === 'object' && value !== null) {
        sanitized[key] = sanitizeObject(value, maxDepth - 1);
      } else {
        sanitized[key] = value;
      }
    }
    
    return sanitized;
  }

  function sanitizeUrl(url: string): string {
    if (!url || typeof url !== 'string') return url;
    
    try {
      const urlObj = new URL(url);
      const params = urlObj.searchParams;
      
      // Remover parâmetros sensíveis
      const sensitiveParams = ['token', 'key', 'password', 'secret', 'auth', 'api_key'];
      sensitiveParams.forEach(param => {
        if (params.has(param)) {
          params.set(param, '[REDACTED]');
        }
      });
      
      return urlObj.toString();
    } catch {
      return sanitizeString(url);
    }
  }

  function sanitizeUserData(user: any): any {
    if (!user || typeof user !== 'object') return user;
    
    const sanitized = { ...user };
    
    // Redact user ID
    if (sanitized.id) {
      sanitized.id = '[REDACTED]';
    }
    
    // Mask email
    if (sanitized.email && typeof sanitized.email === 'string') {
      const [local, domain] = sanitized.email.split('@');
      if (local && domain) {
        const maskedLocal = local.length > 2 ? local.slice(0, 2) + '***' : '***';
        sanitized.email = `${maskedLocal}@${domain}`;
      }
    }
    
    // Keep safe fields
    const safeFields = ['name', 'role', 'created_at', 'updated_at'];
    Object.keys(sanitized).forEach(key => {
      if (!safeFields.includes(key)) {
        sanitized[key] = '[REDACTED]';
      }
    });
    
    return sanitized;
  }

  // Sanitizar dados do erro
  const sanitized = {
    title: sanitizeString(errorData.title),
    message: sanitizeString(errorData.message),
    stack: errorData.stack ? sanitizeString(errorData.stack) : undefined,
    url: errorData.url ? sanitizeUrl(errorData.url) : undefined,
    context: errorData.context ? sanitizeObject(errorData.context) : undefined,
    user: errorData.user ? sanitizeUserData(errorData.user) : undefined,
  };

  return sanitized;
}
