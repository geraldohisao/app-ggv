#!/usr/bin/env node

/**
 * 🧪 Script de Teste - Google Chat Webhook
 * 
 * Este script testa se o webhook do Google Chat está funcionando corretamente.
 * Execute com: node test-webhook.js
 */

import https from 'https';
import http from 'http';

// Configurações
const PRODUCTION_URL = 'https://app.grupoggv.com/.netlify/functions/feedback';
const LOCAL_URL = 'http://localhost:8888/.netlify/functions/feedback';

// Payload de teste
const testPayload = {
  type: 'Melhoria',
  title: 'Teste Automatizado - Google Chat Webhook',
  description: 'Este é um teste automatizado para verificar se o webhook do Google Chat está funcionando corretamente. Se você recebeu esta mensagem, o sistema está operacional!',
  includeMeta: true,
  context: {
    user: { 
      name: 'Teste Automatizado', 
      email: 'teste@ggv.com', 
      role: 'Admin' 
    },
    url: 'https://app.grupoggv.com/teste',
    userAgent: 'Teste Script Node.js',
    appVersion: '1.0.0'
  },
  images: [],
  imagesBase64: []
};

function makeRequest(url, payload) {
  return new Promise((resolve, reject) => {
    const isHttps = url.startsWith('https://');
    const client = isHttps ? https : http;
    
    const postData = JSON.stringify(payload);
    
    const options = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    };

    console.log(`🔗 Fazendo requisição para: ${url}`);
    console.log(`📦 Payload: ${JSON.stringify(payload, null, 2)}`);

    const req = client.request(url, options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body: data
        });
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.write(postData);
    req.end();
  });
}

async function testWebhook(url, name) {
  console.log(`\n🧪 Testando ${name}...`);
  console.log('=' .repeat(50));
  
  try {
    const response = await makeRequest(url, testPayload);
    
    console.log(`📊 Status: ${response.statusCode}`);
    console.log(`📄 Headers:`, response.headers);
    console.log(`📝 Body:`, response.body);
    
    if (response.statusCode === 200) {
      console.log(`✅ ${name} - SUCESSO! Webhook funcionando corretamente.`);
      return true;
    } else {
      console.log(`❌ ${name} - ERRO! Status ${response.statusCode}`);
      return false;
    }
  } catch (error) {
    console.log(`❌ ${name} - ERRO! ${error.message}`);
    return false;
  }
}

async function main() {
  console.log('🚀 Iniciando teste do Google Chat Webhook...');
  console.log('⏰ Timestamp:', new Date().toISOString());
  
  const results = [];
  
  // Teste produção
  console.log('\n🌍 Testando ambiente de PRODUÇÃO...');
  const productionResult = await testWebhook(PRODUCTION_URL, 'Produção');
  results.push({ name: 'Produção', success: productionResult });
  
  // Teste local (se disponível)
  console.log('\n🖥️ Testando ambiente LOCAL...');
  const localResult = await testWebhook(LOCAL_URL, 'Local');
  results.push({ name: 'Local', success: localResult });
  
  // Resumo dos resultados
  console.log('\n📊 RESUMO DOS TESTES');
  console.log('=' .repeat(50));
  
  results.forEach(result => {
    const status = result.success ? '✅ SUCESSO' : '❌ FALHA';
    console.log(`${result.name}: ${status}`);
  });
  
  const successCount = results.filter(r => r.success).length;
  const totalCount = results.length;
  
  console.log(`\n🎯 Resultado Final: ${successCount}/${totalCount} testes passaram`);
  
  if (successCount === 0) {
    console.log('\n🚨 PROBLEMA IDENTIFICADO:');
    console.log('   - Verifique se GOOGLE_CHAT_WEBHOOK_URL está configurado no Netlify');
    console.log('   - Verifique se o webhook do Google Chat está ativo');
    console.log('   - Verifique se as variáveis de ambiente estão corretas');
  } else if (successCount === totalCount) {
    console.log('\n🎉 PARABÉNS! Todos os testes passaram!');
    console.log('   - O sistema de notificações está funcionando perfeitamente');
    console.log('   - As mensagens estão sendo enviadas para o Google Chat');
  } else {
    console.log('\n⚠️ ATENÇÃO: Alguns testes falharam');
    console.log('   - Verifique a configuração dos ambientes que falharam');
  }
  
  console.log('\n📝 Para mais detalhes, verifique:');
  console.log('   - Logs do Netlify Functions');
  console.log('   - Configuração das variáveis de ambiente');
  console.log('   - Status do webhook no Google Chat');
}

// Executar teste
main().catch(console.error);
