// 🔧 Simular callback do N8N para resolver bloqueio da Andressa
// Este script simula o retorno que o N8N deveria enviar

const webhookUrl = 'https://app.grupoggv.com/.netlify/functions/reativacao-webhook';

const callbackData = {
  workflowId: 'Reativação de Leads',
  status: 'completed',
  message: '1 lead(s) processados',
  leadsProcessed: 1,
  sdr: 'Andressa Habinoski',
  timestamp: new Date().toISOString(),
  source: 'manual_simulation'
};

console.log('🔔 Simulando callback do N8N...');
console.log('📡 URL:', webhookUrl);
console.log('📊 Dados:', callbackData);

fetch(webhookUrl, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify(callbackData)
})
.then(response => response.json())
.then(data => {
  console.log('✅ Callback simulado com sucesso:', data);
  alert('Callback simulado! Recarregue a página para ver o resultado.');
})
.catch(error => {
  console.error('❌ Erro ao simular callback:', error);
  alert('Erro ao simular callback: ' + error.message);
});

// Para testar local, mude a URL para:
// const webhookUrl = 'http://localhost:8888/.netlify/functions/reativacao-webhook';
