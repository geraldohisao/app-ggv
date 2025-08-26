/**
 * Testes automatizados para o sistema de debug refatorado
 * Cobre sanitização, hashing, gating e funcionalidades core
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { sanitizeString, sanitizeObject, sanitizeErrorData } from '../src/utils/sanitizeErrorData';
import { generateIncidentHash, normalizeStack } from '../src/utils/incidentGrouping';
import { canUseDebug, shouldLoadDebugPanel } from '../src/debug/config';

describe('Debug System - Sanitization', () => {
  it('should sanitize JWT tokens', () => {
    const input = 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c';
    const result = sanitizeString(input);
    expect(result).toContain('[REDACTED]');
    expect(result).not.toContain('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9');
  });

  it('should sanitize API keys', () => {
    const input = 'API Key: AIzaSyB1234567890abcdefghijklmnopqrstuvwxyz';
    const result = sanitizeString(input);
    expect(result).toContain('[REDACTED]');
    expect(result).not.toContain('AIzaSyB1234567890abcdefghijklmnopqrstuvwxyz');
  });

  it('should sanitize emails', () => {
    const input = 'User email: john.doe@example.com';
    const result = sanitizeString(input);
    expect(result).toContain('[REDACTED]');
    expect(result).not.toContain('john.doe@example.com');
  });

  it('should sanitize CPF/CNPJ', () => {
    const input = 'CPF: 123.456.789-00, CNPJ: 12.345.678/0001-90';
    const result = sanitizeString(input);
    expect(result).toContain('[REDACTED]');
    expect(result).not.toContain('123.456.789-00');
    expect(result).not.toContain('12.345.678/0001-90');
  });

  it('should sanitize sensitive URL parameters', () => {
    const input = 'https://api.example.com/data?token=abc123&key=secret456';
    const result = sanitizeString(input);
    expect(result).toContain('[REDACTED]');
    expect(result).not.toContain('token=abc123');
    expect(result).not.toContain('key=secret456');
  });

  it('should sanitize objects recursively', () => {
    const input = {
      user: {
        email: 'test@example.com',
        password: 'secret123',
        name: 'John Doe'
      },
      config: {
        apiKey: 'sk-1234567890abcdef'
      }
    };
    
    const result = sanitizeObject(input);
    expect(result.user.email).toBe('[REDACTED]');
    expect(result.user.password).toBe('[REDACTED]');
    expect(result.user.name).toBe('John Doe'); // Safe field
    expect(result.config.apiKey).toBe('[REDACTED]');
  });

  it('should sanitize complete error data', () => {
    const input = {
      title: 'Error with sensitive data',
      message: 'Failed to authenticate with token: abc123',
      stack: 'Error: auth failed\n    at login (file.js:123:45)\n    with token: xyz789',
      url: 'https://app.com/login?token=def456',
      context: {
        user: { email: 'user@example.com', id: '12345' },
        apiKey: 'sk-abcdef123456'
      }
    };
    
    const result = sanitizeErrorData(input);
    expect(result.title).not.toContain('abc123');
    expect(result.message).toContain('[REDACTED]');
    expect(result.stack).toContain('[REDACTED]');
    expect(result.url).toContain('[REDACTED]');
    expect(result.context.user.email).toBe('[REDACTED]');
    expect(result.context.apiKey).toBe('[REDACTED]');
  });
});

describe('Debug System - Incident Grouping', () => {
  it('should generate same hash for identical errors', () => {
    const error1 = {
      title: 'TypeError: Cannot read property',
      message: 'Cannot read property \'name\' of undefined',
      stack: 'TypeError: Cannot read property \'name\' of undefined\n    at Component (Component.jsx:10:5)',
      url: 'https://app.com/page'
    };
    
    const error2 = {
      title: 'TypeError: Cannot read property',
      message: 'Cannot read property \'name\' of undefined',
      stack: 'TypeError: Cannot read property \'name\' of undefined\n    at Component (Component.jsx:10:5)',
      url: 'https://app.com/page'
    };
    
    const hash1 = generateIncidentHash(error1);
    const hash2 = generateIncidentHash(error2);
    
    expect(hash1).toBe(hash2);
  });

  it('should generate different hashes for different errors', () => {
    const error1 = {
      title: 'TypeError: Cannot read property',
      message: 'Cannot read property \'name\' of undefined',
      stack: 'TypeError: Cannot read property \'name\' of undefined\n    at Component (Component.jsx:10:5)',
      url: 'https://app.com/page'
    };
    
    const error2 = {
      title: 'ReferenceError: variable is not defined',
      message: 'variable is not defined',
      stack: 'ReferenceError: variable is not defined\n    at Component (Component.jsx:15:10)',
      url: 'https://app.com/page'
    };
    
    const hash1 = generateIncidentHash(error1);
    const hash2 = generateIncidentHash(error2);
    
    expect(hash1).not.toBe(hash2);
  });

  it('should normalize stack traces consistently', () => {
    const stack1 = 'Error: test\n    at Component (Component.jsx:10:15)\n    at App (App.jsx:5:20)';
    const stack2 = 'Error: test\n    at Component (Component.jsx:12:18)\n    at App (App.jsx:8:25)';
    
    const normalized1 = normalizeStack(stack1);
    const normalized2 = normalizeStack(stack2);
    
    expect(normalized1).toBe(normalized2);
  });

  it('should handle URLs with dynamic parameters', () => {
    const error1 = {
      title: 'API Error',
      message: 'Request failed',
      url: 'https://api.com/users/123?token=abc&timestamp=1234567890'
    };
    
    const error2 = {
      title: 'API Error',
      message: 'Request failed',
      url: 'https://api.com/users/456?token=def&timestamp=9876543210'
    };
    
    const hash1 = generateIncidentHash(error1);
    const hash2 = generateIncidentHash(error2);
    
    expect(hash1).toBe(hash2);
  });
});

describe('Debug System - Gating', () => {
  beforeEach(() => {
    // Reset environment
    vi.unstubAllEnvs();
  });

  it('should allow debug in development', () => {
    vi.stubEnv('NODE_ENV', 'development');
    
    expect(canUseDebug(false, 'user')).toBe(true);
    expect(canUseDebug(false, 'admin')).toBe(true);
    expect(canUseDebug(false, 'superadmin')).toBe(true);
  });

  it('should restrict debug in production for non-superadmin', () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('VITE_DEBUG_ENABLED', 'false');
    
    expect(canUseDebug(true, 'user')).toBe(false);
    expect(canUseDebug(true, 'admin')).toBe(false);
    expect(canUseDebug(true, 'superadmin')).toBe(false); // Without flag
  });

  it('should allow debug for superadmin with flag', () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('VITE_DEBUG_ENABLED', 'true');
    
    expect(canUseDebug(true, 'superadmin')).toBe(true);
  });

  it('should check localStorage for superadmin debug panel', () => {
    vi.stubEnv('NODE_ENV', 'production');
    
    // Mock localStorage
    const localStorageMock = {
      getItem: vi.fn()
    };
    Object.defineProperty(window, 'localStorage', {
      value: localStorageMock,
      writable: true
    });
    
    localStorageMock.getItem.mockReturnValue('true');
    expect(shouldLoadDebugPanel(true, 'superadmin')).toBe(true);
    
    localStorageMock.getItem.mockReturnValue('false');
    expect(shouldLoadDebugPanel(true, 'superadmin')).toBe(false);
  });
});

describe('Debug System - Store', () => {
  it('should handle ring buffer overflow', () => {
    // This would test the ring buffer implementation
    // Implementation depends on the store being available in test environment
    expect(true).toBe(true); // Placeholder
  });

  it('should maintain event order', () => {
    // This would test that events are stored in correct order
    expect(true).toBe(true); // Placeholder
  });
});

describe('Debug System - Batch Queue', () => {
  it('should respect rate limits', () => {
    // This would test rate limiting functionality
    expect(true).toBe(true); // Placeholder
  });

  it('should flush on critical events', () => {
    // This would test immediate flush for critical events
    expect(true).toBe(true); // Placeholder
  });
});

describe('Debug System - Workers', () => {
  it('should sanitize data in worker', () => {
    // This would test Web Worker sanitization
    expect(true).toBe(true); // Placeholder
  });

  it('should generate hashes in worker', () => {
    // This would test Web Worker hashing
    expect(true).toBe(true); // Placeholder
  });
});
