import { createServer, type Server as HttpServer } from 'node:http'
import { Server as IOServer } from 'socket.io'

export interface GatewayHandle {
  io: IOServer
  port: number
  close: () => Promise<void>
}

export async function startGateway(): Promise<GatewayHandle> {
  const raw = import.meta.env.MAIN_VITE_GATEWAY_PORT
  const parsed = raw !== undefined && raw !== '' ? Number(raw) : 47800
  const port = Number.isFinite(parsed) && parsed > 0 ? parsed : 47800

  const http: HttpServer = createServer()
  const io = new IOServer(http, {
    cors: { origin: '*' },
    serveClient: false
  })

  io.on('connection', (socket) => {
    socket.onAny((event, ...args) => socket.broadcast.emit(event, ...args))
  })

  await new Promise<void>((resolve, reject) => {
    http.listen(port, '0.0.0.0', () => resolve())
    http.on('error', reject)
  })

  return {
    io,
    port,
    close: () =>
      new Promise<void>((resolve) => {
        io.close(() => {
          http.close(() => resolve())
        })
      })
  }
}
