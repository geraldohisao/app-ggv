// Build ID injectado pelo Vite (define). Em runtime, se não existir, gera fallback.
declare const __APP_BUILD_ID__: string | undefined;

export const BUILD_ID: string = (typeof __APP_BUILD_ID__ !== 'undefined')
  ? String(__APP_BUILD_ID__)
  : String(Date.now());


