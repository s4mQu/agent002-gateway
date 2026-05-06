import { getGateway } from './gateway'

const audioCtx = new AudioContext()
let nextStartTime = 0

const base64ToArrayBuffer = (b64: string): ArrayBuffer => {
  const binary = atob(b64)
  const buf = new ArrayBuffer(binary.length)
  const bufView = new Uint8Array(buf)
  for (let i = 0; i < binary.length; i++) {
    bufView[i] = binary.charCodeAt(i)
  }
  return buf
}

let started = false

export async function initTtsListener(): Promise<void> {
  if (started) return
  started = true

  const socket = await getGateway()

  socket.on('connect', () => console.log('[renderer] connected to gateway, id:', socket.id))
  socket.on('disconnect', (reason) => console.log('[renderer] disconnected from gateway:', reason))
  socket.onAny((event: string, ...args: unknown[]) => {
    console.log('[renderer] socket event received:', event, args.length ? args[0] : '')
  })

  socket.on('synthesis_started', (data: { chunks: number; sample_rate: number; quality_preset: string }) => {
    console.log('[renderer] synthesis_started —', data.chunks, 'chunks, preset:', data.quality_preset)
    nextStartTime = 0
  })

  socket.on('chunk_started', (data: { index: number; text: string }) => {
    console.log('[renderer] chunk_started', data.index, ':', data.text)
  })

  socket.on('audio_chunk', async (data: { index: number; audio: string; sample_rate: number }) => {
    console.log('[renderer] audio_chunk arrived, audio type:', typeof data.audio, 'length:', typeof data.audio === 'string' ? data.audio.length : 'N/A')
    const wavBytes = base64ToArrayBuffer(data.audio)
    if (audioCtx.state === 'suspended') await audioCtx.resume()
    const audioBuffer = await audioCtx.decodeAudioData(wavBytes)
    console.log('[renderer] decoded chunk', data.index, audioBuffer.duration.toFixed(2), 's')
    const source = audioCtx.createBufferSource()
    source.buffer = audioBuffer
    source.connect(audioCtx.destination)
    nextStartTime = Math.max(nextStartTime, audioCtx.currentTime)
    source.start(nextStartTime)
    nextStartTime += audioBuffer.duration
  })

  socket.on('chunk_done', (data: { index: number }) => {
    console.log('[renderer] chunk_done', data.index)
  })

  socket.on('synthesis_done', (data: { chunks: number }) => {
    console.log('[renderer] synthesis_done —', data.chunks, 'chunks')
    nextStartTime = 0
  })

  socket.on('synthesis_error', (data: { detail: string }) => {
    console.error('[renderer] synthesis_error:', data.detail)
  })

  console.log('[renderer] tts listener initialized')
}
