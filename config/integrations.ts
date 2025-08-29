// integrations.ts - Configurações para integrações futuras

// =========================================
// CONFIGURAÇÕES DE AI/ML
// =========================================

export interface AIConfig {
  readonly provider: 'openai' | 'anthropic' | 'google' | 'azure';
  readonly apiKey: string;
  readonly model: string;
  readonly maxTokens: number;
  readonly temperature: number;
}

export interface CallAnalysisConfig {
  readonly sentiment: {
    enabled: boolean;
    threshold: number; // 0-1
  };
  readonly keywords: {
    enabled: boolean;
    categories: readonly string[];
  };
  readonly summary: {
    enabled: boolean;
    maxLength: number;
  };
  readonly scoring: {
    enabled: boolean;
    criteria: readonly string[];
  };
}

export const AI_CONFIG: AIConfig = {
  provider: 'openai',
  apiKey: process.env.OPENAI_API_KEY || '',
  model: 'gpt-4-turbo-preview',
  maxTokens: 2000,
  temperature: 0.3
};

export const CALL_ANALYSIS_CONFIG: CallAnalysisConfig = {
  sentiment: {
    enabled: true,
    threshold: 0.7
  },
  keywords: {
    enabled: true,
    categories: [
      'objeções',
      'interesse',
      'decisor',
      'orçamento',
      'timeline',
      'concorrência',
      'necessidades'
    ]
  },
  summary: {
    enabled: true,
    maxLength: 500
  },
  scoring: {
    enabled: true,
    criteria: [
      'abertura',
      'descoberta',
      'apresentacao',
      'objecoes',
      'fechamento'
    ]
  }
};

// =========================================
// CONFIGURAÇÕES MOBILE
// =========================================

export interface MobileConfig {
  readonly pushNotifications: {
    enabled: boolean;
    vapidKey: string;
    topics: readonly string[];
  };
  readonly offline: {
    enabled: boolean;
    syncInterval: number; // minutes
    maxCacheSize: number; // MB
  };
  readonly biometrics: {
    enabled: boolean;
    fallbackToPin: boolean;
  };
}

export const MOBILE_CONFIG: MobileConfig = {
  pushNotifications: {
    enabled: true,
    vapidKey: process.env.VAPID_KEY || '',
    topics: [
      'new_call',
      'call_analyzed',
      'high_score',
      'missed_call',
      'daily_summary'
    ]
  },
  offline: {
    enabled: true,
    syncInterval: 15,
    maxCacheSize: 50
  },
  biometrics: {
    enabled: true,
    fallbackToPin: true
  }
};

// =========================================
// CONFIGURAÇÕES DE INTEGRAÇÃO
// =========================================

export interface IntegrationConfig {
  readonly pipedrive: {
    enabled: boolean;
    apiToken: string;
    webhookUrl: string;
    syncInterval: number; // minutes
  };
  readonly hubspot: {
    enabled: boolean;
    apiKey: string;
    portalId: string;
  };
  readonly salesforce: {
    enabled: boolean;
    clientId: string;
    clientSecret: string;
    instanceUrl: string;
  };
  readonly slack: {
    enabled: boolean;
    webhookUrl: string;
    channels: readonly string[];
  };
  readonly teams: {
    enabled: boolean;
    webhookUrl: string;
  };
}

export const INTEGRATION_CONFIG: IntegrationConfig = {
  pipedrive: {
    enabled: true,
    apiToken: process.env.PIPEDRIVE_API_TOKEN || '',
    webhookUrl: process.env.PIPEDRIVE_WEBHOOK_URL || '',
    syncInterval: 30
  },
  hubspot: {
    enabled: false,
    apiKey: process.env.HUBSPOT_API_KEY || '',
    portalId: process.env.HUBSPOT_PORTAL_ID || ''
  },
  salesforce: {
    enabled: false,
    clientId: process.env.SALESFORCE_CLIENT_ID || '',
    clientSecret: process.env.SALESFORCE_CLIENT_SECRET || '',
    instanceUrl: process.env.SALESFORCE_INSTANCE_URL || ''
  },
  slack: {
    enabled: true,
    webhookUrl: process.env.SLACK_WEBHOOK_URL || '',
    channels: ['#vendas', '#calls', '#alerts']
  },
  teams: {
    enabled: false,
    webhookUrl: process.env.TEAMS_WEBHOOK_URL || ''
  }
};

// =========================================
// CONFIGURAÇÕES DE CACHE E PERFORMANCE
// =========================================

export interface CacheConfig {
  readonly redis: {
    enabled: boolean;
    url: string;
    ttl: {
      dashboard: number; // seconds
      calls: number;
      sdrs: number;
      search: number;
    };
  };
  readonly cdn: {
    enabled: boolean;
    baseUrl: string;
    audioPath: string;
  };
  readonly compression: {
    enabled: boolean;
    level: number; // 1-9
    threshold: number; // bytes
  };
}

export const CACHE_CONFIG: CacheConfig = {
  redis: {
    enabled: process.env.REDIS_URL ? true : false,
    url: process.env.REDIS_URL || 'redis://localhost:6379',
    ttl: {
      dashboard: 300, // 5 minutes
      calls: 60,      // 1 minute
      sdrs: 600,      // 10 minutes
      search: 120     // 2 minutes
    }
  },
  cdn: {
    enabled: true,
    baseUrl: process.env.CDN_BASE_URL || 'https://cdn.grupoggv.com',
    audioPath: '/calls/audio'
  },
  compression: {
    enabled: true,
    level: 6,
    threshold: 1024 // 1KB
  }
};

