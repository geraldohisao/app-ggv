// Build-time injected version (see vite.config.ts define)
declare const __APP_VERSION__: string | undefined;

export const APP_VERSION: string = String(__APP_VERSION__ || '1.0.0');


