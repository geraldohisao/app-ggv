// Build ID injectado pelo Vite (define). Em runtime, se não existir, gera fallback.
// eslint-disable-next-line no-undef
export const BUILD_ID: string = (typeof __APP_BUILD_ID__ !== 'undefined')
  // @ts-ignore - variável global injetada pelo build
  ? String(__APP_BUILD_ID__)
  : String(Date.now());


