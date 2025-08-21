/**
 * Exemplo de como usar a função triggerReativacao como uma Promise (async/await)
 * Este arquivo demonstra o uso correto da função refatorada
 */

// Simulação da função triggerReativacao (simplificada para teste)
async function triggerReativacao(payload) {
  console.log('🚀 Iniciando automação...');
  
  try {
    // Fazer requisição POST usando async/await
    const response = await fetch('https://api-test.ggvinteligencia.com.br/webhook/reativacao-leads', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'GGV-Platform/1.0',
        'X-Source': 'ggv-reativacao'
      },
      body: JSON.stringify({
        ...payload,
        timestamp: new Date().toISOString()
      })
    });

    if (!response.ok) {
      throw new Error(`HTTP Error: ${response.status} ${response.statusText}`);
    }

    const result = await response.text();
    console.log('✅ Resposta recebida:', result);
    
    return {
      success: true,
      message: 'Automação iniciada com sucesso',
      response: result
    };

  } catch (error) {
    console.error('❌ Erro na automação:', error);
    throw error;
  }
}

// Exemplo de uso 1: Com async/await
async function exemploAsyncAwait() {
  console.log('\n=== EXEMPLO 1: Usando async/await ===');
  
  const payload = {
    filtro: 'Lista de reativação - Topo de funil',
    proprietario: 'Andressa',
    cadencia: 'Reativação - Sem Retorno',
    numero_negocio: 25
  };

  try {
    const resultado = await triggerReativacao(payload);
    console.log('✅ Automação concluída:', resultado);
  } catch (error) {
    console.error('❌ Falha na automação:', error.message);
  }
}

// Exemplo de uso 2: Com .then()/.catch()
function exemploPromise() {
  console.log('\n=== EXEMPLO 2: Usando .then()/.catch() ===');
  
  const payload = {
    filtro: 'Lista de reativação - Meio de funil',
    proprietario: 'João',
    cadencia: 'Follow-up Intensivo',
    numero_negocio: 15
  };

  triggerReativacao(payload)
    .then(resultado => {
      console.log('✅ Automação concluída:', resultado);
    })
    .catch(error => {
      console.error('❌ Falha na automação:', error.message);
    });
}

// Exemplo de uso 3: Múltiplas automações em paralelo
async function exemploMultiplasAutomacoes() {
  console.log('\n=== EXEMPLO 3: Múltiplas automações em paralelo ===');
  
  const automacoes = [
    {
      filtro: 'Lista A',
      proprietario: 'SDR 1',
      cadencia: 'Padrão',
      numero_negocio: 10
    },
    {
      filtro: 'Lista B',
      proprietario: 'SDR 2',
      cadencia: 'Intensiva',
      numero_negocio: 20
    },
    {
      filtro: 'Lista C',
      proprietario: 'SDR 3',
      cadencia: 'Suave',
      numero_negocio: 5
    }
  ];

  try {
    console.log('🚀 Iniciando', automacoes.length, 'automações em paralelo...');
    
    // Executar todas as automações em paralelo usando Promise.all
    const resultados = await Promise.all(
      automacoes.map(payload => triggerReativacao(payload))
    );
    
    console.log('✅ Todas as automações concluídas:');
    resultados.forEach((resultado, index) => {
      console.log(`  Automação ${index + 1}:`, resultado.message);
    });
    
  } catch (error) {
    console.error('❌ Erro em uma das automações:', error.message);
  }
}

// Exemplo de uso 4: Com tratamento de timeout
async function exemploComTimeout() {
  console.log('\n=== EXEMPLO 4: Com timeout personalizado ===');
  
  const payload = {
    filtro: 'Lista timeout',
    proprietario: 'Teste',
    cadencia: 'Teste',
    numero_negocio: 1
  };

  // Criar promise com timeout customizado
  const timeoutPromise = new Promise((_, reject) => {
    setTimeout(() => reject(new Error('Timeout de 10 segundos')), 10000);
  });

  try {
    const resultado = await Promise.race([
      triggerReativacao(payload),
      timeoutPromise
    ]);
    
    console.log('✅ Automação concluída dentro do timeout:', resultado);
  } catch (error) {
    console.error('❌ Erro ou timeout:', error.message);
  }
}

// Executar exemplos (descomente para testar)
console.log('📋 Exemplos de uso da função triggerReativacao como Promise/async');
console.log('⚠️  Para testar, descomente as linhas abaixo e execute: node test-async-webhook.js');

// exemploAsyncAwait();
// exemploPromise();
// exemploMultiplasAutomacoes();
// exemploComTimeout();

// Exportar para uso em outros módulos
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { triggerReativacao };
}
