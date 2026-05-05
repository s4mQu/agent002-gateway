/// <reference types="electron-vite/node" />

interface ImportMetaEnv {
  readonly MAIN_VITE_AUDIO_UPLOAD_URL: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
