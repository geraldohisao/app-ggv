/**
 * Utilitário para testar se o webhook N8N está ativo e funcionando
 */

interface WebhookTestResult {
  isActive: boolean;
  status: number | null;
  message: string;
  endpoint: string;
  error?: any;
}

/**
 * Testa se o webhook N8N está respondendo
 */
export async function testN8nWebhook(dealId: string = '569934'): Promise<WebhookTestResult> {
  // Usar proxy local em desenvolvimento
  const isDevelopment = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

  const ENDPOINT = isDevelopment 
    ? 'http://localhost:8080/webhook-test/diag-ggv-register'
    : 'https://app.grupoggv.com/api/webhook/diag-ggv-register';
  
  const url = `${ENDPOINT}?deal_id=${encodeURIComponent(dealId)}`;
  
  console.log('🧪 TESTE N8N - Verificando webhook...');
  console.log('📍 TESTE N8N - URL:', url);
  
  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    });
    
    console.log('📊 TESTE N8N - Status:', response.status);
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ TESTE N8N - Webhook ativo e funcionando!');
      console.log('📦 TESTE N8N - Dados recebidos:', data);
      
      return {
        isActive: true,
        status: response.status,
        message: 'Webhook N8N está ativo e funcionando!',
        endpoint: url,
      };
    } else {
      const errorText = await response.text();
      console.error('❌ TESTE N8N - Webhook não está funcionando');
      console.error('📄 TESTE N8N - Resposta:', errorText);
      
      return {
        isActive: false,
        status: response.status,
        message: `Webhook retornou erro ${response.status}: ${response.statusText}`,
        endpoint: url,
        error: errorText,
      };
    }
  } catch (error: any) {
    console.error('❌ TESTE N8N - Erro na requisição:', error);
    
    return {
      isActive: false,
      status: null,
      message: `Erro na requisição: ${error.message}`,
      endpoint: url,
      error: error,
    };
  }
}

/**
 * Função global para testar via console
 */
if (typeof window !== 'undefined') {
  (window as any).testN8nWebhook = testN8nWebhook;
}

/**
 * Lista de verificações para diagnosticar problemas com o webhook
 */
export const webhookDiagnostics = {
  async runFullDiagnostic(dealId: string = '569934') {
    console.log('🔍 DIAGNÓSTICO COMPLETO DO WEBHOOK N8N');
    console.log('=====================================');
    
    // 1. Teste básico
    console.log('1️⃣ Testando conectividade básica...');
    const result = await testN8nWebhook(dealId);
    
    if (result.isActive) {
      console.log('✅ Webhook está funcionando perfeitamente!');
      return result;
    }
    
    // 2. Diagnósticos adicionais
    console.log('2️⃣ Executando diagnósticos...');
    
    if (result.status === 404) {
      console.log('❌ PROBLEMA: Webhook não encontrado (404)');
      console.log('💡 POSSÍVEIS SOLUÇÕES:');
      console.log('   • Verificar se o workflow N8N está ativo');
      console.log('   • Confirmar a URL do webhook no N8N');
      console.log('   • Verificar se o N8N está rodando');
    } else if (result.status === 500) {
      console.log('❌ PROBLEMA: Erro interno do servidor (500)');
      console.log('💡 POSSÍVEIS SOLUÇÕES:');
      console.log('   • Verificar logs do N8N');
      console.log('   • Verificar configuração do workflow');
      console.log('   • Verificar conexão com Pipedrive');
    } else if (!result.status) {
      console.log('❌ PROBLEMA: Erro de rede/CORS');
      console.log('💡 POSSÍVEIS SOLUÇÕES:');
      console.log('   • Verificar se o N8N está acessível');
      console.log('   • Verificar configurações de CORS');
      console.log('   • Verificar proxy do Vite');
    }
    
    console.log('=====================================');
    return result;
  }
};

// Função global para diagnóstico completo
if (typeof window !== 'undefined') {
  (window as any).diagnoseN8nWebhook = webhookDiagnostics.runFullDiagnostic;
}
