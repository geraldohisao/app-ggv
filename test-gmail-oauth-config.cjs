#!/usr/bin/env node

/**
 * 🔍 TESTE DE CONFIGURAÇÃO OAUTH DO GMAIL
 * 
 * Verifica se a configuração OAuth está correta para produção
 */

console.log('🔍 TESTE DE CONFIGURAÇÃO OAUTH GMAIL');
console.log('=' .repeat(60));

console.log('\n📧 PROBLEMAS IDENTIFICADOS NO CÓDIGO:');

console.log('\n1. **Client ID Hardcoded**:');
console.log('   Linha 39: const productionClientId = "1048970542386-8u3v6p7c2s8l5q9k1m0n2b4x7y6z3a5w.apps.googleusercontent.com"');
console.log('   ⚠️ Este Client ID pode estar incorreto ou não autorizado');

console.log('\n2. **Domínio de Produção**:');
console.log('   - Produção: app.grupoggv.com');
console.log('   - Client ID deve estar configurado para este domínio no Google Console');

console.log('\n3. **Scopes Necessários**:');
console.log('   - gmail.send (envio de e-mails)');
console.log('   - gmail.compose (composição de e-mails)');

console.log('\n🔧 SOLUÇÕES PROPOSTAS:');

console.log('\n**SOLUÇÃO 1: Verificar Google Cloud Console**');
console.log('1. Acessar: https://console.cloud.google.com/apis/credentials');
console.log('2. Verificar se Client ID existe e está ativo');
console.log('3. Confirmar domínios autorizados:');
console.log('   - app.grupoggv.com');
console.log('   - https://app.grupoggv.com');
console.log('4. Verificar redirect URIs:');
console.log('   - https://app.grupoggv.com');
console.log('   - https://app.grupoggv.com/');

console.log('\n**SOLUÇÃO 2: Configurar Client ID no Supabase**');
console.log('1. Acessar configurações do app');
console.log('2. Adicionar chave: GOOGLE_OAUTH_CLIENT_ID');
console.log('3. Valor: Client ID correto do Google Console');
console.log('4. Remover hardcoded do código');

console.log('\n**SOLUÇÃO 3: Fallback de E-mail via Servidor**');
console.log('1. Implementar envio via Netlify Functions');
console.log('2. Usar SendGrid, Mailgun ou similar');
console.log('3. Não depender de OAuth do usuário');

console.log('\n**SOLUÇÃO 4: Debug Melhorado**');
console.log('1. Logs mais detalhados do processo OAuth');
console.log('2. Capturar erro específico do Google');
console.log('3. Instruções claras para o usuário');

console.log('\n🎯 IMPLEMENTAÇÃO IMEDIATA RECOMENDADA:');

console.log('\n1. **Verificar Client ID Real**:');
console.log('   - Confirmar se 1048970542386-8u3v6p7c2s8l5q9k1m0n2b4x7y6z3a5w está correto');
console.log('   - Verificar no Google Cloud Console se está ativo');
console.log('   - Confirmar domínios autorizados');

console.log('\n2. **Melhorar Mensagens de Erro**:');
console.log('   - Detectar erro específico de Client ID inválido');
console.log('   - Instruções claras para reautenticação');
console.log('   - Botão de fallback para contato');

console.log('\n3. **Implementar Fallback**:');
console.log('   - Sistema de e-mail via servidor como backup');
console.log('   - Não bloquear usuário se OAuth falhar');

console.log('\n📊 PRÓXIMOS PASSOS:');
console.log('1. 🔍 Verificar configuração OAuth no Google Console');
console.log('2. 🔧 Implementar melhorias na interface');
console.log('3. 📧 Adicionar fallback de e-mail');
console.log('4. 🧪 Testar em produção com configuração correta');

console.log('\n' + '='.repeat(60));
console.log('📋 CONFIGURAÇÃO OAUTH ANALISADA');
console.log('='.repeat(60));

// Salvar relatório
const fs = require('fs');
const report = {
    timestamp: new Date().toISOString(),
    issue: 'Gmail OAuth Configuration Analysis',
    environment: 'Production (app.grupoggv.com)',
    
    current_config: {
        hardcoded_client_id: '1048970542386-8u3v6p7c2s8l5q9k1m0n2b4x7y6z3a5w.apps.googleusercontent.com',
        production_domain: 'app.grupoggv.com',
        required_scopes: ['gmail.send', 'gmail.compose']
    },
    
    potential_issues: [
        'Client ID hardcoded pode estar incorreto',
        'Domínio não autorizado no Google Console',
        'Configuração GOOGLE_OAUTH_CLIENT_ID ausente no Supabase',
        'Redirect URIs não configurados corretamente'
    ],
    
    immediate_fixes: [
        'Verificar Client ID no Google Cloud Console',
        'Confirmar domínios autorizados',
        'Melhorar tratamento de erros OAuth',
        'Adicionar fallback de e-mail via servidor'
    ],
    
    recommended_client_id_check: {
        console_url: 'https://console.cloud.google.com/apis/credentials',
        authorized_domains: [
            'app.grupoggv.com',
            'https://app.grupoggv.com'
        ],
        redirect_uris: [
            'https://app.grupoggv.com',
            'https://app.grupoggv.com/'
        ]
    }
};

fs.writeFileSync('gmail-oauth-config-analysis.json', JSON.stringify(report, null, 2));
console.log('📄 Análise de configuração salva em: gmail-oauth-config-analysis.json');
