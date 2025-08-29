// Script para debugar problemas no sistema de calls
// Execute: node debug-calls-issues.js

const { createClient } = require('@supabase/supabase-js');

// Configuração do Supabase
const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://your-project.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'your-service-key';

if (!supabaseUrl.includes('supabase.co') || !supabaseServiceKey.startsWith('eyJ')) {
  console.log('⚠️  Configure as variáveis VITE_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function debugCallsIssues() {
  console.log('🔍 DEBUG - Problemas no Sistema de Calls');
  console.log('==========================================\n');

  try {
    // 1. Verificar dados brutos na tabela calls
    console.log('1️⃣ Verificando dados brutos na tabela calls...');
    const { data: rawCalls, error: rawError } = await supabase
      .from('calls')
      .select('*')
      .limit(5);
    
    if (rawError) {
      console.error('❌ Erro ao buscar calls:', rawError);
      return;
    }

    console.log(`✅ ${rawCalls?.length || 0} calls encontradas na tabela`);
    if (rawCalls && rawCalls.length > 0) {
      const firstCall = rawCalls[0];
      console.log('📞 Primeira call (dados brutos):');
      console.log({
        id: firstCall.id,
        agent_id: firstCall.agent_id,
        deal_id: firstCall.deal_id,
        sdr_id: firstCall.sdr_id,
        insights: firstCall.insights,
        duration: firstCall.duration,
        status: firstCall.status,
        recording_url: firstCall.recording_url,
        audio_bucket: firstCall.audio_bucket,
        audio_path: firstCall.audio_path
      });
    }

    // 2. Verificar se as funções RPC existem
    console.log('\n2️⃣ Verificando se as funções RPC existem...');
    
    // Testar get_calls_with_details
    const { data: callsWithDetails, error: detailsError } = await supabase.rpc('get_calls_with_details', {
      p_limit: 3
    });
    
    if (detailsError) {
      console.error('❌ Função get_calls_with_details não existe ou tem erro:', detailsError);
    } else {
      console.log('✅ Função get_calls_with_details funciona');
      console.log(`📊 Retornou ${callsWithDetails?.length || 0} calls`);
      if (callsWithDetails && callsWithDetails.length > 0) {
        console.log('📞 Primeira call processada:', {
          company_name: callsWithDetails[0].company_name,
          person_name: callsWithDetails[0].person_name,
          sdr_name: callsWithDetails[0].sdr_name,
          sdr_email: callsWithDetails[0].sdr_email,
          audio_url: callsWithDetails[0].audio_url
        });
      }
    }

    // 3. Verificar tabela profiles
    console.log('\n3️⃣ Verificando tabela profiles...');
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, email, name, user_function')
      .limit(10);
    
    if (profilesError) {
      console.error('❌ Erro ao buscar profiles:', profilesError);
    } else {
      console.log(`✅ ${profiles?.length || 0} profiles encontrados`);
      profiles?.forEach(p => {
        console.log(`👤 ${p.name || 'Sem nome'} (${p.email}) - ${p.user_function || 'Sem função'}`);
      });
    }

    // 4. Testar mapeamento SDR
    console.log('\n4️⃣ Testando mapeamento SDR...');
    if (rawCalls && rawCalls.length > 0 && rawCalls[0].agent_id) {
      const { data: mappingResult, error: mappingError } = await supabase.rpc('map_sdr_email', {
        input_email: rawCalls[0].agent_id
      });
      
      if (mappingError) {
        console.error('❌ Erro no mapeamento SDR:', mappingError);
      } else {
        console.log('✅ Mapeamento SDR:', mappingResult);
      }
    }

    // 5. Verificar tabela pipedrive_deals
    console.log('\n5️⃣ Verificando tabela pipedrive_deals...');
    const { data: deals, error: dealsError } = await supabase
      .from('pipedrive_deals')
      .select('*')
      .limit(5);
    
    if (dealsError) {
      console.error('❌ Erro ao buscar deals (tabela pode não existir):', dealsError);
    } else {
      console.log(`✅ ${deals?.length || 0} deals encontrados na tabela pipedrive_deals`);
      if (deals && deals.length > 0) {
        console.log('🏢 Primeiro deal:', {
          id: deals[0].id,
          org_name: deals[0].org_name,
          person_name: deals[0].person_name
        });
      }
    }

    // 6. Testar função get_unique_sdrs
    console.log('\n6️⃣ Testando função get_unique_sdrs...');
    const { data: uniqueSdrs, error: sdrsError } = await supabase.rpc('get_unique_sdrs');
    
    if (sdrsError) {
      console.error('❌ Erro na função get_unique_sdrs:', sdrsError);
    } else {
      console.log(`✅ ${uniqueSdrs?.length || 0} SDRs únicos encontrados`);
      uniqueSdrs?.forEach(sdr => {
        console.log(`👤 ${sdr.sdr_name} (${sdr.sdr_email}) - ${sdr.call_count} calls`);
      });
    }

    // 7. Verificar estrutura da tabela calls
    console.log('\n7️⃣ Verificando estrutura da tabela calls...');
    const { data: tableInfo, error: tableError } = await supabase
      .rpc('exec', { 
        sql: `
          SELECT column_name, data_type, is_nullable 
          FROM information_schema.columns 
          WHERE table_name = 'calls' AND table_schema = 'public'
          ORDER BY ordinal_position;
        `
      });
    
    if (tableError) {
      console.log('ℹ️  Não foi possível verificar estrutura da tabela (função exec pode não existir)');
    } else {
      console.log('✅ Estrutura da tabela calls:', tableInfo);
    }

    console.log('\n📋 RESUMO DOS PROBLEMAS IDENTIFICADOS:');
    console.log('=====================================');
    
    if (!callsWithDetails || callsWithDetails.length === 0) {
      console.log('❌ PROBLEMA 1: Função get_calls_with_details não retorna dados');
    }
    
    if (!uniqueSdrs || uniqueSdrs.length === 0) {
      console.log('❌ PROBLEMA 2: Função get_unique_sdrs não retorna SDRs');
    }
    
    if (rawCalls && rawCalls.length > 0) {
      const hasCompanyData = rawCalls.some(c => 
        (c.insights && c.insights.company) || 
        (c.insights && c.insights.metadata && c.insights.metadata.company)
      );
      
      if (!hasCompanyData) {
        console.log('❌ PROBLEMA 3: Dados de empresa não estão no campo insights');
      }
      
      const hasAgentId = rawCalls.some(c => c.agent_id);
      if (!hasAgentId) {
        console.log('❌ PROBLEMA 4: Campo agent_id está vazio nas calls');
      }
    }

  } catch (error) {
    console.error('💥 ERRO INESPERADO:', error);
  }
}

// Executar debug
debugCallsIssues();
