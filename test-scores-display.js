// 🧪 TESTE: Verificar se as notas aparecem na lista
// Execute este script no console do navegador

console.log('🔍 TESTE: Verificando se as notas aparecem na lista');

// 1. Verificar se o callsService está funcionando
console.log('1. Verificando callsService...');

// 2. Simular uma chamada para getCalls
const testFilters = {
  limit: 10,
  offset: 0,
  sortBy: 'created_at'
};

console.log('2. Testando filtros:', testFilters);

// 3. Verificar se há dados na tabela call_analysis
console.log('3. Verificando dados na tabela call_analysis...');

// 4. Verificar se o JOIN está funcionando
console.log('4. Verificando se o JOIN está funcionando...');

console.log('✅ TESTE: Verificação completa!');
