#!/usr/bin/env node

// Script para marcar a execução mais recente como concluída
// Uso: node complete-latest-workflow.js

console.log('🔍 Buscando execução mais recente...');

fetch('http://localhost:3001/automation/history')
.then(res => res.json())
.then(data => {
  const latest = data.data[0]; // Primeira execução (mais recente)
  
  if (!latest) {
    console.log('❌ Nenhuma execução encontrada');
    return;
  }
  
  if (latest.status === 'completed') {
    console.log('✅ Execução mais recente já está concluída:', latest.proprietario);
    return;
  }
  
  const workflowId = latest.n8nResponse?.workflowId;
  if (!workflowId) {
    console.log('❌ WorkflowId não encontrado na execução');
    return;
  }
  
  console.log(`🎯 Marcando como concluído: ${latest.proprietario} (${workflowId})`);
  
  // Enviar callback de conclusão
  return fetch('http://localhost:3001/api/webhook/n8n-callback', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      workflowId: workflowId,
      executionId: workflowId.replace('wf_', 'exec_'),
      status: 'completed',
      message: `Workflow completed successfully - ${latest.proprietario} ${latest.numeroNegocio} leads processed`,
      data: {
        leadsProcessed: latest.numeroNegocio,
        totalLeads: latest.numeroNegocio,
        errors: []
      },
      timestamp: new Date().toISOString()
    })
  });
})
.then(res => {
  if (res) {
    return res.json();
  }
})
.then(result => {
  if (result) {
    console.log('✅ Status atualizado com sucesso!');
    console.log('🔍 Verifique em: http://localhost:5173');
  }
})
.catch(error => {
  console.error('❌ Erro:', error.message);
});
