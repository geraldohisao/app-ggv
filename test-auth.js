// Script de teste para autenticação - execute no console do navegador

console.log('🧪 TESTE DE AUTENTICAÇÃO');
console.log('=======================');

// 1. Verificar URL atual
const url = window.location.href;
console.log('📍 URL atual:', url);

// 2. Verificar parâmetros OAuth
const urlParams = new URLSearchParams(window.location.search);
const hashParams = new URLSearchParams(window.location.hash.replace('#', ''));

const accessToken = urlParams.get('access_token') || hashParams.get('access_token');
const refreshToken = urlParams.get('refresh_token') || hashParams.get('refresh_token');
const expiresIn = urlParams.get('expires_in') || hashParams.get('expires_in');

console.log('🔑 Tokens encontrados:');
console.log('  - Access Token:', accessToken ? 'PRESENTE' : 'AUSENTE');
console.log('  - Refresh Token:', refreshToken ? 'PRESENTE' : 'AUSENTE');
console.log('  - Expires In:', expiresIn || 'N/A');

// 3. Testar Supabase
if (window.supabase) {
    console.log('🔧 Supabase:', 'DISPONÍVEL');
    
    // Testar getSession
    window.supabase.auth.getSession().then(({ data: { session }, error }) => {
        console.log('👤 Sessão atual:', session ? 'ATIVA' : 'INATIVA');
        if (session) {
            console.log('  - User ID:', session.user.id);
            console.log('  - Email:', session.user.email);
        }
        if (error) {
            console.error('  - Erro:', error);
        }
    });
} else {
    console.log('🔧 Supabase:', 'NÃO DISPONÍVEL');
}

// 4. Verificar localStorage
const supabaseKeys = Object.keys(localStorage).filter(k => k.includes('supabase'));
console.log('💾 LocalStorage Supabase:', supabaseKeys.length, 'chaves');
supabaseKeys.forEach(key => {
    console.log(`  - ${key}:`, localStorage.getItem(key)?.slice(0, 50) + '...');
});

console.log('=======================');
console.log('💡 Para limpar tudo: localStorage.clear(); window.location.reload();');
