/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_CALLS_UNDER_DEV?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}


