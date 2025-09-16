// Teste simples para verificar problema de duração
console.log('🔍 Testando conversão de tipos para duração...\n');

// Simular o que acontece no código
const minDuration = '61'; // String que vem do input
const minDurationValue = parseInt(minDuration.toString());

console.log('Valores de teste:');
console.log('- minDuration (string):', minDuration, typeof minDuration);
console.log('- parseInt(minDuration):', minDurationValue, typeof minDurationValue);
console.log('- Comparação: 60 >= 61:', 60 >= minDurationValue);
console.log('- Comparação: 61 >= 61:', 61 >= minDurationValue);
console.log('- Comparação: 62 >= 61:', 62 >= minDurationValue);

console.log('\n🎯 Teste de precisão:');
const testDurations = [59.5, 60, 60.1, 60.9, 61, 61.1];
testDurations.forEach(duration => {
    console.log(`- ${duration} >= 61: ${duration >= 61}`);
});

console.log('\n🔍 Teste de parseInt:');
const testStrings = ['61', '61.0', '61.5', '60.9'];
testStrings.forEach(str => {
    const parsed = parseInt(str);
    console.log(`- parseInt('${str}') = ${parsed}`);
});

// Problema potencial: se duration no banco for decimal
console.log('\n⚠️ Problema potencial:');
console.log('Se no banco temos duration = 60.9 e filtramos >= 61:');
console.log('- 60.9 >= 61:', 60.9 >= 61, '(false - não aparece)');
console.log('- Math.floor(60.9) >= 61:', Math.floor(60.9) >= 61, '(false)');
console.log('- Math.ceil(60.9) >= 61:', Math.ceil(60.9) >= 61, '(true)');

console.log('\n💡 Possível solução:');
console.log('- Usar duration > (minDuration - 1) ao invés de duration >= minDuration');
console.log('- Ou arredondar durações para inteiros no banco');

