// Script para reprocessar ligações com notas suspeitas
// Execute: node reprocess-calls.js

const { createClient } = require('@supabase/supabase-js');

// Configuração do Supabase (substitua pelos seus valores)
const supabaseUrl = 'SUA_SUPABASE_URL';
const supabaseKey = 'SUA_SUPABASE_SERVICE_ROLE_KEY';
const supabase = createClient(supabaseUrl, supabaseKey);

async function reprocessCalls() {
  console.log('🔄 Iniciando reprocessamento de ligações com notas suspeitas...\n');

  try {
    // 1. Buscar ligações marcadas para reprocessamento
    const { data: callsToReprocess, error: fetchError } = await supabase
      .from('scorecard_analyses')
      .select(`
        id,
        call_id,
        user_id,
        final_grade,
        confidence,
        general_feedback,
        created_at
      `)
      .is('final_grade', null)
      .like('general_feedback', '%Marcado para reprocessamento%')
      .order('created_at', { ascending: false });

    if (fetchError) {
      console.error('❌ Erro ao buscar ligações:', fetchError);
      return;
    }

    console.log(`📊 Encontradas ${callsToReprocess.length} ligações para reprocessar\n`);

    if (callsToReprocess.length === 0) {
      console.log('✅ Nenhuma ligação precisa ser reprocessada!');
      return;
    }

    // 2. Reprocessar cada ligação
    let successCount = 0;
    let errorCount = 0;

    for (const call of callsToReprocess) {
      try {
        console.log(`🔄 Reprocessando ligação ${call.call_id}...`);

        // Simular chamada para reprocessar (substitua pela sua lógica)
        const reprocessResult = await reprocessCall(call.call_id);
        
        if (reprocessResult.success) {
          console.log(`✅ Ligação ${call.call_id} reprocessada com sucesso`);
          successCount++;
        } else {
          console.log(`❌ Erro ao reprocessar ligação ${call.call_id}: ${reprocessResult.error}`);
          errorCount++;
        }

        // Aguardar um pouco entre as chamadas para não sobrecarregar
        await new Promise(resolve => setTimeout(resolve, 1000));

      } catch (error) {
        console.error(`❌ Erro ao reprocessar ligação ${call.call_id}:`, error.message);
        errorCount++;
      }
    }

    // 3. Resumo final
    console.log('\n📊 Resumo do reprocessamento:');
    console.log(`✅ Sucessos: ${successCount}`);
    console.log(`❌ Erros: ${errorCount}`);
    console.log(`📊 Total: ${callsToReprocess.length}`);

  } catch (error) {
    console.error('❌ Erro geral:', error);
  }
}

// Função para reprocessar uma ligação específica
async function reprocessCall(callId) {
  try {
    // Aqui você implementaria a lógica de reprocessamento
    // Por exemplo, chamar a API de análise de scorecard
    
    // Simulação de reprocessamento
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    return { success: true, callId };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// Executar o script
reprocessCalls().catch(console.error);
