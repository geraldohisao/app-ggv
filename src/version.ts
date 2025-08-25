// Build-time injected version (see vite.config.ts define)
declare const __APP_VERSION__: string | undefined;

// Use typeof guard to avoid ReferenceError when not defined at runtime
export const APP_VERSION: string = (typeof __APP_VERSION__ !== 'undefined' && __APP_VERSION__)
  ? String(__APP_VERSION__)
  : '1.0.0';


