import { createClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_ANON_KEY, isValidKey } from './config';

let supabaseInstance: any;

try {
    if (isValidKey(SUPABASE_URL) && isValidKey(SUPABASE_ANON_KEY)) {
        supabaseInstance = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
            auth: {
                persistSession: true,
                autoRefreshToken: true,
                detectSessionInUrl: true,
                // Usa localStorage para manter a sessão ativa entre reinícios do app
                storage: typeof window !== 'undefined' ? window.localStorage : undefined,
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