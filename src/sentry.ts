/**
 * Sentry initialization and configuration
 * Centralizes error tracking setup for the GGV platform
 */

import * as Sentry from '@sentry/react';
import { sanitizeErrorData, sanitizeString, sanitizeObject } from './utils/sanitizeErrorData';

// Get DSN from environment variable (must be set in Netlify/Vercel env)
const SENTRY_DSN = import.meta.env.VITE_SENTRY_DSN || '';

// Environment detection
const environment = import.meta.env.MODE || 'development';
const isProduction = environment === 'production';

// Release version from build config
const release = (typeof window !== 'undefined' && (window as any).__APP_VERSION__) 
  ? `ggv-plataforma@${(window as any).__APP_VERSION__}`
  : undefined;

// Build ID for source map association
const buildId = (typeof window !== 'undefined' && (window as any).__APP_BUILD_ID__) || undefined;

/**
 * Initialize Sentry with GGV-specific configuration
 */
export function initSentry(): void {
  // Skip initialization if no DSN is configured
  if (!SENTRY_DSN) {
    if (!isProduction) {
      console.log('🔍 Sentry: DSN not configured, skipping initialization');
    }
    return;
  }

  Sentry.init({
    dsn: SENTRY_DSN,
    environment,
    release,
    
    // Performance monitoring - sample 10% of transactions in production
    tracesSampleRate: isProduction ? 0.1 : 1.0,
    
    // Session replay - capture 10% of sessions, 100% of sessions with errors
    replaysSessionSampleRate: isProduction ? 0.1 : 0,
    replaysOnErrorSampleRate: isProduction ? 1.0 : 0,
    
    // Only send errors in production by default
    enabled: isProduction || import.meta.env.VITE_SENTRY_ENABLED === 'true',
    
    // Integrations
    integrations: [
      // Browser tracing for performance monitoring
      Sentry.browserTracingIntegration({
        // Track navigation and interactions
        enableInp: true,
      }),
      // Replay integration for session recording (only in production)
      ...(isProduction ? [Sentry.replayIntegration({
        maskAllText: true,
        blockAllMedia: true,
      })] : []),
    ],
    
    // Attach build metadata
    dist: buildId,
    
    // Normalize depth for context data
    normalizeDepth: 5,
    
    // Maximum breadcrumbs to keep
    maxBreadcrumbs: 50,
    
    // Filter sensitive data before sending
    beforeSend(event, hint) {
      return sanitizeEvent(event, hint);
    },
    
    // Filter breadcrumbs for sensitive data
    beforeBreadcrumb(breadcrumb) {
      return sanitizeBreadcrumb(breadcrumb);
    },
    
    // Ignore common non-actionable errors
    ignoreErrors: [
      // Browser extensions
      'top.GLOBALS',
      'originalCreateNotification',
      'canvas.contentDocument',
      'MyApp_RemoveAllHighlights',
      'http://tt.telekomservicecenter.de',
      'java://',
      'chrome-extension://',
      'moz-extension://',
      
      // Network errors that are usually transient
      'Network request failed',
      'NetworkError',
      'Failed to fetch',
      'Load failed',
      'AbortError',
      
      // User-initiated actions
      'ResizeObserver loop limit exceeded',
      'ResizeObserver loop completed with undelivered notifications',
      
      // Common third-party script issues
      'Script error.',
      'Script error',
    ],
    
    // Deny URLs from third-party scripts
    denyUrls: [
      // Chrome extensions
      /extensions\//i,
      /^chrome:\/\//i,
      /^chrome-extension:\/\//i,
      /^moz-extension:\/\//i,
      
      // Common third-party scripts
      /graph\.facebook\.com/i,
      /connect\.facebook\.net/i,
      /googletagmanager\.com/i,
      /google-analytics\.com/i,
    ],
    
    // Allow only our domains
    allowUrls: [
      /app\.grupoggv\.com/i,
      /localhost/i,
      /127\.0\.0\.1/i,
      /netlify\.app/i,
    ],
  });

  // Set initial tags
  Sentry.setTag('app.domain', (typeof window !== 'undefined' && (window as any).__APP_DOMAIN__) || 'unknown');
  Sentry.setTag('build.id', buildId || 'unknown');
  
  if (!isProduction) {
    console.log('✅ Sentry: Initialized', { environment, release, buildId });
  }
}

/**
 * Set user context for Sentry (call when user logs in)
 */
export function setSentryUser(user: {
  id?: string;
  email?: string;
  name?: string;
  role?: string;
} | null): void {
  if (!SENTRY_DSN) return;
  
  if (user) {
    Sentry.setUser({
      id: user.id,
      email: user.email ? maskEmail(user.email) : undefined,
      username: user.name,
    });
    Sentry.setTag('user.role', user.role || 'unknown');
  } else {
    Sentry.setUser(null);
    Sentry.setTag('user.role', 'anonymous');
  }
}

/**
 * Clear user context (call when user logs out)
 */
export function clearSentryUser(): void {
  if (!SENTRY_DSN) return;
  Sentry.setUser(null);
}

/**
 * Capture an exception with additional context
 */
