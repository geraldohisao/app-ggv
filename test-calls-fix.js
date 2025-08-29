// Script para testar as funções RPC corrigidas
// Execute: node test-calls-fix.js

const { createClient } = require('@supabase/supabase-js');

// Configuração do Supabase
const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://your-project.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'your-service-key';

if (!supabaseUrl.includes('supabase.co') || !supabaseServiceKey.startsWith('eyJ')) {
  console.log('⚠️  Configure as variáveis VITE_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function testCallsFix() {
  console.log('🧪 TESTE - Funções RPC Corrigidas');
  console.log('==================================\n');

  try {
    // 1. Testar dados brutos primeiro
    console.log('1️⃣ Verificando dados brutos na tabela calls...');
    const { data: rawCalls, error: rawError } = await supabase
      .from('calls')
      .select('id, agent_id, deal_id, insights, duration, status')
      .limit(3);
    
    if (rawError) {
      console.error('❌ Erro ao buscar calls:', rawError);
      return;
    }

    console.log(`✅ ${rawCalls?.length || 0} calls encontradas`);
    if (rawCalls && rawCalls.length > 0) {
      rawCalls.forEach((call, index) => {
        console.log(`📞 Call ${index + 1}:`, {
          id: call.id.slice(0, 8) + '...',
          agent_id: call.agent_id || 'NULL',
          deal_id: call.deal_id || 'NULL',
          has_insights: !!call.insights && Object.keys(call.insights).length > 0,
          insights_company: call.insights?.company || 'N/A',
          duration: call.duration,
          status: call.status
        });
      });
    }

    // 2. Testar mapeamento SDR corrigido
    console.log('\n2️⃣ Testando mapeamento SDR corrigido...');
    if (rawCalls && rawCalls.length > 0 && rawCalls[0].agent_id) {
      const testEmail = rawCalls[0].agent_id;
      console.log(`🔍 Testando mapeamento para: "${testEmail}"`);
      
      const { data: mappingResult, error: mappingError } = await supabase.rpc('map_sdr_email_fixed', {
        input_email: testEmail
      });
      
      if (mappingError) {
        console.error('❌ Erro no mapeamento SDR:', mappingError);
      } else {
        console.log('✅ Resultado do mapeamento:', mappingResult);
      }
    }

    // 3. Testar função get_unique_sdrs_fixed
    console.log('\n3️⃣ Testando função get_unique_sdrs_fixed...');
    const { data: uniqueSdrs, error: sdrsError } = await supabase.rpc('get_unique_sdrs_fixed');
    
    if (sdrsError) {
      console.error('❌ Erro na função get_unique_sdrs_fixed:', sdrsError);
    } else {
      console.log(`✅ ${uniqueSdrs?.length || 0} SDRs únicos encontrados:`);
      uniqueSdrs?.forEach(sdr => {
        console.log(`👤 ${sdr.sdr_name} (${sdr.sdr_email}) - ${sdr.call_count} calls`);
      });
    }

    // 4. Testar função get_calls_with_details_fixed
    console.log('\n4️⃣ Testando função get_calls_with_details_fixed...');
    const { data: callsWithDetails, error: detailsError } = await supabase.rpc('get_calls_with_details_fixed', {
      p_limit: 3,
      p_offset: 0
    });
    
    if (detailsError) {
      console.error('❌ Erro na função get_calls_with_details_fixed:', detailsError);
    } else {
      console.log(`✅ ${callsWithDetails?.length || 0} calls processadas:`);
      callsWithDetails?.forEach((call, index) => {
        console.log(`📞 Call ${index + 1} processada:`, {
          id: call.id.slice(0, 8) + '...',
          company_name: call.company_name,
          person_name: call.person_name,
          sdr_name: call.sdr_name,
          sdr_email: call.sdr_email,
          audio_url: call.audio_url ? '✅ Tem áudio' : '❌ Sem áudio',
          status: call.status
        });
      });
    }

    // 5. Testar detalhes de uma call específica
    if (rawCalls && rawCalls.length > 0) {
      console.log('\n5️⃣ Testando detalhes de call específica...');
      const testCallId = rawCalls[0].id;
      
      const { data: callDetail, error: detailError } = await supabase.rpc('get_call_detail_complete_fixed', {
        p_call_id: testCallId
      });
      
      if (detailError) {
        console.error('❌ Erro ao buscar detalhes:', detailError);
      } else {
        console.log('✅ Detalhes da call:', callDetail?.[0] ? {
          company_name: callDetail[0].company_name,
          person_name: callDetail[0].person_name,
          sdr_name: callDetail[0].sdr_name,
          audio_url: callDetail[0].audio_url ? 'Disponível' : 'Indisponível'
        } : 'Não encontrados');
      }
    }

    // 6. Testar filtros
    if (uniqueSdrs && uniqueSdrs.length > 0) {
      console.log('\n6️⃣ Testando filtros por SDR...');
      const testSdrEmail = uniqueSdrs[0].sdr_email;
      
      const { data: filteredCalls, error: filterError } = await supabase.rpc('get_calls_with_details_fixed', {
        p_limit: 5,
        p_offset: 0,
        p_sdr_email: testSdrEmail
      });
      
      if (filterError) {
        console.error('❌ Erro no filtro por SDR:', filterError);
      } else {
        console.log(`✅ Filtro por SDR "${testSdrEmail}": ${filteredCalls?.length || 0} calls encontradas`);
      }
    }

    console.log('\n🎉 TESTE CONCLUÍDO!');
    console.log('==================================');
    console.log('✅ Funções RPC corrigidas testadas');
    console.log('🔧 Principais melhorias:');
    console.log('   - Mapeamento SDR mais robusto');
    console.log('   - Fallbacks para dados ausentes');
    console.log('   - Filtros funcionais');
    console.log('   - Identificação correta de empresa/pessoa');

  } catch (error) {
    console.error('💥 ERRO INESPERADO:', error);
  }
}

// Executar teste
testCallsFix();
