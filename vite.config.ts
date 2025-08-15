import path from 'path';
import { defineConfig, loadEnv, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';

// Build id único por build (padrão: timestamp). Pode ser injetado via env.
const BUILD_ID = process.env.BUILD_ID || String(Date.now());

function cspProdOnly(): Plugin {
  return {
    name: 'html-csp-prod-only',
    transformIndexHtml(html) {
      if (process.env.NODE_ENV !== 'production') return html;
      // Relaxado para permitir scripts inline (window.APP_CONFIG) e evitar bloqueio de libs que usam eval em prod preview
      // Mantém restrições principais e adiciona domínios do Supabase explicitamente
      const meta = `<meta http-equiv="Content-Security-Policy" content="default-src 'self'; img-src 'self' https: data: blob:; style-src 'self' 'unsafe-inline' https:; font-src 'self' https: data:; connect-src 'self' https: wss: https://*.supabase.co https://*.supabase.in; script-src 'self' 'unsafe-inline' 'unsafe-eval' 'strict-dynamic'; base-uri 'self'; object-src 'none';">`;
      return html.replace('</head>', `${meta}\n</head>`);
    }
  };
}

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      plugins: [react(), cspProdOnly()],
      server: {
        headers: {
          // dev nunca deve cachear index.html
          'Cache-Control': 'no-store',
        },
        proxy: {
          // Proxy local para a API quando rodando tudo no localhost:5173
          '/api': {
            target: process.env.VITE_API_BASE_URL || 'http://localhost:8080',
            changeOrigin: true,
            secure: false,
          },
          // Mock server para N8N/Pipedrive quando o webhook não estiver ativo
          '/n8n-api': {
            target: 'http://localhost:5173', // Vai para nós mesmos
            changeOrigin: false,
            configure: (proxy, options) => {
              // Interceptar e responder com dados simulados
              proxy.on('proxyReq', (proxyReq, req, res) => {
                console.log('🔄 MOCK N8N - Interceptando requisição:', req.method, req.url);
                
                // Verificar se é para o endpoint do diagnóstico
                if (req.url?.includes('/n8n-api/diag-ggv-register')) {
                  const urlParams = new URL(req.url, 'http://localhost').searchParams;
                  const dealId = urlParams.get('deal_id') || '569934';
                  
                  console.log('🧪 MOCK N8N - Gerando dados simulados para deal_id:', dealId);
                  
                  // Dados simulados baseados no deal_id
                  const mockData = {
                    success: true,
                    deal_id: dealId,
                    companyName: `Empresa Simulada ${dealId}`,
                    company_name: `Empresa Simulada ${dealId}`,
                    org_name: `Empresa Simulada ${dealId}`,
                    email: `contato${dealId}@empresa-simulada.com`,
                    contact_email: `contato${dealId}@empresa-simulada.com`,
                    person_email: `contato${dealId}@empresa-simulada.com`,
                    activityBranch: 'Tecnologia',
                    activity_branch: 'Tecnologia',
                    ramo: 'Tecnologia',
                    activitySector: 'Software',
                    activity_sector: 'Software',
                    setor: 'Software',
                    monthlyBilling: 'R$ 50.000 - R$ 100.000',
                    monthly_billing: 'R$ 50.000 - R$ 100.000',
                    faturamento_mensal: 'R$ 50.000 - R$ 100.000',
                    salesTeamSize: '5-10',
                    sales_team_size: '5-10',
                    tamanho_equipe_vendas: '5-10',
                    salesChannels: ['Online', 'Presencial', 'Parceiros'],
                    sales_channels: ['Online', 'Presencial', 'Parceiros'],
                    canais_vendas: ['Online', 'Presencial', 'Parceiros'],
                    _mockData: true,
                    _timestamp: new Date().toISOString(),
                    _note: 'Dados simulados - configure o webhook N8N para dados reais'
                  };
                  
                  // Responder diretamente
                  res.writeHead(200, {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
                    'Access-Control-Allow-Headers': 'Content-Type',
                  });
                  res.end(JSON.stringify(mockData, null, 2));
                  
                  console.log('✅ MOCK N8N - Dados simulados enviados:', mockData);
                  return; // Não prosseguir com o proxy
                }
              });
            }
          },
        },
      },
      define: {
        'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        __APP_BUILD_ID__: JSON.stringify(BUILD_ID),
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      }
    };
});
