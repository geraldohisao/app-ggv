#!/usr/bin/env node

// Script para verificar se o deploy da correção foi aplicado
const https = require('https');

const url = 'https://app.grupoggv.com/r/1758213843313-lwi2qc-638';

console.log('🔍 Verificando se deploy foi aplicado...');
console.log('URL:', url);

https.get(url, (res) => {
  let data = '';
  
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    // Verificar se contém a estrutura React da aplicação
    const hasReactApp = data.includes('id="root"');
    const hasMarkdownRenderer = data.includes('MarkdownRenderer');
    const hasWhitespacePre = data.includes('whitespace-pre-wrap');
    
    console.log('\n📊 Resultados da verificação:');
    console.log('✅ Página carregando:', hasReactApp ? 'SIM' : 'NÃO');
    console.log('🎨 Contém MarkdownRenderer:', hasMarkdownRenderer ? 'SIM' : 'NÃO');
    console.log('❌ Ainda usa whitespace-pre-wrap:', hasWhitespacePre ? 'SIM' : 'NÃO');
    
    // Verificar timestamp do build
    const buildMatch = data.match(/diagnostic improvements v(\d+)/);
    if (buildMatch) {
      console.log('🚀 Versão do build detectada:', buildMatch[1]);
    }
    
    console.log('\n📝 Status:');
    if (hasReactApp) {
      console.log('✅ Aplicação React carregando normalmente');
      console.log('⏳ Deploy pode estar em cache, aguarde alguns minutos');
      console.log('🔄 Tente recarregar a página (Ctrl+F5) para limpar cache do browser');
    } else {
      console.log('❌ Problema no carregamento da aplicação');
    }
  });
}).on('error', (err) => {
  console.error('❌ Erro ao acessar URL:', err.message);
});
