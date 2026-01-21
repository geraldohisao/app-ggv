
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';

// Load env vars
dotenv.config({ path: path.resolve(process.cwd(), '.env') });
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    console.error('❌ Falta configuração de VITE_SUPABASE_URL ou VITE_SUPABASE_ANON_KEY no .env');
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function testConnection() {
    console.log('🔄 Testando leitura de app_settings...');

    const { data, error } = await supabase
        .from('app_settings')
        .select('key, value')
        .like('key', '%openai%');

    if (error) {
        console.error('❌ Erro de permissão/leitura:', error.message);
        console.error('Detalhes:', error);
    } else {
        console.log('✅ SUCESSO! Consegui ler a tabela app_settings.');
        console.log(`🔑 Encontrei ${data.length} chaves.`);
        data.forEach(d => console.log(`   - ${d.key}: ${String(d.value).substring(0, 10)}...`));
    }
}

testConnection();
