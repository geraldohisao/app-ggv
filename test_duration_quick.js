// Teste rápido para verificar filtro de duração
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://lqpgfygqidzqxjxmhjkm.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxxcGdmeWdxaWR6cXhqeG1oamttIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjU5OTc5NzYsImV4cCI6MjA0MTU3Mzk3Nn0.Gg_29rvEyJlGJfqWvUkRmUgwDCjqCiGXHe2RqfQWFU8';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testDurationFilter() {
    console.log('🔍 Testando filtro de duração...\n');

    try {
        // Teste 1: Ver estatísticas gerais
        console.log('📊 Estatísticas de duração:');
        const { data: stats } = await supabase
            .from('calls')
            .select('duration')
            .not('duration', 'is', null)
            .order('duration', { ascending: false })
            .limit(10);

        if (stats && stats.length > 0) {
            const durations = stats.map(c => c.duration).filter(d => d > 0);
            console.log(`- Maior duração: ${Math.max(...durations)} segundos`);
            console.log(`- Chamadas > 1000s: ${durations.filter(d => d >= 1000).length}`);
            console.log(`- Chamadas > 600s: ${durations.filter(d => d >= 600).length}`);
            console.log(`- Chamadas > 300s: ${durations.filter(d => d >= 300).length}`);
        }

        // Teste 2: Filtro exato que está sendo usado
        console.log('\n🎯 Testando filtro duration >= 1000:');
        const { data: filtered, error } = await supabase
            .from('calls')
            .select('*')
            .gte('duration', 1000)
            .limit(5);

        if (error) {
            console.error('❌ Erro na query:', error);
            return;
        }

        console.log(`✅ Resultado: ${filtered?.length || 0} chamadas encontradas`);
        
        if (filtered && filtered.length > 0) {
            console.log('📋 Primeiras chamadas encontradas:');
            filtered.forEach((call, i) => {
                console.log(`  ${i+1}. ID: ${call.id}, Duração: ${call.duration}s, Data: ${call.created_at}`);
            });
        } else {
            console.log('❌ Nenhuma chamada com duração >= 1000 segundos encontrada');
            
            // Teste com durações menores
            console.log('\n🔍 Testando com durações menores...');
            for (const minDur of [60, 120, 300]) {
                const { data: testData } = await supabase
                    .from('calls')
                    .select('id, duration')
                    .gte('duration', minDur)
                    .limit(1);
                
                console.log(`- Duração >= ${minDur}s: ${testData?.length || 0} encontradas`);
            }
        }

        // Teste 3: Verificar se há problema com tipos
        console.log('\n🔧 Verificando tipos de dados:');
        const { data: sample } = await supabase
            .from('calls')
            .select('id, duration')
            .not('duration', 'is', null)
            .limit(3);

        if (sample) {
            sample.forEach(call => {
                console.log(`- ID: ${call.id}, Duration: ${call.duration} (${typeof call.duration})`);
            });
        }

    } catch (error) {
        console.error('💥 Erro geral:', error);
    }
}

testDurationFilter();
