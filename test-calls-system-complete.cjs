// Teste completo do sistema de chamadas
// Execute: node test-calls-system-complete.cjs

const { createClient } = require('@supabase/supabase-js');

// Configuração do Supabase
const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://your-project.supabase.co';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || 'your-anon-key';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testCallsSystem() {
  console.log('🚀 Iniciando teste completo do sistema de chamadas...\n');

  try {
    // 1. Testar conexão com Supabase
    console.log('1️⃣ Testando conexão com Supabase...');
    const { data: testData, error: testError } = await supabase
      .from('calls')
      .select('count')
      .limit(1);
    
    if (testError) {
      throw new Error(`Erro de conexão: ${testError.message}`);
    }
    console.log('✅ Conexão com Supabase OK\n');

    // 2. Verificar dados na tabela calls
    console.log('2️⃣ Verificando dados na tabela calls...');
    const { data: callsData, error: callsError } = await supabase
      .from('calls')
      .select('*')
      .limit(5);
    
    if (callsError) {
      throw new Error(`Erro ao buscar calls: ${callsError.message}`);
    }
    
    console.log(`✅ Encontradas ${callsData?.length || 0} chamadas na tabela`);
    if (callsData && callsData.length > 0) {
      console.log('📊 Exemplo de chamada:', {
        id: callsData[0].id,
        agent_id: callsData[0].agent_id,
        sdr_id: callsData[0].sdr_id,
        status: callsData[0].status,
        created_at: callsData[0].created_at
      });
    }
    console.log('');

    // 3. Testar função get_calls_v2
    console.log('3️⃣ Testando função get_calls_v2...');
    const { data: rpcData, error: rpcError } = await supabase.rpc('get_calls_v2', {
      p_limit: 10,
      p_offset: 0,
      p_sdr_id: null,
      p_status: null,
      p_call_type: null,
      p_start: null,
      p_end: null
    });
    
    if (rpcError) {
      console.error('❌ Erro na RPC get_calls_v2:', rpcError);
      console.log('🔄 Tentando criar/atualizar a função...');
      
      // Tentar executar o script SQL para corrigir a função
      const sqlScript = `
        CREATE OR REPLACE FUNCTION public.get_calls_v2(
            p_limit INTEGER DEFAULT 50,
            p_offset INTEGER DEFAULT 0,
            p_sdr_id UUID DEFAULT NULL,
            p_status TEXT DEFAULT NULL,
            p_call_type TEXT DEFAULT NULL,
            p_start TIMESTAMPTZ DEFAULT NULL,
            p_end TIMESTAMPTZ DEFAULT NULL
        )
        RETURNS TABLE (
            id UUID,
            provider_call_id TEXT,
            company TEXT,
            deal_id TEXT,
            sdr_id UUID,
            sdr_name TEXT,
            sdr_email TEXT,
            status TEXT,
            duration INTEGER,
            call_type TEXT,
            direction TEXT,
            recording_url TEXT,
            audio_bucket TEXT,
            audio_path TEXT,
            transcription TEXT,
            transcript_status TEXT,
            ai_status TEXT,
            insights JSONB,
            scorecard JSONB,
            from_number TEXT,
            to_number TEXT,
            agent_id TEXT,
            created_at TIMESTAMPTZ,
            updated_at TIMESTAMPTZ,
            processed_at TIMESTAMPTZ,
            total_count BIGINT
        )
        LANGUAGE SQL
        SECURITY DEFINER
        SET search_path = public
        AS $$
          WITH base AS (
            SELECT c.*,
                   COALESCE(p.full_name, um.full_name) as sdr_name,
                   COALESCE(p.email, um.email) as sdr_email
            FROM calls c
            LEFT JOIN profiles p ON c.sdr_id = p.id
            LEFT JOIN user_mapping um ON c.agent_id = um.agent_id
            WHERE (p_sdr_id IS NULL OR c.sdr_id = p_sdr_id OR c.agent_id = p_sdr_id::TEXT)
              AND (p_status IS NULL OR c.status = p_status)
              AND (p_call_type IS NULL OR c.call_type = p_call_type)
              AND (p_start IS NULL OR c.created_at >= p_start)
              AND (p_end   IS NULL OR c.created_at <= p_end)
          ), total AS (SELECT COUNT(*) FROM base)
          SELECT
            b.id,
            b.provider_call_id,
            COALESCE(
                (b.insights->>'company'), 
                (b.insights->'metadata'->>'company'),
                'Empresa não informada'
            ) AS company,
            b.deal_id,
            b.sdr_id,
            b.sdr_name,
            b.sdr_email,
            b.status,
            b.duration,
            b.call_type,
            b.direction,
            b.recording_url,
            b.audio_bucket,
            b.audio_path,
            b.transcription,
            b.transcript_status,
            b.ai_status,
            b.insights,
            b.scorecard,
            b.from_number,
            b.to_number,
            b.agent_id,
            b.created_at,
            b.updated_at,
            b.processed_at,
            (SELECT * FROM total) AS total_count
          FROM base b
          ORDER BY b.created_at DESC
          LIMIT p_limit OFFSET p_offset;
        $$;
      `;
      
      // Nota: Não podemos executar SQL diretamente via cliente, mas podemos verificar se a função existe
      console.log('⚠️ Função get_calls_v2 não encontrada ou com erro');
      console.log('📝 Execute o script SQL no Supabase SQL Editor para corrigir');
    } else {
      console.log(`✅ RPC get_calls_v2 funcionando - ${rpcData?.length || 0} registros retornados`);
      if (rpcData && rpcData.length > 0) {
        console.log('📊 Exemplo de retorno da RPC:', {
          id: rpcData[0].id,
          sdr_name: rpcData[0].sdr_name,
          agent_id: rpcData[0].agent_id,
          company: rpcData[0].company,
          total_count: rpcData[0].total_count
        });
      }
    }
    console.log('');

    // 4. Verificar tabela user_mapping
    console.log('4️⃣ Verificando tabela user_mapping...');
    const { data: mappingData, error: mappingError } = await supabase
      .from('user_mapping')
      .select('*')
      .limit(5);
    
    if (mappingError) {
      console.log('⚠️ Tabela user_mapping não encontrada ou erro:', mappingError.message);
    } else {
      console.log(`✅ Tabela user_mapping OK - ${mappingData?.length || 0} registros`);
      if (mappingData && mappingData.length > 0) {
        console.log('📊 Exemplo de mapeamento:', mappingData[0]);
      }
    }
    console.log('');

    // 5. Verificar tabela profiles
    console.log('5️⃣ Verificando tabela profiles...');
    const { data: profilesData, error: profilesError } = await supabase
      .from('profiles')
      .select('*')
      .limit(5);
    
    if (profilesError) {
      console.log('⚠️ Tabela profiles não encontrada ou erro:', profilesError.message);
    } else {
      console.log(`✅ Tabela profiles OK - ${profilesData?.length || 0} registros`);
      if (profilesData && profilesData.length > 0) {
        console.log('📊 Exemplo de perfil:', {
          id: profilesData[0].id,
          full_name: profilesData[0].full_name,
          email: profilesData[0].email
        });
      }
    }
    console.log('');

    // 6. Testar busca de usuários reais
    console.log('6️⃣ Testando busca de usuários reais...');
    const { data: usersData, error: usersError } = await supabase
      .from('calls')
      .select('agent_id, sdr_id, sdr_name')
      .not('agent_id', 'is', null)
      .limit(10);
    
    if (usersError) {
      console.log('❌ Erro ao buscar usuários:', usersError.message);
    } else {
      console.log(`✅ Encontrados ${usersData?.length || 0} registros com agent_id`);
      
      // Criar mapa de usuários únicos
      const userMap = new Map();
      usersData?.forEach(call => {
        if (call.agent_id) {
          userMap.set(call.agent_id, {
            id: call.agent_id,
            name: call.sdr_name || `Usuário ${call.agent_id}`,
            role: 'user'
          });
        }
      });
      
      const uniqueUsers = Array.from(userMap.values());
      console.log(`📊 Usuários únicos encontrados: ${uniqueUsers.length}`);
      uniqueUsers.slice(0, 3).forEach(user => {
        console.log(`   - ${user.name} (${user.id})`);
      });
    }
    console.log('');

    // 7. Resumo final
    console.log('7️⃣ Resumo do sistema:');
    console.log('✅ Conexão com Supabase: OK');
    console.log(`✅ Chamadas na tabela: ${callsData?.length || 0}`);
    console.log(`✅ RPC get_calls_v2: ${rpcError ? '❌ ERRO' : '✅ OK'}`);
    console.log(`✅ Tabela user_mapping: ${mappingError ? '❌ ERRO' : '✅ OK'}`);
    console.log(`✅ Tabela profiles: ${profilesError ? '❌ ERRO' : '✅ OK'}`);
    
    if (rpcError) {
      console.log('\n🔧 AÇÕES NECESSÁRIAS:');
      console.log('1. Execute o script fix-calls-function-agent-id.sql no Supabase SQL Editor');
      console.log('2. Verifique se as tabelas user_mapping e profiles existem');
      console.log('3. Teste novamente após as correções');
    } else {
      console.log('\n🎉 Sistema de chamadas funcionando corretamente!');
    }

  } catch (error) {
    console.error('❌ Erro geral no teste:', error.message);
    console.log('\n🔧 Verifique:');
    console.log('1. Variáveis de ambiente VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY');
    console.log('2. Conexão com internet');
    console.log('3. Permissões do projeto Supabase');
  }
}

// Executar o teste
testCallsSystem();