// =========================================
// CONFIGURAÇÕES DE MONITORAMENTO
// =========================================

export interface MonitoringConfig {
  readonly sentry: {
    enabled: boolean;
    dsn: string;
    environment: string;
    sampleRate: number;
  };
  readonly analytics: {
    enabled: boolean;
    provider: 'google' | 'mixpanel' | 'amplitude';
    trackingId: string;
  };
  readonly logging: {
    level: 'debug' | 'info' | 'warn' | 'error';
    structured: boolean;
    destination: 'console' | 'file' | 'remote';
  };
}

export const MONITORING_CONFIG: MonitoringConfig = {
  sentry: {
    enabled: process.env.NODE_ENV === 'production',
    dsn: process.env.SENTRY_DSN || '',
    environment: process.env.NODE_ENV || 'development',
    sampleRate: 0.1
  },
  analytics: {
    enabled: true,
    provider: 'google',
    trackingId: process.env.GA_TRACKING_ID || ''
  },
  logging: {
    level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
    structured: true,
    destination: process.env.NODE_ENV === 'production' ? 'remote' : 'console'
  }
};

// =========================================
// CONFIGURAÇÕES DE SEGURANÇA
// =========================================

export interface SecurityConfig {
  readonly rateLimit: {
    enabled: boolean;
    windowMs: number;
    maxRequests: number;
    skipSuccessfulRequests: boolean;
  };
  readonly cors: {
    enabled: boolean;
    origins: readonly string[];
    credentials: boolean;
  };
  readonly encryption: {
    algorithm: string;
    keyLength: number;
    ivLength: number;
  };
  readonly jwt: {
    secret: string;
    expiresIn: string;
    refreshExpiresIn: string;
  };
}

export const SECURITY_CONFIG: SecurityConfig = {
  rateLimit: {
    enabled: true,
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 100,
    skipSuccessfulRequests: false
  },
  cors: {
    enabled: true,
    origins: [
      'https://app.grupoggv.com',
      'https://staging.grupoggv.com',
      'http://localhost:3000'
    ],
    credentials: true
  },
  encryption: {
    algorithm: 'aes-256-gcm',
    keyLength: 32,
    ivLength: 16
  },
  jwt: {
    secret: process.env.JWT_SECRET || 'your-super-secret-key',
    expiresIn: '24h',
    refreshExpiresIn: '7d'
  }
};

// =========================================
// CONFIGURAÇÕES DE FEATURE FLAGS
// =========================================

export interface FeatureFlags {
  readonly enableAIAnalysis: boolean;
  readonly enableRealTimeUpdates: boolean;
  readonly enableAdvancedFilters: boolean;
  readonly enableMobileApp: boolean;
  readonly enableVoiceCommands: boolean;
  readonly enablePredictiveAnalytics: boolean;
  readonly enableAutomatedReports: boolean;
  readonly enableIntegrationHub: boolean;
}

export const FEATURE_FLAGS: FeatureFlags = {
  enableAIAnalysis: process.env.FEATURE_AI_ANALYSIS === 'true',
  enableRealTimeUpdates: process.env.FEATURE_REALTIME === 'true',
  enableAdvancedFilters: process.env.FEATURE_ADVANCED_FILTERS === 'true',
  enableMobileApp: process.env.FEATURE_MOBILE === 'true',
  enableVoiceCommands: process.env.FEATURE_VOICE === 'true',
  enablePredictiveAnalytics: process.env.FEATURE_PREDICTIVE === 'true',
  enableAutomatedReports: process.env.FEATURE_REPORTS === 'true',
  enableIntegrationHub: process.env.FEATURE_INTEGRATIONS === 'true'
};

// =========================================
// HELPER FUNCTIONS
// =========================================

export function isFeatureEnabled(feature: keyof FeatureFlags): boolean {
  return FEATURE_FLAGS[feature];
}

export function getAIConfig(): AIConfig {
  return AI_CONFIG;
}

export function getCacheConfig(): CacheConfig {
  return CACHE_CONFIG;
}

export function getIntegrationConfig(): IntegrationConfig {
  return INTEGRATION_CONFIG;
}

// Validação de configurações
export function validateConfigurations(): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Validar AI Config
  if (FEATURE_FLAGS.enableAIAnalysis && !AI_CONFIG.apiKey) {
    errors.push('AI_CONFIG.apiKey is required when AI analysis is enabled');
  }

  // Validar Redis Config
  if (CACHE_CONFIG.redis.enabled && !CACHE_CONFIG.redis.url) {
    errors.push('CACHE_CONFIG.redis.url is required when Redis is enabled');
  }

  // Validar JWT Secret
  if (!SECURITY_CONFIG.jwt.secret || SECURITY_CONFIG.jwt.secret === 'your-super-secret-key') {
    errors.push('SECURITY_CONFIG.jwt.secret must be set to a secure value');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

// Export default config object
export const CONFIG = {
  ai: AI_CONFIG,
  mobile: MOBILE_CONFIG,
  integrations: INTEGRATION_CONFIG,
  cache: CACHE_CONFIG,
  monitoring: MONITORING_CONFIG,
  security: SECURITY_CONFIG,
  features: FEATURE_FLAGS,
  callAnalysis: CALL_ANALYSIS_CONFIG
} as const;
