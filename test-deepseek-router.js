// Teste do Router DeepSeek
// Execute: node test-deepseek-router.js

const testDeepSeekRouter = async () => {
  console.log('🤖 Testando Router DeepSeek...\n');

  // Configurações de teste
  const testConfigs = [
    {
      name: 'Teste Local (Netlify Dev)',
      url: 'http://localhost:8888/.netlify/functions/ai-stream',
      description: 'Teste local com Netlify Dev'
    },
    {
      name: 'Teste Produção',
      url: 'https://app.grupoggv.com/api/ai/stream',
      description: 'Teste em produção'
    }
  ];

  const testPayload = {
    message: 'Olá! Este é um teste do router DeepSeek. Você está funcionando?',
    personaId: 'sdr',
    history: [],
    knowledgeBase: 'Teste de configuração do DeepSeek',
    requestId: `test_${Date.now()}`,
    flags: {
      test: true
    }
  };

  for (const config of testConfigs) {
    console.log(`\n🔍 ${config.name}`);
    console.log(`📡 URL: ${config.url}`);
    console.log(`📝 ${config.description}`);
    console.log('─'.repeat(50));

    try {
      const startTime = Date.now();
      
      const response = await fetch(config.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(testPayload)
      });

      const endTime = Date.now();
      const duration = endTime - startTime;

      console.log(`⏱️  Tempo de resposta: ${duration}ms`);
      console.log(`📊 Status: ${response.status} ${response.statusText}`);

      if (response.ok) {
        const text = await response.text();
        console.log(`✅ Resposta recebida (${text.length} caracteres)`);
        
        // Tentar parsear como NDJSON
        const lines = text.trim().split('\n');
        console.log(`📄 Linhas de resposta: ${lines.length}`);
        
        for (let i = 0; i < Math.min(lines.length, 3); i++) {
          try {
            const parsed = JSON.parse(lines[i]);
            console.log(`📝 Linha ${i + 1}: ${JSON.stringify(parsed, null, 2)}`);
          } catch (e) {
            console.log(`📝 Linha ${i + 1}: ${lines[i].substring(0, 100)}...`);
          }
        }
        
        if (lines.length > 3) {
          console.log(`📝 ... e mais ${lines.length - 3} linhas`);
        }
      } else {
        const errorText = await response.text();
        console.log(`❌ Erro: ${errorText}`);
      }

    } catch (error) {
      console.log(`❌ Erro de conexão: ${error.message}`);
    }

    console.log('');
  }

  console.log('🎯 Resumo dos Testes:');
  console.log('─'.repeat(50));
  console.log('✅ Se ambos os testes passaram: Router configurado corretamente');
  console.log('❌ Se falharam: Verificar configuração da chave da API');
  console.log('⚠️  Se apenas produção falha: Verificar deploy da Netlify');
  console.log('⚠️  Se apenas local falha: Verificar Netlify Dev');
};

// Executar teste
testDeepSeekRouter().catch(console.error);
