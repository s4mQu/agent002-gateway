import { ElectronAPI } from '@electron-toolkit/preload'

declare global {
  interface Window {
    electron: ElectronAPI
    api: {
      uploadAudio: (payload: {
        data: ArrayBuffer
        mimeType: string
        filename?: string
      }) => Promise<{ ok: boolean; status: number; bodyPreview: string }>
      gateway: {
        getUrl: () => Promise<string>
      }
    }
  }
}

export {}
