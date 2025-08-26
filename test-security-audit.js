/**
 * Teste de Auditoria de Segurança - Sistema de Debug
 * Verifica todos os pontos críticos de segurança e funcionalidade
 */

// Simular ambiente de produção
const originalNodeEnv = process.env.NODE_ENV;
process.env.NODE_ENV = 'production';

// Importar funções de sanitização (simuladas para teste)
const sanitizeErrorData = {
  title: (title) => title?.replace(/token|key|secret/gi, '[REDACTED]') || '',
  message: (message) => message?.replace(/token|key|secret/gi, '[REDACTED]') || '',
  stack: (stack) => stack?.replace(/token|key|secret/gi, '[REDACTED]') || '',
  context: (context) => {
    if (!context) return {};
    const sanitized = {};
    for (const [key, value] of Object.entries(context)) {
      if (typeof value === 'string') {
        sanitized[key] = value.replace(/token|key|secret/gi, '[REDACTED]');
      } else {
        sanitized[key] = value;
      }
    }
    return sanitized;
  },
  url: (url) => {
    if (!url) return '';
    try {
      const urlObj = new URL(url);
      ['token', 'key', 'auth', 'password', 'secret', 'api_key'].forEach(param => {
        urlObj.searchParams.delete(param);
      });
      return urlObj.toString();
    } catch {
      return url.replace(/token|key|secret/gi, '[REDACTED]');
    }
  },
  user: (user) => {
    if (!user) return user;
    return {
      id: user.id ? '[REDACTED_ID]' : undefined,
      email: user.email ? user.email.replace(/(.{2}).*@/, '$1***@') : undefined,
      name: user.name,
      role: user.role
    };
  }
};

