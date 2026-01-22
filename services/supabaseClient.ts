import { createClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_ANON_KEY, isValidKey } from './config';
import { APP_VERSION } from '../src/version';
import { BUILD_ID } from '../src/buildId';
import { fetchWithTimeout } from '../src/utils/net';

let supabaseInstance: any;

// Fetch customizado com timeout e retries seguros (apenas GET/HEAD)
const supabaseFetch: typeof fetch = async (input, init) => {
    const method = String(init?.method || 'GET').toUpperCase();
    const retries = (method === 'GET' || method === 'HEAD') ? 1 : 0;
    const headers = new Headers(init?.headers || {});
    headers.set('x-ggv-app-version', APP_VERSION);
    headers.set('x-ggv-build-id', BUILD_ID);
    headers.set('x-ggv-runtime', typeof window !== 'undefined' ? 'web' : 'node');

    return fetchWithTimeout(input, {
        ...init,
        headers,
        timeoutMs: 15000,
        retries,
        retryBackoffMs: 500,
    } as any);
};

try {
    if (isValidKey(SUPABASE_URL) && isValidKey(SUPABASE_ANON_KEY)) {
        supabaseInstance = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
            global: {
                fetch: supabaseFetch as any,
                headers: {
                    'x-ggv-app-version': APP_VERSION,
                    'x-ggv-build-id': BUILD_ID,
                },
            },
            auth: {
                persistSession: true,
                autoRefreshToken: true,
                detectSessionInUrl: true,
                // Usa localStorage para manter a sessão ativa entre reinícios do app
                storage: typeof window !== 'undefined' ? window.localStorage : undefined,
                // Configurar chave de armazenamento personalizada
                storageKey: 'ggv-supabase-auth-token'
            },
            realtime: {
                params: { eventsPerSecond: 5 },
            },
        });
    } else {
        console.warn(`As variáveis de ambiente SUPABASE_URL e/ou SUPABASE_ANON_KEY não foram substituídas no index.html. A funcionalidade de banco de dados estará desabilitada.`);
        supabaseInstance = null;
    }
} catch (error) {
    console.error("Error initializing Supabase client:", error);
    supabaseInstance = null;
}


export const supabase = supabaseInstance;

// Listener para monitorar mudanças de estado de autenticação
if (supabaseInstance && typeof window !== 'undefined') {
    supabaseInstance.auth.onAuthStateChange((event: string, session: any) => {
        console.log('🔐 Auth state changed:', event);
        
        if (event === 'TOKEN_REFRESHED') {
            console.log('✅ Token renovado automaticamente');
        }
        
        if (event === 'SIGNED_OUT') {
            console.log('⚠️ Usuário deslogado');
        }
    });
}

// Verificação leve de conectividade (Auth health)
export async function checkSupabaseConnectivity(timeoutMs: number = 6000): Promise<{ ok: boolean; status?: number; error?: string }> {
    try {
        if (!isValidKey(SUPABASE_URL) || !isValidKey(SUPABASE_ANON_KEY)) {
            return { ok: false, error: 'Supabase não configurado' };
        }
        const url = `${SUPABASE_URL}/auth/v1/health`;
        const res = await fetchWithTimeout(url, {
            method: 'GET',
            headers: { 'apikey': SUPABASE_ANON_KEY },
            timeoutMs,
            retries: 0,
        } as any);
        return { ok: res.ok, status: res.status };
    } catch (e: any) {
        return { ok: false, error: String(e?.message || e) };
    }
}
