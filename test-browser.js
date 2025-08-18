// Script para testar a aplicação no browser via Node.js
const puppeteer = require('puppeteer');

(async () => {
  let browser;
  try {
    console.log('🔍 Iniciando teste do browser...');
    
    browser = await puppeteer.launch({ 
      headless: false, 
      devtools: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    const page = await browser.newPage();
    
    // Capturar erros do console
    page.on('console', msg => {
      const type = msg.type();
      if (type === 'error' || type === 'warning') {
        console.log(`🚨 CONSOLE ${type.toUpperCase()}: ${msg.text()}`);
      }
    });
    
    // Capturar erros de página
    page.on('pageerror', error => {
      console.log(`❌ PAGE ERROR: ${error.message}`);
    });
    
    // Capturar falhas de requisição
    page.on('requestfailed', request => {
      console.log(`🔴 REQUEST FAILED: ${request.url()} - ${request.failure().errorText}`);
    });
    
    console.log('📱 Navegando para http://localhost:5173...');
    await page.goto('http://localhost:5173', { waitUntil: 'networkidle0', timeout: 30000 });
    
    console.log('✅ Página carregada com sucesso!');
    
    // Aguardar um pouco para ver se há erros
    await page.waitForTimeout(3000);
    
    // Verificar se há elementos na página
    const title = await page.title();
    console.log(`📋 Título da página: ${title}`);
    
    const bodyText = await page.evaluate(() => document.body.innerText);
    if (bodyText.includes('Error') || bodyText.includes('Erro')) {
      console.log('⚠️ Possível erro detectado na página:');
      console.log(bodyText.substring(0, 200) + '...');
    }
    
    // Tentar clicar no botão de debug
    try {
      await page.waitForSelector('button[title*="debug"]', { timeout: 5000 });
      console.log('🐛 Botão de debug encontrado!');
    } catch (e) {
      console.log('⚠️ Botão de debug não encontrado');
    }
    
    console.log('✅ Teste concluído. Deixando browser aberto para inspeção...');
    // Não fechar o browser para permitir inspeção manual
    
  } catch (error) {
    console.error('❌ Erro durante o teste:', error.message);
    if (browser) {
      await browser.close();
    }
  }
})();
