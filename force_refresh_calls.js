// Script para forçar refresh das chamadas no navegador
// Execute no Console do navegador (F12)

console.log('🔄 Forçando refresh das chamadas...');

// Limpar localStorage relacionado a chamadas
Object.keys(localStorage).forEach(key => {
  if (key.includes('call') || key.includes('supabase')) {
    localStorage.removeItem(key);
    console.log('🗑️ Removido:', key);
  }
});

// Limpar sessionStorage
Object.keys(sessionStorage).forEach(key => {
  if (key.includes('call') || key.includes('supabase')) {
    sessionStorage.removeItem(key);
    console.log('🗑️ Removido session:', key);
  }
});

// Forçar reload completo
console.log('🔄 Recarregando página...');
window.location.reload(true);
