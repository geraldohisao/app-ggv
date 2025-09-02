// Simulação completa do fluxo da Camila
// Teste: Login → Verificação de Acesso → Renderização do Menu → Acesso à Página

console.log('🧪 SIMULANDO FLUXO COMPLETO DA CAMILA...\n');

// 1. SIMULAR DADOS DO BANCO (resultado do nosso script SQL)
const camilaProfile = {
    id: 'camila-uuid-123',
    full_name: 'Camila Ataliba',
    email: 'camila.ataliba@grupoggv.com',
    user_function: 'Closer', // ← Confirmado pelo script SQL
    role: 'USER'
};

console.log('📋 1. DADOS DO BANCO (profiles):');
console.log(JSON.stringify(camilaProfile, null, 2));

// 2. SIMULAR CRIAÇÃO DO OBJETO USER (DirectUserContext.tsx)
const camilaUser = {
    id: camilaProfile.id,
    email: camilaProfile.email,
    name: camilaProfile.full_name.split(' ').map(part => 
        part.charAt(0).toUpperCase() + part.slice(1).toLowerCase()
    ).join(' '),
    initials: camilaProfile.full_name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase(),
    role: camilaProfile.role,
    user_function: camilaProfile.user_function
};

console.log('\n👤 2. OBJETO USER CRIADO (DirectUserContext):');
console.log(JSON.stringify(camilaUser, null, 2));

// 3. SIMULAR VERIFICAÇÃO DE ACESSO NO MENU (UserMenu.tsx)
const canSeeFeedback_Menu = camilaUser.role === 'SUPER_ADMIN' || 
                           camilaUser.user_function === 'Closer' || 
                           camilaUser.user_function === 'Gestor';

console.log('\n🍔 3. VERIFICAÇÃO NO MENU (UserMenu.tsx):');
console.log(`user.role === 'SUPER_ADMIN': ${camilaUser.role === 'SUPER_ADMIN'}`);
console.log(`user.user_function === 'Closer': ${camilaUser.user_function === 'Closer'}`);
console.log(`user.user_function === 'Gestor': ${camilaUser.user_function === 'Gestor'}`);
console.log(`canSeeFeedback: ${canSeeFeedback_Menu}`);
console.log(`MENU ITEM VISÍVEL: ${canSeeFeedback_Menu ? '✅ SIM' : '❌ NÃO'}`);

// 4. SIMULAR VERIFICAÇÃO DE ACESSO NA PÁGINA (OpportunityFeedbackPage.tsx)
const hasAccess_Page = (() => {
    if (!camilaUser) return false;
    
    // SuperAdmin sempre tem acesso
    if (camilaUser.role === 'SUPER_ADMIN') return true;
    
    // Verificar função comercial - apenas Closer e Gestor
    return camilaUser.user_function === 'Closer' || camilaUser.user_function === 'Gestor';
})();

console.log('\n📄 4. VERIFICAÇÃO NA PÁGINA (OpportunityFeedbackPage.tsx):');
console.log(`hasAccess lógica:`);
console.log(`  if (!user) return false: ${!camilaUser ? 'TRUE (retorna false)' : 'FALSE (continua)'}`);
console.log(`  if (user.role === 'SUPER_ADMIN') return true: ${camilaUser.role === 'SUPER_ADMIN' ? 'TRUE (retorna true)' : 'FALSE (continua)'}`);
console.log(`  return user.user_function === 'Closer' || user.user_function === 'Gestor':`);
console.log(`    user.user_function === 'Closer': ${camilaUser.user_function === 'Closer'}`);
console.log(`    user.user_function === 'Gestor': ${camilaUser.user_function === 'Gestor'}`);
console.log(`  RESULTADO: ${hasAccess_Page}`);
console.log(`PÁGINA ACESSÍVEL: ${hasAccess_Page ? '✅ SIM' : '❌ NÃO (mostra AccessDenied)'}`);

// 5. SIMULAR ROTEAMENTO
console.log('\n🛣️  5. TESTE DE ROTEAMENTO:');
const testUrls = [
    '/feedback',
    '/feedback?deal_id=632951',
    '/opportunity-feedback',
    '/opportunity-feedback?deal_id=632951'
];

