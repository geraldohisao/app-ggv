#!/usr/bin/env node

// Debug para verificar se o N8N está enviando callbacks

console.log('🔍 DEBUG N8N CALLBACK - Verificando configuração...\n');

// 1. Verificar se o servidor está rodando
console.log('📡 1. Testando conexão com servidor local...');
fetch('http://localhost:3001/status')
  .then(res => res.json())
  .then(data => {
    console.log('✅ Servidor local funcionando:', {
      status: data.status,
      records: data.records,
      uptime: Math.round(data.uptime) + 's'
    });
    
    // 2. Verificar histórico atual
    console.log('\n📊 2. Verificando histórico atual...');
    return fetch('http://localhost:3001/automation/history');
  })
  .then(res => res.json())
  .then(history => {
    console.log(`✅ Histórico: ${history.data.length} registros`);
    
    if (history.data.length > 0) {
      const latest = history.data[0];
      console.log('📋 Execução mais recente:', {
        proprietario: latest.proprietario,
        status: latest.status,
        workflowId: latest.n8nResponse?.workflowId,
        message: latest.n8nResponse?.message,
        webhookReceived: latest.n8nResponse?.webhookReceived || false
      });
      
      // Se tem execução pendente, mostrar instruções
      if (latest.status === 'started') {
        console.log('\n🔧 3. CONFIGURAÇÃO N8N NECESSÁRIA:');
        console.log('O N8N deve enviar callback para:');
        console.log('   URL: http://localhost:3001/api/webhook/n8n-callback');
        console.log('   Method: POST');
        console.log('   Body: {');
        console.log(`     "workflowId": "${latest.n8nResponse?.workflowId}",`);
        console.log('     "executionId": "{{$execution.id}}",');
        console.log('     "status": "completed",');
        console.log('     "message": "Workflow completed successfully",');
        console.log('     "data": { "leadsProcessed": 3, "totalLeads": 3 }');
        console.log('   }');
        
        console.log('\n🧪 4. TESTE MANUAL:');
        console.log(`node test-n8n-callback.js ${latest.n8nResponse?.workflowId}`);
      } else {
        console.log('\n✅ Última execução já foi concluída!');
      }
    } else {
      console.log('ℹ️  Nenhuma execução encontrada. Execute uma automação primeiro.');
    }
  })
  .catch(error => {
    console.error('❌ Erro:', error.message);
    console.log('\n🔧 SOLUÇÃO:');
    console.log('1. Certifique-se que o servidor está rodando:');
    console.log('   node n8n-callback-server.js');
    console.log('2. Verifique se a porta 3001 está livre');
  });
