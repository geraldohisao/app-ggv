// Script de Debug para Problemas de Conexão com Banco
// Execute no console do navegador (F12 > Console)

console.log('🔍 Iniciando diagnóstico de conexão com banco...');

// 1. Verificar se o Supabase está configurado
console.log('1. Verificando configuração do Supabase...');
console.log('SUPABASE_URL:', window.APP_CONFIG?.SUPABASE_URL ? '✅ Configurado' : '❌ Não configurado');
console.log('SUPABASE_ANON_KEY:', window.APP_CONFIG?.SUPABASE_ANON_KEY ? '✅ Configurado' : '❌ Não configurado');

// 2. Verificar localStorage
console.log('2. Verificando localStorage...');
const storedConfig = localStorage.getItem('ggv-api-keys');
console.log('Config no localStorage:', storedConfig ? '✅ Existe' : '❌ Não existe');
if (storedConfig) {
    try {
        const parsed = JSON.parse(storedConfig);
        console.log('Config parsed:', parsed);
    } catch (e) {
        console.log('❌ Erro ao parsear config:', e);
    }
}

// 3. Verificar se o cliente Supabase foi inicializado
console.log('3. Verificando cliente Supabase...');
if (typeof window.supabase !== 'undefined') {
    console.log('✅ Cliente Supabase disponível globalmente');
} else {
    console.log('❌ Cliente Supabase não encontrado');
}

// 4. Testar conexão básica
console.log('4. Testando conexão básica...');
async function testBasicConnection() {
    try {
        if (!window.supabase) {
            console.log('❌ Cliente Supabase não disponível');
            return;
        }
        
        const { data, error } = await window.supabase
            .from('profiles')
            .select('count')
            .limit(1);
            
        if (error) {
            console.log('❌ Erro na conexão:', error);
        } else {
            console.log('✅ Conexão funcionando!');
        }
    } catch (err) {
        console.log('❌ Erro de rede:', err);
    }
}

// 5. Testar função específica
console.log('5. Testando função get_unique_users_with_calls...');
async function testFunction() {
    try {
        if (!window.supabase) {
            console.log('❌ Cliente Supabase não disponível');
            return;
        }
        
        const { data, error } = await window.supabase
            .rpc('get_unique_users_with_calls');
            
        if (error) {
            console.log('❌ Erro na função:', error);
        } else {
            console.log('✅ Função funcionando! Usuários:', data?.length || 0);
            console.log('Dados:', data);
        }
    } catch (err) {
        console.log('❌ Erro:', err);
    }
}

// Executar testes
setTimeout(() => {
    testBasicConnection();
    setTimeout(() => {
        testFunction();
    }, 2000);
}, 1000);

console.log('🔍 Diagnóstico iniciado. Aguarde os resultados...');
