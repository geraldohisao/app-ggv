// Script para verificar dados reais na tabela calls
// Execute: node test-calls-data-real.js

const { createClient } = require('@supabase/supabase-js');

// Configuração do Supabase
const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://your-project.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'your-service-key';

if (!supabaseUrl.includes('supabase.co') || !supabaseServiceKey.startsWith('eyJ')) {
  console.log('⚠️  Configure as variáveis VITE_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function testRealCallsData() {
  console.log('🔍 ANÁLISE - Dados Reais da Tabela Calls');
  console.log('=========================================\n');

  try {
    // 1. Verificar dados brutos
    console.log('1️⃣ Verificando dados brutos na tabela calls...');
    const { data: rawCalls, error: rawError } = await supabase
      .from('calls')
      .select('id, agent_id, deal_id, insights, duration, status, recording_url, audio_bucket, audio_path')
      .limit(5);
    
    if (rawError) {
      console.error('❌ Erro ao buscar calls:', rawError);
      return;
    }

    console.log(`✅ ${rawCalls?.length || 0} calls encontradas`);
    
    if (rawCalls && rawCalls.length > 0) {
      rawCalls.forEach((call, index) => {
        console.log(`\n📞 Call ${index + 1}:`);
        console.log('  ID:', call.id.slice(0, 8) + '...');
        console.log('  Agent ID:', call.agent_id || 'NULL');
        console.log('  Deal ID:', call.deal_id || 'NULL');
        console.log('  Status:', call.status);
        console.log('  Duration:', call.duration);
        console.log('  Recording URL:', call.recording_url ? 'Tem URL' : 'Sem URL');
        console.log('  Audio Bucket/Path:', call.audio_bucket && call.audio_path ? 'Tem' : 'Sem');
        
        if (call.insights && typeof call.insights === 'object') {
          console.log('  Insights:');
          console.log('    - company:', call.insights.company || 'N/A');
          console.log('    - companyName:', call.insights.companyName || 'N/A');
          console.log('    - person_name:', call.insights.person_name || 'N/A');
          console.log('    - personName:', call.insights.personName || 'N/A');
          if (call.insights.metadata) {
            console.log('    - metadata.company:', call.insights.metadata.company || 'N/A');
            console.log('    - metadata.person_name:', call.insights.metadata.person_name || 'N/A');
          }
          console.log('    - Todas as chaves:', Object.keys(call.insights));
        } else {
          console.log('  Insights: Vazio ou inválido');
        }
      });

      // 2. Testar funções simplificadas
      console.log('\n2️⃣ Testando funções simplificadas...');
      
      // Testar get_unique_sdrs_simple
      const { data: uniqueSdrs, error: sdrsError } = await supabase.rpc('get_unique_sdrs_simple');
      
      if (sdrsError) {
        console.error('❌ Erro na função get_unique_sdrs_simple:', sdrsError);
      } else {
        console.log(`✅ ${uniqueSdrs?.length || 0} SDRs únicos encontrados:`);
        uniqueSdrs?.forEach(sdr => {
          console.log(`👤 ${sdr.sdr_name} (${sdr.sdr_email}) - ${sdr.call_count} calls`);
        });
      }

      // Testar get_calls_simple
      const { data: callsSimple, error: callsError } = await supabase.rpc('get_calls_simple', {
        p_limit: 3
      });
      
      if (callsError) {
        console.error('❌ Erro na função get_calls_simple:', callsError);
      } else {
        console.log(`\n✅ ${callsSimple?.length || 0} calls processadas:`);
        callsSimple?.forEach((call, index) => {
          console.log(`\n📞 Call ${index + 1} processada:`);
          console.log('  Empresa:', call.company_name);
          console.log('  Pessoa:', call.person_name);
          console.log('  SDR:', call.sdr_name);
          console.log('  Email SDR:', call.sdr_email);
          console.log('  Áudio:', call.audio_url ? 'Disponível' : 'Indisponível');
        });
      }

      // Testar detalhes de uma call
      const testCallId = rawCalls[0].id;
      const { data: callDetail, error: detailError } = await supabase.rpc('get_call_detail_simple', {
        p_call_id: testCallId
      });
      
      if (detailError) {
        console.error('❌ Erro ao buscar detalhes:', detailError);
      } else {
        console.log('\n✅ Detalhes da call:', callDetail?.[0] ? {
          empresa: callDetail[0].company_name,
          pessoa: callDetail[0].person_name,
          sdr: callDetail[0].sdr_name,
          audio: callDetail[0].audio_url ? 'Disponível' : 'Indisponível'
        } : 'Não encontrados');
      }
    }

    console.log('\n🎯 RESUMO DA ANÁLISE:');
    console.log('====================');
    
    if (rawCalls && rawCalls.length > 0) {
      const hasAgentIds = rawCalls.some(c => c.agent_id);
      const hasDealIds = rawCalls.some(c => c.deal_id);
      const hasInsights = rawCalls.some(c => c.insights && Object.keys(c.insights).length > 0);
      const hasCompanyInInsights = rawCalls.some(c => 
        c.insights && (c.insights.company || c.insights.companyName || (c.insights.metadata && c.insights.metadata.company))
      );
      
      console.log('✅ Agent IDs presentes:', hasAgentIds ? 'SIM' : 'NÃO');
      console.log('✅ Deal IDs presentes:', hasDealIds ? 'SIM' : 'NÃO');
      console.log('✅ Campo insights populado:', hasInsights ? 'SIM' : 'NÃO');
      console.log('✅ Dados de empresa nos insights:', hasCompanyInInsights ? 'SIM' : 'NÃO');
    }

  } catch (error) {
    console.error('💥 ERRO INESPERADO:', error);
  }
}

// Executar análise
testRealCallsData();