export function captureException(
  error: Error | unknown,
  context?: Record<string, any>
): string | undefined {
  if (!SENTRY_DSN) {
    console.error('Sentry not configured, error not captured:', error);
    return undefined;
  }
  
  const sanitizedContext = context ? sanitizeObject(context) : undefined;
  
  return Sentry.captureException(error, {
    extra: sanitizedContext,
  });
}

/**
 * Capture a message with severity level
 */
export function captureMessage(
  message: string,
  level: 'fatal' | 'error' | 'warning' | 'info' | 'debug' = 'info',
  context?: Record<string, any>
): string | undefined {
  if (!SENTRY_DSN) {
    console.log(`Sentry message (${level}):`, message);
    return undefined;
  }
  
  const sanitizedMessage = sanitizeString(message);
  const sanitizedContext = context ? sanitizeObject(context) : undefined;
  
  return Sentry.captureMessage(sanitizedMessage, {
    level,
    extra: sanitizedContext,
  });
}

/**
 * Add breadcrumb for debugging
 */
export function addBreadcrumb(
  category: string,
  message: string,
  data?: Record<string, any>,
  level: Sentry.SeverityLevel = 'info'
): void {
  if (!SENTRY_DSN) return;
  
  Sentry.addBreadcrumb({
    category,
    message: sanitizeString(message),
    data: data ? sanitizeObject(data) : undefined,
    level,
    timestamp: Date.now() / 1000,
  });
}

/**
 * Set additional context/tags
 */
export function setContext(name: string, context: Record<string, any>): void {
  if (!SENTRY_DSN) return;
  Sentry.setContext(name, sanitizeObject(context));
}

/**
 * Set a tag
 */
export function setTag(key: string, value: string): void {
  if (!SENTRY_DSN) return;
  Sentry.setTag(key, value);
}

// ============================================================
// Internal helpers
// ============================================================

/**
 * Mask email for privacy (show first 2 chars + domain)
 */
function maskEmail(email: string): string {
  if (!email || !email.includes('@')) return email;
  const [local, domain] = email.split('@');
  if (local.length <= 2) return `${local}***@${domain}`;
  return `${local.slice(0, 2)}***@${domain}`;
}

/**
 * Sanitize Sentry event before sending
 */
function sanitizeEvent(
  event: Sentry.ErrorEvent,
  _hint: Sentry.EventHint
): Sentry.ErrorEvent | null {
  // Sanitize exception messages
  if (event.exception?.values) {
    event.exception.values = event.exception.values.map(exc => ({
      ...exc,
      value: exc.value ? sanitizeString(exc.value) : exc.value,
    }));
  }
  
  // Sanitize message
  if (event.message) {
    event.message = sanitizeString(event.message);
  }
  
  // Sanitize extra context
  if (event.extra) {
    event.extra = sanitizeObject(event.extra);
  }
  
  // Sanitize request data
  if (event.request) {
    if (event.request.url) {
      event.request.url = sanitizeUrlString(event.request.url);
    }
    if (event.request.query_string) {
      event.request.query_string = '[REDACTED]';
    }
    if (event.request.cookies) {
      event.request.cookies = '[REDACTED]';
    }
    if (event.request.headers) {
      const sensitiveHeaders = ['authorization', 'cookie', 'x-api-key', 'x-auth-token'];
      for (const header of sensitiveHeaders) {
        if (event.request.headers[header]) {
          event.request.headers[header] = '[REDACTED]';
        }
      }
    }
  }
  
  // Sanitize user data
  if (event.user?.email) {
    event.user.email = maskEmail(event.user.email);
  }
  
  return event;
}

/**
 * Sanitize breadcrumb before storing
 */
function sanitizeBreadcrumb(
  breadcrumb: Sentry.Breadcrumb
): Sentry.Breadcrumb | null {
  // Skip noisy breadcrumbs
  if (breadcrumb.category === 'console' && breadcrumb.level === 'debug') {
    return null;
  }
  
  // Sanitize message
  if (breadcrumb.message) {
    breadcrumb.message = sanitizeString(breadcrumb.message);
  }
  
  // Sanitize URL in fetch/xhr breadcrumbs
  if (breadcrumb.category === 'fetch' || breadcrumb.category === 'xhr') {
    if (breadcrumb.data?.url) {
      breadcrumb.data.url = sanitizeUrlString(breadcrumb.data.url);
    }
  }
  
  // Sanitize data
  if (breadcrumb.data) {
    breadcrumb.data = sanitizeObject(breadcrumb.data);
  }
  
  return breadcrumb;
}

/**
 * Sanitize URL removing sensitive query params
 */
function sanitizeUrlString(url: string): string {
  if (!url) return url;
  
  try {
    const urlObj = new URL(url, window.location.origin);
    const sensitiveParams = ['token', 'key', 'auth', 'password', 'secret', 'api_key', 'access_token'];
    sensitiveParams.forEach(param => urlObj.searchParams.delete(param));
    return urlObj.toString();
  } catch {
    return url;
  }
}

// Re-export Sentry for advanced usage
export { Sentry };
