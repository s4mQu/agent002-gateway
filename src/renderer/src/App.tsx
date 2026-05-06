import { useEffect } from 'react'
import { getGateway } from './lib/gateway'
import { initTtsListener } from './lib/tts'
import Versions from './components/Versions'
import { Button } from '@/components/ui/button'

function App(): React.JSX.Element {
  const ipcHandle = (): void => window.electron.ipcRenderer.send("ping")

  const socketTestHandle = async (): Promise<void> => {
    const socket = await getGateway()
    socket.emit("gateway:test", { message: "Socket.IO test from renderer" })
  }

  useEffect(() => {
    void initTtsListener()
  }, [])

  return (
    <>
      <div className="creator">Powered by electron-vite</div>
      <div className="font-bold text-2xl underline">
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
          <Button onClick={ipcHandle}>Send IPC</Button>
        </div>
        <div className="action">
          <Button onClick={() => void socketTestHandle()}>Emit Socket.IO test</Button>
        </div>
      </div>
      <Versions></Versions>
    </>
  )
}

export default App
