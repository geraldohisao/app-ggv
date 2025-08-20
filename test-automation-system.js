#!/usr/bin/env node

// Script para testar o sistema de automação completo
console.log('🧪 Testando Sistema de Automação GGV\n');

async function testLocalServer() {
  console.log('1️⃣ Testando servidor local...');
  
  try {
    const statusRes = await fetch('http://localhost:3001/status');
    if (statusRes.ok) {
      const status = await statusRes.json();
      console.log('✅ Servidor local funcionando:', {
        type: status.type,
        records: status.records,
        uptime: Math.round(status.uptime) + 's'
      });
      return true;
    }
  } catch (error) {
    console.log('❌ Servidor local não disponível');
    return false;
  }
}

async function testHistory() {
  console.log('\n2️⃣ Testando consulta de histórico...');
  
  try {
    const historyRes = await fetch('http://localhost:3001/automation/history?page=1&limit=10');
    if (historyRes.ok) {
      const history = await historyRes.json();
      console.log('✅ Histórico carregado:', {
        total: history.data.length,
        realRecords: history.data.filter(r => r.n8nResponse?.real).length
      });
      
      if (history.data.length > 0) {
        const latest = history.data[0];
        console.log('📋 Execução mais recente:', {
          proprietario: latest.proprietario,
          status: latest.status,
          workflowId: latest.n8nResponse?.workflowId?.substring(0, 20) + '...',
          real: latest.n8nResponse?.real
        });
      }
      return true;
    }
  } catch (error) {
    console.log('❌ Erro ao consultar histórico:', error.message);
    return false;
  }
}

async function testAutomation() {
  console.log('\n3️⃣ Testando acionamento de automação...');
  
  const testPayload = {
    filtro: 'Lista de reativação - Topo de funil',
    proprietario: 'Teste Sistema',
    cadencia: 'Reativação - Sem Retorno',
    numero_negocio: 1
  };
  
  try {
    const automationRes = await fetch('http://localhost:3001/automation/reactivation', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testPayload)
    });
    
    if (automationRes.ok) {
      const result = await automationRes.json();
      console.log('✅ Automação iniciada:', {
        success: result.ok,
        workflowId: result.workflowId,
        message: result.message?.substring(0, 50) + '...'
      });
      
      // Aguardar um pouco e testar callback
      console.log('\n4️⃣ Testando callback de conclusão...');
      setTimeout(async () => {
        try {
          const callbackPayload = {
            workflowId: result.workflowId,
            executionId: result.runId,
            status: 'completed',
            message: 'Test workflow completed successfully',
            data: {
              leadsProcessed: 1,
              totalLeads: 1,
              proprietario: testPayload.proprietario
            },
            timestamp: new Date().toISOString()
          };
          
          const callbackRes = await fetch('http://localhost:3001/api/webhook/n8n-callback', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(callbackPayload)
          });
          
          if (callbackRes.ok) {
            const callbackResult = await callbackRes.json();
            console.log('✅ Callback processado:', {
              success: callbackResult.success,
              message: callbackResult.message
            });
            
            // Verificar se o status foi atualizado
            setTimeout(async () => {
              console.log('\n5️⃣ Verificando atualização de status...');
              const updatedHistoryRes = await fetch('http://localhost:3001/automation/history?page=1&limit=1');
              if (updatedHistoryRes.ok) {
                const updatedHistory = await updatedHistoryRes.json();
                const latestRecord = updatedHistory.data[0];
                
                if (latestRecord && latestRecord.status === 'completed') {
                  console.log('✅ Status atualizado corretamente para "completed"');
                  console.log('\n🎉 TODOS OS TESTES PASSARAM! Sistema funcionando perfeitamente.');
                } else {
                  console.log('❌ Status não foi atualizado corretamente');
                  console.log('Status atual:', latestRecord?.status);
                }
              }
            }, 1000);
            
          } else {
            console.log('❌ Erro no callback:', callbackRes.status);
          }
        } catch (callbackError) {
          console.log('❌ Erro ao testar callback:', callbackError.message);
        }
      }, 2000);
      
      return true;
    }
  } catch (error) {
    console.log('❌ Erro ao testar automação:', error.message);
    return false;
  }
}

async function runTests() {
  const localServerOk = await testLocalServer();
  
  if (!localServerOk) {
    console.log('\n⚠️  Servidor local não está rodando. Inicie com:');
    console.log('   node n8n-callback-server.js');
    return;
  }
  
  await testHistory();
  await testAutomation();
}

// Executar testes
runTests().catch(error => {
  console.error('❌ Erro geral nos testes:', error);
});
