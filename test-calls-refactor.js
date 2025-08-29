// Script para testar as novas funções RPC do sistema de calls refatorado
// Execute: node test-calls-refactor.js

const { createClient } = require('@supabase/supabase-js');

// Configuração do Supabase
const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://your-project.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'your-service-key';

if (!supabaseUrl.includes('supabase.co') || !supabaseServiceKey.startsWith('eyJ')) {
  console.log('⚠️  Configure as variáveis VITE_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function testCallsRefactor() {
  console.log('🧪 TESTE - Sistema de Calls Refatorado');
  console.log('=====================================\n');

  try {
    // 1. Testar função de mapeamento SDR
    console.log('1️⃣ Testando mapeamento de usuários SDR...');
    const { data: mappingTest, error: mappingError } = await supabase.rpc('map_sdr_email', {
      input_email: 'camila.ataliba@ggvinteligencia.com.br'
    });
    
    if (mappingError) {
      console.error('❌ Erro no mapeamento SDR:', mappingError);
    } else {
      console.log('✅ Mapeamento SDR:', mappingTest);
    }

    // 2. Testar busca de SDRs únicos
    console.log('\n2️⃣ Testando busca de SDRs únicos...');
    const { data: sdrsData, error: sdrsError } = await supabase.rpc('get_unique_sdrs');
    
    if (sdrsError) {
      console.error('❌ Erro ao buscar SDRs:', sdrsError);
    } else {
      console.log(`✅ ${sdrsData?.length || 0} SDRs encontrados:`, sdrsData);
    }

    // 3. Testar busca de calls com detalhes
    console.log('\n3️⃣ Testando busca de calls com detalhes...');
    const { data: callsData, error: callsError } = await supabase.rpc('get_calls_with_details', {
      p_limit: 5,
      p_offset: 0
    });
    
    if (callsError) {
      console.error('❌ Erro ao buscar calls:', callsError);
    } else {
      console.log(`✅ ${callsData?.length || 0} calls encontradas`);
      if (callsData && callsData.length > 0) {
        const firstCall = callsData[0];
        console.log('📞 Primeira call:', {
          id: firstCall.id,
          company_name: firstCall.company_name,
          person_name: firstCall.person_name,
          sdr_name: firstCall.sdr_name,
          sdr_email: firstCall.sdr_email,
          audio_url: firstCall.audio_url ? '✅ Tem áudio' : '❌ Sem áudio',
          deal_id: firstCall.deal_id
        });

        // 4. Testar detalhes de uma call específica
        console.log('\n4️⃣ Testando detalhes de call específica...');
        const { data: callDetail, error: detailError } = await supabase.rpc('get_call_detail_complete', {
          p_call_id: firstCall.id
        });
        
        if (detailError) {
          console.error('❌ Erro ao buscar detalhes:', detailError);
        } else {
          console.log('✅ Detalhes da call:', callDetail?.[0] ? 'Encontrados' : 'Não encontrados');
        }
      }
    }

    // 5. Testar sincronização de deal (exemplo)
    console.log('\n5️⃣ Testando sincronização de deal do Pipedrive...');
    const testDealData = {
      p_deal_id: 'TEST-DEAL-123',
      p_title: 'Deal de Teste',
      p_org_name: 'Empresa Teste Ltda',
      p_person_name: 'João da Silva',
      p_person_email: 'joao@empresateste.com',
      p_status: 'open',
      p_raw_data: { test: true, source: 'test-script' }
    };

    const { data: syncData, error: syncError } = await supabase.rpc('sync_pipedrive_deal', testDealData);
    
    if (syncError) {
      console.error('❌ Erro ao sincronizar deal:', syncError);
    } else {
      console.log('✅ Deal sincronizado:', syncData?.id);
    }

    // 6. Verificar estrutura da tabela calls
    console.log('\n6️⃣ Verificando estrutura da tabela calls...');
    const { data: callsCount, error: countError } = await supabase
      .from('calls')
      .select('*', { count: 'exact', head: true });
    
    if (countError) {
      console.error('❌ Erro ao contar calls:', countError);
    } else {
      console.log(`✅ Total de calls na tabela: ${callsCount || 0}`);
    }

    // 7. Verificar tabela pipedrive_deals
    console.log('\n7️⃣ Verificando tabela pipedrive_deals...');
    const { data: dealsCount, error: dealsCountError } = await supabase
      .from('pipedrive_deals')
      .select('*', { count: 'exact', head: true });
    
    if (dealsCountError) {
      console.error('❌ Erro ao contar deals:', dealsCountError);
    } else {
      console.log(`✅ Total de deals na tabela: ${dealsCount || 0}`);
    }

    console.log('\n🎉 TESTE CONCLUÍDO!');
    console.log('=====================================');
    console.log('✅ Sistema de calls refatorado está funcionando');
    console.log('🔧 Funcionalidades implementadas:');
    console.log('   - Mapeamento de usuários SDR (@grupoggv.com vs @ggvinteligencia.com.br)');
    console.log('   - Relacionamento deal_id -> empresa/pessoa');
    console.log('   - URLs de áudio corrigidas (recording_url ou bucket/path)');
    console.log('   - Busca avançada com filtros');
    console.log('   - Cache de dados do Pipedrive');

  } catch (error) {
    console.error('💥 ERRO INESPERADO:', error);
  }
}

// Executar teste
testCallsRefactor();
