// Script de limpeza do sistema de logos
// Remove arquivos e configurações desnecessárias do sistema antigo

console.log('🧹 Limpando sistema de logos...');

// 1. Limpar localStorage de qualquer cache antigo
if (typeof localStorage !== 'undefined') {
  const keysToRemove = [
    'ggv-logo-urls',
    'logo-cache-cleared-v2',
    'logo-cache-cleared',
    'brand-logos-cache'
  ];
  
  keysToRemove.forEach(key => {
    if (localStorage.getItem(key)) {
      localStorage.removeItem(key);
      console.log(`✅ Removido localStorage: ${key}`);
    }
  });
}

// 2. Limpar sessionStorage também
if (typeof sessionStorage !== 'undefined') {
  const sessionKeys = ['logo-urls', 'brand-logos'];
  sessionKeys.forEach(key => {
    if (sessionStorage.getItem(key)) {
      sessionStorage.removeItem(key);
      console.log(`✅ Removido sessionStorage: ${key}`);
    }
  });
}

console.log('✨ Sistema de logos limpo e simplificado!');
console.log('📋 Novo sistema:');
console.log('  - Uma única fonte: tabela brand_logos');
console.log('  - Fallback confiável hardcoded');
console.log('  - Zero cache complexo');
console.log('  - SVG de emergência sempre disponível');
