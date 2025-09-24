#!/usr/bin/env node

/**
 * 🤖 WORKER DE ANÁLISE AUTOMÁTICA
 * Processa fila analysis_queue e gera análises via IA
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Configuração do Supabase
const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://mwlekwyxbfbxfxskywgx.supabase.co';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im13bGVrd3l4YmZieGZ4c2t5d2d4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjYwMDI5NjUsImV4cCI6MjA0MTU3ODk2NX0.TQIHAaK-2QlMJ8JVZwFUkOUNRqjEcD-VUGnxDLZzE7c';

const supabase = createClient(supabaseUrl, supabaseKey);

console.log('🚀 ANALYSIS WORKER - Iniciando...');
console.log('📡 Supabase URL:', supabaseUrl.substring(0, 30) + '...');

// Rate limiting - não sobrecarregar
const BATCH_SIZE = 5; // Processar 5 de cada vez
const DELAY_BETWEEN_BATCHES = 30000; // 30 segundos entre lotes
const RETRY_DELAY = 60000; // 1 minuto para retry

/**
 * Buscar próximo lote de análises pendentes
 */
async function getNextBatch() {
  try {
    const { data, error } = await supabase.rpc('get_next_analysis_batch', {
      p_limit: BATCH_SIZE
    });
    
    if (error) {
      console.error('❌ Erro ao buscar lote:', error);
      return [];
    }
    
    return data || [];
  } catch (err) {
    console.error('❌ Erro geral ao buscar lote:', err);
    return [];
  }
}

/**
 * Processar uma chamada individual
 */
async function processCall(item) {
  console.log(`🔄 Processando chamada ${item.call_id} - ${item.enterprise} (${item.sdr_name})`);
  
  try {
    // Marcar como processando
    await supabase
      .from('analysis_queue')
      .update({ status: 'processing' })
      .eq('call_id', item.call_id);
    
    // Simular análise IA (substitua por sua lógica real)
    const analysis = await simulateAnalysis(item);
    
    // Salvar análise no banco
    const { data: saved, error: saveError } = await supabase
      .from('call_analysis')
      .insert({
        call_id: item.call_id,
        scorecard_id: analysis.scorecard_id,
        scorecard_name: analysis.scorecard_name,
        final_grade: analysis.final_grade,
        criteria_analysis: analysis.criteria_analysis,
        strengths: analysis.strengths, // Já é array de strings
        improvements: analysis.improvements, // Já é array de strings
        created_at: new Date().toISOString()
      })
      .select()
      .single();
    
    if (saveError) {
      throw saveError;
    }
    
    // Marcar como concluído na fila
    await supabase
      .from('analysis_queue')
      .update({ status: 'completed' })
      .eq('call_id', item.call_id);
    
    console.log(`✅ Análise concluída: ${item.call_id} - Nota: ${analysis.final_grade}`);
    return true;
    
  } catch (error) {
    console.error(`❌ Erro ao processar ${item.call_id}:`, error);
    
    // Marcar como falha
    await supabase
      .from('analysis_queue')
      .update({ status: 'failed' })
      .eq('call_id', item.call_id);
    
    return false;
  }
}

/**
 * Simular análise IA (substitua pela sua lógica real)
 */
async function simulateAnalysis(item) {
  // Aguardar um pouco para simular processamento
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  // Gerar nota baseada na duração e qualidade da transcrição
  let score = 5; // Base
  
  if (item.duration > 120) score += 1; // +1 se > 2 min
  if (item.duration > 300) score += 1; // +1 se > 5 min
  if (item.transcription && item.transcription.length > 500) score += 1; // +1 se transcrição boa
  if (item.transcription && item.transcription.includes('obrigad')) score += 0.5; // +0.5 se educado
  if (item.transcription && item.transcription.includes('interessad')) score += 1; // +1 se interesse
  
  // Adicionar aleatoriedade
  score += (Math.random() - 0.5) * 2; // ±1 ponto aleatório
  score = Math.max(1, Math.min(10, score)); // Limitar 1-10
  
  return {
    scorecard_id: 'bd789f0e-8b2a-4c8c-b955-5b5b3616f264', // UUID fixo do scorecard
    scorecard_name: 'Scorecard Padrão',
    final_grade: Math.round(score * 10) / 10, // 1 casa decimal
    criteria_analysis: [
      { criterion: 'Abertura', score: score > 7 ? 8 : 6 },
      { criterion: 'Descoberta', score: score > 6 ? 7 : 5 },
      { criterion: 'Fechamento', score: Math.round(score) }
    ],
    strengths: score > 7 ? ['Boa comunicação', 'Interesse demonstrado'] : ['Educado'],
    improvements: score < 6 ? ['Melhorar descoberta', 'Trabalhar objeções'] : ['Aperfeiçoar fechamento']
  };
}

/**
 * Loop principal do worker
 */
async function mainLoop() {
  console.log('🔄 Iniciando ciclo de processamento...');
  
  try {
    const batch = await getNextBatch();
    
    if (batch.length === 0) {
      console.log('📭 Nenhuma análise pendente. Aguardando...');
      return;
    }
    
    console.log(`📊 Processando lote de ${batch.length} análises...`);
    
    // Processar em paralelo (limitado)
    const promises = batch.map(item => processCall(item));
    const results = await Promise.allSettled(promises);
    
    const success = results.filter(r => r.status === 'fulfilled' && r.value === true).length;
    const failed = results.length - success;
    
    console.log(`✅ Lote concluído: ${success} sucessos, ${failed} falhas`);
    
  } catch (error) {
    console.error('❌ Erro no ciclo principal:', error);
  }
}

/**
 * Iniciar worker
 */
async function startWorker() {
  console.log('🤖 ANALYSIS WORKER - Versão 1.0');
  console.log('⚡ Configurações:');
  console.log(`   - Lote: ${BATCH_SIZE} análises`);
  console.log(`   - Intervalo: ${DELAY_BETWEEN_BATCHES/1000}s`);
  console.log(`   - Retry: ${RETRY_DELAY/1000}s`);
  
  // Loop infinito
  while (true) {
    await mainLoop();
    await new Promise(resolve => setTimeout(resolve, DELAY_BETWEEN_BATCHES));
  }
}

// Tratamento de sinais para shutdown graceful
process.on('SIGINT', () => {
  console.log('⚠️ Recebido SIGINT, parando worker...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('⚠️ Recebido SIGTERM, parando worker...');
  process.exit(0);
});

// Iniciar
startWorker().catch(error => {
  console.error('💥 Worker falhou:', error);
  process.exit(1);
});