// Build ID injectado pelo Vite (define). Em runtime, se não existir, gera fallback.
declare const __APP_BUILD_ID__: string | undefined;

// Build ID único para esta versão - CRÍTICO PARA CACHE BUSTING
export const BUILD_ID: string = (typeof __APP_BUILD_ID__ !== 'undefined')
  ? String(__APP_BUILD_ID__)
  : 'build-' + Date.now();

// ID único para a correção do diagnóstico N8N
export const DIAGNOSTIC_FIX_VERSION = 'v2.0.0-n8n-text-fix-' + Date.now();