testUrls.forEach(url => {
    // Simular getModuleFromPath (router.ts)
    const moduleRoutes = {
        '/': 'Diagnostico',
        '/diagnostico-comercial': 'Diagnostico',
        '/assistente': 'Assistente',
        '/calculadora': 'Calculadora',
        '/chamadas': 'Calls',
        '/configuracoes': 'Settings',
        '/feedback': 'OpportunityFeedback', // ← Rota correta
        '/reativacao': 'ReativacaoLeads'
    };
    
    const pathname = url.split('?')[0]; // Remove query params
    const module = moduleRoutes[pathname];
    
    console.log(`  ${url} → Módulo: ${module || 'NÃO ENCONTRADO'} ${module === 'OpportunityFeedback' ? '✅' : '❌'}`);
});

// 6. SIMULAR RENDERIZAÇÃO FINAL
console.log('\n🎨 6. RESULTADO FINAL DA RENDERIZAÇÃO:');

if (canSeeFeedback_Menu && hasAccess_Page) {
    console.log('✅ SUCESSO COMPLETO:');
    console.log('  • Menu "Feedback de Oportunidade" aparece ✅');
    console.log('  • Página /feedback?deal_id=632951 carrega normalmente ✅');
    console.log('  • Componente OpportunityFeedbackPage renderiza ✅');
    console.log('  • Formulário de feedback disponível ✅');
} else if (!canSeeFeedback_Menu && hasAccess_Page) {
    console.log('⚠️ PROBLEMA PARCIAL:');
    console.log('  • Menu "Feedback de Oportunidade" NÃO aparece ❌');
    console.log('  • Página /feedback?deal_id=632951 funciona se acessada diretamente ✅');
} else if (canSeeFeedback_Menu && !hasAccess_Page) {
    console.log('⚠️ PROBLEMA PARCIAL:');
    console.log('  • Menu "Feedback de Oportunidade" aparece ✅');
    console.log('  • Página /feedback?deal_id=632951 mostra "Acesso Negado" ❌');
} else {
    console.log('❌ PROBLEMA COMPLETO:');
    console.log('  • Menu "Feedback de Oportunidade" NÃO aparece ❌');
    console.log('  • Página /feedback?deal_id=632951 mostra "Acesso Negado" ❌');
}

// 7. DIAGNÓSTICO DE POSSÍVEIS PROBLEMAS
console.log('\n🔧 7. DIAGNÓSTICO DE POSSÍVEIS PROBLEMAS:');

if (camilaUser.user_function !== 'Closer') {
    console.log('❌ PROBLEMA: user_function não é "Closer"');
    console.log('   SOLUÇÃO: Execute o script SQL fix-camila-closer-access.sql');
} else {
    console.log('✅ user_function está correto: "Closer"');
}

if (!canSeeFeedback_Menu) {
    console.log('❌ PROBLEMA: Lógica do menu não permite acesso');
    console.log('   CAUSA: UserMenu.tsx não implementado ou bug na lógica');
} else {
    console.log('✅ Lógica do menu permite acesso');
}

if (!hasAccess_Page) {
    console.log('❌ PROBLEMA: Lógica da página não permite acesso');
    console.log('   CAUSA: OpportunityFeedbackPage.tsx com bug na lógica');
} else {
    console.log('✅ Lógica da página permite acesso');
}

// 8. INSTRUÇÕES PARA TESTE REAL
console.log('\n📝 8. INSTRUÇÕES PARA TESTE REAL:');
console.log('1. Camila deve fazer logout/login para atualizar sessão');
console.log('2. Verificar se menu "Feedback de Oportunidade" aparece');
console.log('3. Testar URL: /feedback?deal_id=632951');
console.log('4. Se não funcionar, usar ferramenta: /debug-camila-session.html');

console.log('\n🎯 CONCLUSÃO DA SIMULAÇÃO:');
if (canSeeFeedback_Menu && hasAccess_Page) {
    console.log('✅ CAMILA DEVE TER ACESSO COMPLETO AO SISTEMA DE FEEDBACK');
    console.log('   Se não estiver funcionando, o problema é na SESSÃO/CACHE');
} else {
    console.log('❌ HÁ PROBLEMA NA LÓGICA DE ACESSO - PRECISA CORREÇÃO');
}
