#!/usr/bin/env node

/**
 * 🤖 WORKER SIMPLES PARA ANÁLISE AUTOMÁTICA
 * Chama a função SQL process_analysis_queue() a cada 30 segundos
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Configuração do Supabase
const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://mwlekwyxbfbxfxskywgx.supabase.co';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im13bGVrd3l4YmZieGZ4c2t5d2d4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjYwMDI5NjUsImV4cCI6MjA0MTU3ODk2NX0.TQIHAaK-2QlMJ8JVZwFUkOUNRqjEcD-VUGnxDLZzE7c';

const supabase = createClient(supabaseUrl, supabaseKey);

console.log('🚀 WORKER SIMPLES - Iniciando...');
console.log('📡 Supabase URL:', supabaseUrl.substring(0, 30) + '...');

/**
 * Processar fila usando função SQL
 */
async function processQueue() {
  try {
    console.log('🔄 Processando fila...');
    
    const { data, error } = await supabase.rpc('process_analysis_queue');
    
    if (error) {
      console.error('❌ Erro ao processar fila:', error);
      return;
    }
    
    const processed = data || 0;
    
    if (processed > 0) {
      console.log(`✅ Processadas ${processed} análises!`);
    } else {
      console.log('📭 Nenhuma análise pendente');
    }
    
  } catch (err) {
    console.error('❌ Erro geral:', err);
  }
}

/**
 * Loop principal
 */
async function mainLoop() {
  console.log('🔄 Iniciando ciclo...');
  await processQueue();
  
  // Aguardar 30 segundos
  setTimeout(mainLoop, 30000);
}

// Tratamento de sinais
process.on('SIGINT', () => {
  console.log('⚠️ Parando worker...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('⚠️ Parando worker...');
  process.exit(0);
});

// Iniciar
console.log('🤖 WORKER SIMPLES - Versão 1.0');
console.log('⚡ Intervalo: 30 segundos');
console.log('🎯 Função: process_analysis_queue()');

mainLoop();

