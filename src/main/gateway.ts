import { createServer, type Server as HttpServer } from 'node:http'
import { Server as IOServer } from 'socket.io'
import { io as createClient, type Socket } from 'socket.io-client'

export interface GatewayHandle {
  io: IOServer
  ttsIo: Socket
  port: number
  ttsServer: string
  close: () => Promise<void>
}

export async function startGateway(): Promise<GatewayHandle> {
  const raw = import.meta.env.MAIN_VITE_GATEWAY_PORT
  const parsed = raw !== undefined && raw !== '' ? Number(raw) : 47800
  const port = Number.isFinite(parsed) && parsed > 0 ? parsed : 47800
  const ttsServerUrl = process.env['TTS_SERVER_URL'] || 'http://127.0.0.1:8031'

  const http: HttpServer = createServer()
  const io = new IOServer(http, {
    cors: { origin: '*' },
    serveClient: false
  })

  const ttsIo: Socket = createClient(ttsServerUrl, { transports: ['websocket', 'polling'] })

  ttsIo.on('connect', () => {
    console.log('[tts-bridge] connected to TTS server')
    console.log('[tts-bridge] connected namespaces:', [...ttsIo.rooms])
  })
  ttsIo.on('disconnect', (reason) => console.log('[tts-bridge] disconnected:', reason))
  ttsIo.on('connect_error', (err) => console.error('[tts-bridge] error:', err.message))
  ttsIo.on('reconnect', (attempt) => console.log('[tts-bridge] reconnected after', attempt, 'attempts'))
  ttsIo.on('reconnect_attempt', (attempt) => console.log('[tts-bridge] reconnecting (attempt', attempt, ')'))
  ttsIo.on('reconnect_error', (err) => console.log('[tts-bridge] reconnect error:', err.message))
  ttsIo.on('reconnect_failed', () => console.log('[tts-bridge] reconnect failed'))

  ttsIo.onAny((event, ...args) => {
    const clientCount = io.engine.clientsCount
    if (event === 'audio_chunk') {
      const audioLen: number = (args[0] as Record<string, string> | undefined)?.audio?.length ?? 0
      console.log(`[tts-bridge] audio_chunk index=${(args[0] as Record<string, number> | undefined)?.index} audio_base64_len=${audioLen} -> relaying to ${clientCount} renderer client(s)`)
    } else {
      console.log(`[tts-bridge] event="${event}" payload=${JSON.stringify(args[0] ?? null)} -> relaying to ${clientCount} renderer client(s)`)
    }
    if (clientCount === 0) {
      console.warn('[tts-bridge] WARNING: no renderer clients connected, event will be dropped')
    }
    io.emit(event, ...args)
  })

  // Gateway client broadcasting
  io.on('connection', (socket) => {
    console.log('[gateway] new client connected')
    socket.on('gateway:test', (payload: unknown) => {
      console.log('[gateway:test]', payload)
    })
    socket.onAny((event: string, ...args: unknown[]) => {
      console.log('[gateway] re-broadcasting event:', event)
      socket.broadcast.emit(event, ...args)
    })
  })

  await new Promise<void>((resolve, reject) => {
    http.listen(port, '0.0.0.0', () => resolve())
    http.on('error', reject)
  })

  return {
    io,
    ttsIo,
    port,
    ttsServer: ttsServerUrl,
    close: () =>
      new Promise<void>((resolve) => {
        io.close(() => {
          ttsIo.disconnect()
          http.close(() => resolve())
        })
      })
  }
}
