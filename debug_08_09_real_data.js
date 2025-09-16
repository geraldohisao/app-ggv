// Script para verificar dados reais do dia 08/09
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://lqpgfygqidzqxjxmhjkm.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxxcGdmeWdxaWR6cXhqeG1oamttIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjU5OTc5NzYsImV4cCI6MjA0MTU3Mzk3Nn0.Gg_29rvEyJlGJfqWvUkRmUgwDCjqCiGXHe2RqfQWFU8';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkRealData() {
    console.log('🔍 Verificando dados reais do dia 08/09...\n');

    try {
        // Teste 1: Contar todas as chamadas do dia 08/09
        console.log('📊 TESTE 1: Contagem geral do dia 08/09');
        const { data: allCalls, error: allError } = await supabase
            .from('calls')
            .select('*')
            .gte('created_at', '2025-09-08T00:00:00')
            .lte('created_at', '2025-09-08T23:59:59');

        if (allError) {
            console.error('❌ Erro:', allError);
            return;
        }

        console.log(`✅ Total de chamadas encontradas: ${allCalls?.length || 0}`);

        if (allCalls && allCalls.length > 0) {
            // Contar por status
            const statusCount = {};
            allCalls.forEach(call => {
                const status = call.status_voip || 'NULL';
                statusCount[status] = (statusCount[status] || 0) + 1;
            });

            console.log('\n📈 Por status VOIP:');
            Object.entries(statusCount).forEach(([status, count]) => {
                console.log(`  ${status}: ${count}`);
            });

            const atendidas = statusCount['normal_clearing'] || 0;
            const naoAtendidas = (allCalls.length) - atendidas;
            const taxa = allCalls.length > 0 ? Math.round((atendidas / allCalls.length) * 100) : 0;

            console.log('\n🎯 RESUMO FINAL:');
            console.log(`  📞 Total: ${allCalls.length}`);
            console.log(`  ✅ Atendidas: ${atendidas}`);
            console.log(`  ❌ Não Atendidas: ${naoAtendidas}`);
            console.log(`  📊 Taxa de Atendimento: ${taxa}%`);

            // Mostrar algumas chamadas de exemplo
            console.log('\n🔍 Primeiras 5 chamadas:');
            allCalls.slice(0, 5).forEach((call, i) => {
                console.log(`  ${i + 1}. ${call.created_at} | ${call.status_voip} | ID: ${call.id}`);
            });
        }

        // Teste 2: Simular exatamente a query do gráfico
        console.log('\n\n📊 TESTE 2: Simulando query do gráfico');
        const { data: chartData, error: chartError } = await supabase
            .from('calls')
            .select('created_at, status_voip')
            .gte('created_at', '2025-09-08T00:00:00')
            .lte('created_at', '2025-09-08T23:59:59')
            .order('created_at', { ascending: true });

        if (chartError) {
            console.error('❌ Erro na query do gráfico:', chartError);
            return;
        }

        console.log(`✅ Query do gráfico retornou: ${chartData?.length || 0} registros`);

        // Simular agrupamento do gráfico
        if (chartData && chartData.length > 0) {
            const groupedData = new Map();
            
            chartData.forEach((call) => {
                const date = new Date(call.created_at).toISOString().split('T')[0];
                const isAnswered = call.status_voip === 'normal_clearing';
                
                if (!groupedData.has(date)) {
                    groupedData.set(date, { answered: 0, missed: 0 });
                }
                
                const current = groupedData.get(date);
                if (isAnswered) {
                    current.answered++;
                } else {
                    current.missed++;
                }
            });

            console.log('\n📈 Dados agrupados (como no gráfico):');
            groupedData.forEach((counts, date) => {
                const total = counts.answered + counts.missed;
                const rate = total > 0 ? Math.round((counts.answered / total) * 100) : 0;
                console.log(`  ${date}: Total=${total}, Atendidas=${counts.answered}, Não Atendidas=${counts.missed}, Taxa=${rate}%`);
            });
        }

        // Teste 3: Verificar se há dados em outras datas que possam estar "vazando"
        console.log('\n\n📅 TESTE 3: Verificando dados de outras datas próximas');
        const { data: nearDates, error: nearError } = await supabase
            .from('calls')
            .select('created_at, status_voip')
            .gte('created_at', '2025-09-06T00:00:00')
            .lte('created_at', '2025-09-10T23:59:59')
            .order('created_at', { ascending: true });

        if (!nearError && nearDates) {
            const dateGroups = new Map();
            nearDates.forEach(call => {
                const date = new Date(call.created_at).toISOString().split('T')[0];
                if (!dateGroups.has(date)) {
                    dateGroups.set(date, 0);
                }
                dateGroups.set(date, dateGroups.get(date) + 1);
            });

            console.log('📊 Chamadas por data (06/09 a 10/09):');
            Array.from(dateGroups.entries())
                .sort(([a], [b]) => a.localeCompare(b))
                .forEach(([date, count]) => {
                    console.log(`  ${date}: ${count} chamadas`);
                });
        }

    } catch (error) {
        console.error('💥 Erro geral:', error);
    }
}

checkRealData();
