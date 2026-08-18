interface ImportMetaEnv {
  readonly VITE_API_BASE_URL?: string;
  readonly VITE_API_VIA_NGROK?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
