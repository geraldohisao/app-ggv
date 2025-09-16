// ===================================================================
// CORREÇÃO DE EMERGÊNCIA - PARAR LOOPS DE REQUISIÇÃO
// ===================================================================

// 1. Limpar todos os timeouts ativos
let timeoutId = setTimeout(() => {}, 0);
for (let i = 0; i < timeoutId; i++) {
  clearTimeout(i);
}

// 2. Limpar todos os intervals ativos  
let intervalId = setInterval(() => {}, 9999);
for (let i = 0; i < intervalId; i++) {
  clearInterval(i);
}

// 3. Parar todos os AbortControllers
if (window.activeControllers) {
  window.activeControllers.forEach(controller => {
    try {
      controller.abort();
    } catch (e) {
      console.log('Controller já abortado:', e);
    }
  });
  window.activeControllers = [];
}

// 4. Recarregar página após 2 segundos
setTimeout(() => {
  console.log('🔄 Recarregando página para limpar estado...');
  window.location.reload();
}, 2000);

console.log('🚨 CORREÇÃO DE EMERGÊNCIA APLICADA - Recarregando em 2s...');
