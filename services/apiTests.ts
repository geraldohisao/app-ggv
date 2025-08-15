
import { supabase } from './supabaseClient';

export interface TestResult {
    success: boolean;
    error?: string;
}

export const testSupabaseApi = async (): Promise<TestResult> => {
    if (!supabase) {
        return { success: false, error: 'Cliente Supabase não inicializado. Verifique se as chaves foram configuradas na UI ou no index.html.' };
    }
    
    try {
        const timeoutPromise = new Promise<never>((_, reject) => 
            setTimeout(() => reject(new Error('A requisição ao Supabase expirou após 10 segundos. Verifique a conexão de rede, as chaves de API e as regras de firewall.')), 10000)
        );

        const testPromise = (async (): Promise<TestResult> => {
            // Evitar recursão em policies do Postgres: usar uma tabela simples sem dependência de is_admin()
            const { error } = await supabase.from('ai_personas').select('id').limit(1);
            // 42P01: tabela ausente — ainda assim considera conectividade válida
            if (error && error.code !== '42P01') {
                throw error;
            }
            return { success: true };
        })();
        
        return await Promise.race([testPromise, timeoutPromise]);

    } catch (error: any) {
        console.error("Erro no Teste da API Supabase:", error);
        return { success: false, error: error.message || 'Falha ao conectar ao Supabase. Verifique as credenciais e o acesso à rede.' };
    }
};

export const testAdminListUsers = async (): Promise<TestResult> => {
    if (!supabase) return { success: false, error: 'Supabase não inicializado' };
    try {
        const { data, error } = await supabase.rpc('admin_list_users');
        if (error) throw error;
        console.log('admin_list_users →', Array.isArray(data) ? data.slice(0, 5) : data);
        return { success: true };
    } catch (e: any) {
        console.error('admin_list_users erro:', e);
        return { success: false, error: e?.message || 'Falha na RPC' };
    }
};