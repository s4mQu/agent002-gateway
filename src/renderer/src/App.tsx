import { useState } from 'react'
import Versions from './components/Versions'
import electronLogo from './assets/electron.svg'

function App(): React.JSX.Element {
  const ipcHandle = (): void => window.electron.ipcRenderer.send('ping')
  const [uploadLog, setUploadLog] = useState<string>('')

  const onPickAudio = async (e: React.ChangeEvent<HTMLInputElement>): Promise<void> => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    const data = await file.arrayBuffer()
    try {
      const result = await window.api.uploadAudio({
        data,
        mimeType: file.type || 'application/octet-stream',
        filename: file.name
      })
      setUploadLog(JSON.stringify(result, null, 2))
    } catch (err) {
      setUploadLog(err instanceof Error ? err.message : String(err))
    }
  }

  return (
    <>
      <img alt="logo" className="logo" src={electronLogo} />
      <div className="creator">Powered by electron-vite</div>
      <div className="text">
        Build an Electron app with <span className="react">React</span>
        &nbsp;and <span className="ts">TypeScript</span>
      </div>
      <p className="tip">
        Please try pressing <code>F12</code> to open the devTool
      </p>
      <div className="actions">
        <div className="action">
          <a href="https://electron-vite.org/" target="_blank" rel="noreferrer">
            Documentation
          </a>
        </div>
        <div className="action">
          <a target="_blank" rel="noreferrer" onClick={ipcHandle}>
            Send IPC
          </a>
        </div>
        <div className="action">
          <label>
            Upload audio
            <input type="file" accept="audio/*" hidden onChange={onPickAudio} />
          </label>
        </div>
      </div>
      {uploadLog ? (
        <pre style={{ textAlign: 'left', maxHeight: 200, overflow: 'auto', fontSize: 12 }}>{uploadLog}</pre>
      ) : null}
      <Versions></Versions>
    </>
  )
}

export default App
