import { io, type Socket } from 'socket.io-client'

let socket: Socket | null = null

export async function getGateway(): Promise<Socket> {
  if (socket) return socket
  const url = await window.api.gateway.getUrl()
  socket = io(url, { transports: ['websocket'] })
  return socket
}
