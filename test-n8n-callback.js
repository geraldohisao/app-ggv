#!/usr/bin/env node

// Script para testar callbacks do N8N
// Uso: node test-n8n-callback.js [workflowId]

const workflowId = process.argv[2] || 'wf_1755634207463';

const callbackData = {
  workflowId: workflowId,
  executionId: workflowId.replace('wf_', 'exec_'),
  status: 'completed',
  message: `Workflow completed successfully - Test callback for ${workflowId}`,
  data: {
    leadsProcessed: 3,
    totalLeads: 3,
    errors: []
  },
  timestamp: new Date().toISOString()
};

console.log('🔔 Enviando callback de teste para:', workflowId);
console.log('📡 Dados:', JSON.stringify(callbackData, null, 2));

fetch('http://localhost:3001/api/webhook/n8n-callback', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(callbackData)
})
.then(res => res.json())
.then(result => {
  console.log('✅ Resposta:', result);
  
  if (result.updated) {
    console.log('✅ Status atualizado com sucesso!');
    console.log('🔍 Verifique o histórico em: http://localhost:5173');
  } else {
    console.log('⚠️ Workflow não encontrado no histórico');
  }
})
.catch(error => {
  console.error('❌ Erro:', error.message);
});
