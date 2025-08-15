interface AppConfig {
    SUPABASE_URL?: string;
    SUPABASE_ANON_KEY?: string;
}

// Tenta obter a configuração do localStorage.
const getStoredConfig = (): AppConfig | null => {
    try {
        const stored = localStorage.getItem('ggv-api-keys');
        if (stored) return JSON.parse(stored) as AppConfig;
    } catch (e) {
        console.error("Falha ao analisar a configuração do localStorage", e);
        // Limpa a configuração inválida para evitar erros repetidos.
        localStorage.removeItem('ggv-api-keys');
    }
    return null;
}

// Salva a configuração no localStorage.
export const saveConfig = (newConfig: AppConfig) => {
    try {
        localStorage.setItem('ggv-api-keys', JSON.stringify(newConfig));
    } catch (e) {
        console.error("Erro ao salvar a configuração no localStorage", e);
    }
};

// Fonte 1 (preferencial): variáveis de ambiente do Vite (.env / .env.local)
const env: any = (typeof import.meta !== 'undefined' && (import.meta as any).env) ? (import.meta as any).env : {};
const envConfig: AppConfig = {
    SUPABASE_URL: env.VITE_SUPABASE_URL || (typeof window !== 'undefined' ? (window as any).APP_CONFIG?.SUPABASE_URL : undefined),
    SUPABASE_ANON_KEY: env.VITE_SUPABASE_ANON_KEY || (typeof window !== 'undefined' ? (window as any).APP_CONFIG?.SUPABASE_ANON_KEY : undefined),
};

// Fonte 2: configuração salva no navegador (permite override manual via UI)
const storedConfig = getStoredConfig();

// Fonte 3: configuração global injetada no index.html (window.APP_CONFIG)
const windowConfig: AppConfig = (typeof window !== 'undefined' && (window as any).APP_CONFIG) ? (window as any).APP_CONFIG : {};

// Estratégia de resolução (mais robusta):
// 1) .env (build/deploy) → 2) localStorage (override) → 3) window.APP_CONFIG (fallback)
const resolvedConfig: AppConfig = {
    SUPABASE_URL: envConfig.SUPABASE_URL || storedConfig?.SUPABASE_URL || windowConfig.SUPABASE_URL,
    SUPABASE_ANON_KEY: envConfig.SUPABASE_ANON_KEY || storedConfig?.SUPABASE_ANON_KEY || windowConfig.SUPABASE_ANON_KEY,
};

export const SUPABASE_URL = resolvedConfig.SUPABASE_URL;
export const SUPABASE_ANON_KEY = resolvedConfig.SUPABASE_ANON_KEY;

/**
 * Verifica se uma chave de API foi definida e não é um placeholder.
 * @param key O valor da chave de API a ser verificado.
 * @returns {boolean} `true` se a chave for válida, `false` caso contrário.
 */
export const isValidKey = (key: string | undefined): key is string => {
    return !!key && typeof key === 'string' && !key.startsWith('__') && !key.endsWith('__');
};