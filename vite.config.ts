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
      const meta = `<meta http-equiv="Content-Security-Policy" content="default-src 'self'; img-src 'self' https: data: blob:; style-src 'self' 'unsafe-inline' https:; font-src 'self' https: data:; connect-src 'self' https: wss: https://*.supabase.co https://*.supabase.in https://app.grupoggv.com https://api-test.ggvinteligencia.com.br https://automation-test.ggvinteligencia.com.br; script-src 'self' 'unsafe-inline' 'unsafe-eval' 'strict-dynamic'; base-uri 'self'; object-src 'none';">`;
      return html.replace('</head>', `${meta}\n</head>`);
    }
  };
}

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    
    // Determinar URL base da API baseado no ambiente
    const isProduction = mode === 'production';
    const apiBaseUrl = isProduction 
        ? 'https://app.grupoggv.com/api'
        : (process.env.VITE_API_BASE_URL || 'http://localhost:8080');
    
    return {
      plugins: [react(), cspProdOnly()],
      server: {
        headers: {
          'Cache-Control': 'no-store',
        },
        proxy: {
          '/api': {
            target: apiBaseUrl,
            changeOrigin: true,
            secure: isProduction,
          },
          '/automation': {
            target: 'http://localhost:3001',
            changeOrigin: true,
            secure: false,
          },
        },
      },
      define: {
        'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        __APP_BUILD_ID__: JSON.stringify(BUILD_ID),
        __APP_DOMAIN__: JSON.stringify(isProduction ? 'app.grupoggv.com' : 'localhost'),
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      }
    };
});
