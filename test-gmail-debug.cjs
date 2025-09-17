#!/usr/bin/env node

/**
 * 🔍 DIAGNÓSTICO DO GMAIL - Debug para identificar problema
 * 
 * Analisa os possíveis problemas no sistema de e-mail
 */

console.log('🔍 DIAGNÓSTICO DO SISTEMA DE EMAIL');
console.log('=' .repeat(60));

console.log('\n📧 PROBLEMAS IDENTIFICADOS:');
console.log('1. ❌ "Gmail API: Sistema de retry falhou"');
console.log('2. ⚠️ Token em cache: false');
console.log('3. 🔍 Possível problema de OAuth ou configuração');

console.log('\n🔧 POSSÍVEIS CAUSAS:');
console.log('1. **Token Expirado**:');
console.log('   - Token OAuth do Google expira em 1 hora');
console.log('   - Cache pode estar inválido');
console.log('   - Sessão do Supabase pode ter perdido token');

console.log('\n2. **Configuração OAuth**:');
console.log('   - GOOGLE_OAUTH_CLIENT_ID pode estar incorreto');
console.log('   - Domínio não autorizado no Google Console');
console.log('   - Scopes insuficientes');

console.log('\n3. **Problema de Permissões**:');
console.log('   - Usuário não concedeu permissões de Gmail');
console.log('   - Token sem scope gmail.send');
console.log('   - Bloqueio de pop-ups impedindo OAuth');

console.log('\n4. **Ambiente de Produção**:');
console.log('   - Diferenças entre localhost e produção');
console.log('   - URLs de callback incorretas');
console.log('   - CORS ou CSP bloqueando requests');

console.log('\n💡 SOLUÇÕES PROPOSTAS:');

console.log('\n🔧 **SOLUÇÃO 1: Verificação de Configuração**');
console.log('   - Verificar GOOGLE_OAUTH_CLIENT_ID no Supabase');
console.log('   - Confirmar domínio app.grupoggv.com no Google Console');
console.log('   - Validar redirect URIs');

console.log('\n🔧 **SOLUÇÃO 2: Limpeza de Cache**');
console.log('   - Limpar localStorage do Gmail');
console.log('   - Forçar nova autenticação');
console.log('   - Invalidar tokens expirados');

console.log('\n🔧 **SOLUÇÃO 3: Fallback de E-mail**');
console.log('   - Implementar envio via Netlify Functions');
console.log('   - Usar serviço de e-mail alternativo');
console.log('   - Sistema de retry mais robusto');

console.log('\n🔧 **SOLUÇÃO 4: Debug Detalhado**');
console.log('   - Adicionar mais logs no processo OAuth');
console.log('   - Capturar erros específicos do Google');
console.log('   - Melhorar mensagens de erro para usuário');

console.log('\n📊 PRÓXIMOS PASSOS:');
console.log('1. 🔍 Verificar configuração OAuth no Google Console');
console.log('2. 🧹 Implementar limpeza automática de cache inválido');
console.log('3. 🔄 Adicionar botão de reautenticação no modal');
console.log('4. 📧 Implementar fallback via servidor');
console.log('5. 📝 Melhorar logs de debug');

console.log('\n🎯 IMPLEMENTAÇÃO IMEDIATA:');
console.log('✅ Adicionar botão "Reautenticar Gmail" no modal');
console.log('✅ Melhorar tratamento de erros específicos');
console.log('✅ Implementar limpeza automática de cache');
console.log('✅ Adicionar logs mais detalhados');

console.log('\n' + '='.repeat(60));
console.log('📋 RELATÓRIO SALVO PARA IMPLEMENTAÇÃO');
console.log('='.repeat(60));

// Salvar relatório
const fs = require('fs');
const report = {
    timestamp: new Date().toISOString(),
    issue: 'Gmail API Sistema de retry falhou',
    environment: 'Production (app.grupoggv.com)',
    
    identified_problems: [
        'Token OAuth expirado ou inválido',
        'Possível problema de configuração OAuth',
        'Cache de token corrompido',
        'Permissões insuficientes do Google'
    ],
    
    proposed_solutions: [
        {
            priority: 'High',
            solution: 'Adicionar botão de reautenticação no modal',
            implementation: 'Immediate'
        },
        {
            priority: 'High', 
            solution: 'Melhorar tratamento de erros OAuth',
            implementation: 'Immediate'
        },
        {
            priority: 'Medium',
            solution: 'Implementar fallback de e-mail via servidor',
            implementation: 'Short term'
        },
        {
            priority: 'Low',
            solution: 'Verificar configuração Google Console',
            implementation: 'Investigation needed'
        }
    ],
    
    immediate_actions: [
        'Add re-authentication button',
        'Improve error handling',
        'Clear invalid cache automatically',
        'Add detailed logging'
    ]
};

fs.writeFileSync('gmail-debug-report.json', JSON.stringify(report, null, 2));
console.log('📄 Relatório detalhado salvo em: gmail-debug-report.json');
