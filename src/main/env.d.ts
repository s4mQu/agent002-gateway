/// <reference types="electron-vite/node" />

interface ImportMetaEnv {
  readonly MAIN_VITE_AUDIO_UPLOAD_URL: string
  readonly MAIN_VITE_GATEWAY_PORT?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
