// Script para testar as funções básicas
// Execute: node test-basic-functions.js

const { createClient } = require('@supabase/supabase-js');

// Configuração do Supabase
const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://your-project.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'your-service-key';

if (!supabaseUrl.includes('supabase.co') || !supabaseServiceKey.startsWith('eyJ')) {
  console.log('⚠️  Configure as variáveis VITE_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function testBasicFunctions() {
  console.log('🧪 TESTE - Funções Básicas');
  console.log('==========================\n');

  try {
    // 1. Testar dados brutos primeiro
    console.log('1️⃣ Verificando dados brutos...');
    const { data: rawCalls, error: rawError } = await supabase
      .from('calls')
      .select('id, agent_id, deal_id, status, duration, recording_url')
      .limit(3);
    
    if (rawError) {
      console.error('❌ Erro ao buscar calls:', rawError);
      return;
    }

    console.log(`✅ ${rawCalls?.length || 0} calls encontradas na tabela`);
    if (rawCalls && rawCalls.length > 0) {
      rawCalls.forEach((call, index) => {
        console.log(`📞 Call ${index + 1}:`, {
          id: call.id.slice(0, 8) + '...',
          agent_id: call.agent_id || 'NULL',
          deal_id: call.deal_id || 'NULL',
          status: call.status,
          duration: call.duration,
          has_recording: !!call.recording_url
        });
      });
    }

    // 2. Testar função get_unique_sdrs_basic
    console.log('\n2️⃣ Testando get_unique_sdrs_basic...');
    const { data: uniqueSdrs, error: sdrsError } = await supabase.rpc('get_unique_sdrs_basic');
    
    if (sdrsError) {
      console.error('❌ Erro na função get_unique_sdrs_basic:', sdrsError);
    } else {
      console.log(`✅ ${uniqueSdrs?.length || 0} SDRs únicos encontrados:`);
      uniqueSdrs?.forEach(sdr => {
        console.log(`👤 ${sdr.sdr_name} (${sdr.sdr_email}) - ${sdr.call_count} calls`);
      });
    }

    // 3. Testar função get_calls_basic
    console.log('\n3️⃣ Testando get_calls_basic...');
    const { data: callsBasic, error: callsError } = await supabase.rpc('get_calls_basic', {
      p_limit: 3,
      p_offset: 0
    });
    
    if (callsError) {
      console.error('❌ Erro na função get_calls_basic:', callsError);
    } else {
      console.log(`✅ ${callsBasic?.length || 0} calls processadas:`);
      callsBasic?.forEach((call, index) => {
        console.log(`\n📞 Call ${index + 1} processada:`);
        console.log('  ID:', call.id.slice(0, 8) + '...');
        console.log('  Empresa:', call.company_name);
        console.log('  Pessoa:', call.person_name);
        console.log('  SDR:', call.sdr_name);
        console.log('  Email SDR:', call.sdr_email);
        console.log('  Status:', call.status);
        console.log('  Duração:', call.duration);
        console.log('  Áudio:', call.audio_url ? 'Disponível' : 'Indisponível');
        console.log('  Total Count:', call.total_count);
      });
    }

    // 4. Testar detalhes de uma call
    if (rawCalls && rawCalls.length > 0) {
      console.log('\n4️⃣ Testando get_call_detail_basic...');
      const testCallId = rawCalls[0].id;
      
      const { data: callDetail, error: detailError } = await supabase.rpc('get_call_detail_basic', {
        p_call_id: testCallId
      });
      
      if (detailError) {
        console.error('❌ Erro ao buscar detalhes:', detailError);
      } else {
        console.log('✅ Detalhes da call:', callDetail?.[0] ? {
          empresa: callDetail[0].company_name,
          pessoa: callDetail[0].person_name,
          sdr: callDetail[0].sdr_name,
          status: callDetail[0].status,
          audio: callDetail[0].audio_url ? 'Disponível' : 'Indisponível'
        } : 'Não encontrados');
      }
    }

    console.log('\n🎯 RESUMO:');
    console.log('==========');
    
    const hasData = rawCalls && rawCalls.length > 0;
    const hasSDRs = uniqueSdrs && uniqueSdrs.length > 0;
    const hasCalls = callsBasic && callsBasic.length > 0;
    
    console.log('✅ Dados na tabela calls:', hasData ? 'SIM' : 'NÃO');
    console.log('✅ SDRs únicos funcionando:', hasSDRs ? 'SIM' : 'NÃO');
    console.log('✅ Lista de calls funcionando:', hasCalls ? 'SIM' : 'NÃO');
    
    if (hasData && hasSDRs && hasCalls) {
      console.log('\n🎉 TODAS AS FUNÇÕES BÁSICAS ESTÃO FUNCIONANDO!');
    } else {
      console.log('\n⚠️  Algumas funções ainda têm problemas.');
    }

  } catch (error) {
    console.error('💥 ERRO INESPERADO:', error);
  }
}

// Executar teste
testBasicFunctions();