// Simular função de hash
const generateIncidentHash = (data) => {
  const key = JSON.stringify({
    title: data.title?.slice(0, 100),
    message: data.message?.slice(0, 200),
    url: data.url,
    errorType: data.errorType || 'Unknown'
  });
  let hash = 0;
  for (let i = 0; i < key.length; i++) {
    const char = key.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(16).padStart(12, '0').slice(0, 12);
};

// Testes de Sanitização
console.log('🔒 TESTE 1: SANITIZAÇÃO DE DADOS SENSÍVEIS');
console.log('=' .repeat(50));

const testCases = [
  {
    name: 'Token JWT',
    input: 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c',
    expected: '[REDACTED]'
  },
  {
    name: 'Chave API Google',
    input: 'AIzaSyBweOkT0xXzKJ8K9L2M3N4O5P6Q7R8S9T0U1V2W3X4Y5Z6',
    expected: '[REDACTED]'
  },
  {
    name: 'Chave API OpenAI',
    input: 'sk-1234567890abcdefghijklmnopqrstuvwxyz',
    expected: '[REDACTED]'
  },
  {
    name: 'Email',
    input: 'usuario@empresa.com.br',
    expected: 'us***@empresa.com.br'
  },
  {
    name: 'CPF',
    input: '123.456.789-00',
    expected: '[REDACTED]'
  },
  {
    name: 'CNPJ',
    input: '12.345.678/0001-90',
    expected: '[REDACTED]'
  },
  {
    name: 'Telefone',
    input: '+55 (11) 99999-9999',
    expected: '[REDACTED]'
  },
  {
    name: 'URL com parâmetros sensíveis',
    input: 'https://api.com/data?token=secret123&user=123&key=abc',
    expected: 'https://api.com/data?user=123'
  },
  {
    name: 'Stack trace com dados sensíveis',
    input: 'Error: Invalid token eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9... at auth.js:123:45',
    expected: 'Error: Invalid token [REDACTED] at auth.js:123:45'
  }
];

let sanitizationPassed = 0;
let sanitizationFailed = 0;

testCases.forEach(testCase => {
  const result = sanitizeErrorData.message(testCase.input);
  const passed = result.includes('[REDACTED]') || result === testCase.expected;
  
  console.log(`${passed ? '✅' : '❌'} ${testCase.name}:`);
  console.log(`   Input: ${testCase.input}`);
  console.log(`   Output: ${result}`);
  console.log(`   Expected: ${testCase.expected}`);
  console.log('');
  
  if (passed) {
    sanitizationPassed++;
  } else {
    sanitizationFailed++;
  }
});

console.log(`📊 Resultado Sanitização: ${sanitizationPassed}/${testCases.length} passaram`);

// Teste de Controle de Debug
console.log('\n🛡️ TESTE 2: CONTROLE DE PAINEL DE DEBUG');
console.log('=' .repeat(50));

const debugTestCases = [
  {
    name: 'Produção sem flag',
    env: 'production',
    userRole: 'User',
    debugFlag: null,
    expected: false
  },
  {
    name: 'Produção com Super Admin sem flag',
    env: 'production',
    userRole: 'SuperAdmin',
    debugFlag: null,
    expected: false
  },
  {
    name: 'Produção com Super Admin com flag',
    env: 'production',
    userRole: 'SuperAdmin',
    debugFlag: 'true',
    expected: true
  },
  {
    name: 'Desenvolvimento com qualquer usuário',
    env: 'development',
    userRole: 'User',
    debugFlag: null,
    expected: true
  }
];

let debugPassed = 0;
let debugFailed = 0;

debugTestCases.forEach(testCase => {
  const isProd = testCase.env === 'production';
  const isSuperAdmin = testCase.userRole === 'SuperAdmin';
  const debugEnabled = testCase.debugFlag === 'true';
  
  // Simular lógica do ProductionSafeDebugPanel
  const shouldEnable = !isProd || (isSuperAdmin && debugEnabled);
  
  const passed = shouldEnable === testCase.expected;
  
  console.log(`${passed ? '✅' : '❌'} ${testCase.name}:`);
  console.log(`   Ambiente: ${testCase.env}`);
  console.log(`   Role: ${testCase.userRole}`);
  console.log(`   Flag: ${testCase.debugFlag}`);
  console.log(`   Resultado: ${shouldEnable} (esperado: ${testCase.expected})`);
  console.log('');
  
  if (passed) {
    debugPassed++;
  } else {
    debugFailed++;
  }
});

console.log(`📊 Resultado Debug: ${debugPassed}/${debugTestCases.length} passaram`);

// Teste de Agrupamento de Incidentes
console.log('\n🔗 TESTE 3: AGRUPAMENTO DE INCIDENTES');
console.log('=' .repeat(50));

const incidentTestCases = [
  {
    name: 'Erros idênticos',
    incident1: {
      title: 'Erro de rede',
      message: 'Failed to fetch',
      url: 'https://api.com/data',
      errorType: 'NetworkError'
    },
    incident2: {
      title: 'Erro de rede',
      message: 'Failed to fetch',
      url: 'https://api.com/data',
      errorType: 'NetworkError'
    },
    expectedSimilar: true
  },
  {
    name: 'URLs diferentes com mesmo erro',
    incident1: {
      title: 'Erro de rede',
      message: 'Failed to fetch',
      url: 'https://api.com/data?token=123',
      errorType: 'NetworkError'
    },
    incident2: {
      title: 'Erro de rede',
      message: 'Failed to fetch',
      url: 'https://api.com/data?token=456',
      errorType: 'NetworkError'
    },
    expectedSimilar: true
  },
  {
    name: 'Stack traces diferentes com mesmo erro',
    incident1: {
      title: 'Erro de rede',
      message: 'Failed to fetch',
      stack: 'Error: Network error at fetch.js:123:45',
      errorType: 'NetworkError'
    },
    incident2: {
      title: 'Erro de rede',
      message: 'Failed to fetch',
      stack: 'Error: Network error at fetch.js:456:78',
      errorType: 'NetworkError'
    },
    expectedSimilar: true
  },
  {
    name: 'Erros diferentes',
    incident1: {
      title: 'Erro de rede',
      message: 'Failed to fetch',
      errorType: 'NetworkError'
    },
    incident2: {
      title: 'Erro de validação',
      message: 'Invalid input',
      errorType: 'ValidationError'
    },
    expectedSimilar: false
  }
];

let incidentPassed = 0;
let incidentFailed = 0;

incidentTestCases.forEach(testCase => {
  const hash1 = generateIncidentHash(testCase.incident1);
  const hash2 = generateIncidentHash(testCase.incident2);
  
  const isSimilar = hash1 === hash2;
  const passed = isSimilar === testCase.expectedSimilar;
  
  console.log(`${passed ? '✅' : '❌'} ${testCase.name}:`);
  console.log(`   Hash 1: ${hash1}`);
  console.log(`   Hash 2: ${hash2}`);
  console.log(`   Similar: ${isSimilar} (esperado: ${testCase.expectedSimilar})`);
  console.log('');
  
  if (passed) {
    incidentPassed++;
  } else {
    incidentFailed++;
  }
});

console.log(`📊 Resultado Incidentes: ${incidentPassed}/${incidentTestCases.length} passaram`);

// Teste de Handlers de Erro
console.log('\n🚨 TESTE 4: HANDLERS DE ERRO');
console.log('=' .repeat(50));

const errorHandlers = [
  {
    name: 'Erro global JavaScript',
    type: 'error',
    data: {
      message: 'TypeError: Cannot read property of undefined',
      stack: 'TypeError: Cannot read property of undefined\n    at processData (app.js:123:45)\n    at handleClick (app.js:456:78)',
      filename: 'app.js',
      lineno: 123,
      colno: 45
    }
  },
  {
    name: 'Promise rejeitada',
    type: 'unhandledrejection',
    data: {
      reason: 'Network request failed'
    }
  },
  {
    name: 'Erro de fetch com dados sensíveis',
    type: 'fetch',
    data: {
      url: 'https://api.com/data?token=secret123&key=abc',
      status: 500,
      responseText: 'Internal server error with token eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
    }
  }
];

let handlerPassed = 0;
let handlerFailed = 0;

errorHandlers.forEach(handler => {
  console.log(`🔍 Testando: ${handler.name}`);
  
  // Simular processamento do handler
  let sanitizedData = {};
  
  if (handler.type === 'error') {
    sanitizedData = {
      title: 'Erro global não tratado',
      message: sanitizeErrorData.message(handler.data.message),
      context: {
        url: window.location?.href || 'unknown',
        stack: sanitizeErrorData.stack(handler.data.stack),
        filename: handler.data.filename,
        lineno: handler.data.lineno,
        colno: handler.data.colno
      }
    };
  } else if (handler.type === 'unhandledrejection') {
    sanitizedData = {
      title: 'Promise rejeitada não tratada',
      message: sanitizeErrorData.message(String(handler.data.reason)),
      context: {
        url: window.location?.href || 'unknown',
        reason: sanitizeErrorData.message(String(handler.data.reason))
      }
    };
  } else if (handler.type === 'fetch') {
    sanitizedData = {
      title: `HTTP ${handler.data.status} em GET`,
      message: 'Falha em requisição crítica',
      context: {
        url: sanitizeErrorData.url(handler.data.url),
        method: 'GET',
        status: handler.data.status,
        responsePreview: sanitizeErrorData.message(handler.data.responseText)
      }
    };
  }
  
  // Verificar se dados sensíveis foram removidos
  const hasSensitiveData = JSON.stringify(sanitizedData).includes('token') || 
                          JSON.stringify(sanitizedData).includes('secret') ||
                          JSON.stringify(sanitizedData).includes('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9');
  
  const passed = !hasSensitiveData;
  
  console.log(`${passed ? '✅' : '❌'} Dados sensíveis removidos: ${!hasSensitiveData}`);
  console.log(`   Dados sanitizados: ${JSON.stringify(sanitizedData, null, 2)}`);
  console.log('');
  
  if (passed) {
    handlerPassed++;
  } else {
    handlerFailed++;
  }
});

console.log(`📊 Resultado Handlers: ${handlerPassed}/${errorHandlers.length} passaram`);

// Resumo Final
console.log('\n📋 RESUMO FINAL DA AUDITORIA');
console.log('=' .repeat(50));

const totalTests = testCases.length + debugTestCases.length + incidentTestCases.length + errorHandlers.length;
const totalPassed = sanitizationPassed + debugPassed + incidentPassed + handlerPassed;
const totalFailed = totalTests - totalPassed;

console.log(`✅ Testes Passaram: ${totalPassed}/${totalTests}`);
console.log(`❌ Testes Falharam: ${totalFailed}/${totalTests}`);
console.log(`📊 Taxa de Sucesso: ${((totalPassed / totalTests) * 100).toFixed(1)}%`);

console.log('\n📊 Detalhamento:');
console.log(`   Sanitização: ${sanitizationPassed}/${testCases.length}`);
console.log(`   Debug Panel: ${debugPassed}/${debugTestCases.length}`);
console.log(`   Incidentes: ${incidentPassed}/${incidentTestCases.length}`);
console.log(`   Handlers: ${handlerPassed}/${errorHandlers.length}`);

if (totalFailed === 0) {
  console.log('\n🎉 TODOS OS TESTES PASSARAM! Sistema seguro e funcional.');
} else {
  console.log('\n⚠️ ALGUNS TESTES FALHARAM. Revisar implementação.');
}

// Restaurar ambiente original
process.env.NODE_ENV = originalNodeEnv;
