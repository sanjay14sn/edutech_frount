/**
 * Browser-native Gemini Live Bidi streaming over WebSocket.
 * Handles microphone capture (PCM downsampled to 16kHz), webcam frame capture,
 * and audio output playback (24kHz PCM from Gemini).
 */

export type TranscriptTurn = { role: "interviewer" | "candidate"; text: string }

type Handlers = {
  onReady: () => void
  onAiSpeaking: () => void
  onListening: () => void
  onTranscript: (turns: TranscriptTurn[]) => void
  onError: (message: string) => void
}

const wsUrl = (token: string) =>
  `wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContentConstrained?access_token=${encodeURIComponent(
    token
  )}`

const mergeText = (current: string, next: string) => {
  const incoming = next.trim()
  if (!incoming) return current
  if (!current) return incoming
  if (incoming.startsWith(current)) return incoming
  if (current.endsWith(incoming)) return current
  return `${current} ${incoming}`.replace(/\s+/g, " ").trim()
}

const toBase64 = (bytes: Uint8Array) => {
  let binary = ""
  const chunk = 0x8000
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk))
  }
  return btoa(binary)
}

const fromBase64 = (value: string) => {
  const binary = atob(value)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i)
  return bytes
}

const downsample = (input: Float32Array, inputRate: number, outputRate: number) => {
  if (inputRate === outputRate) return input
  const ratio = inputRate / outputRate
  const length = Math.floor(input.length / ratio)
  const output = new Float32Array(length)
  for (let i = 0; i < length; i += 1) output[i] = input[Math.floor(i * ratio)]
  return output
}

const floatToPcm = (input: Float32Array) => {
  const pcm = new Int16Array(input.length)
  for (let i = 0; i < input.length; i += 1) {
    const sample = Math.max(-1, Math.min(1, input[i]))
    pcm[i] = sample < 0 ? sample * 0x8000 : sample * 0x7fff
  }
  return new Uint8Array(pcm.buffer)
}

export type LiveInterview = {
  model: string
  sendText: (text: string) => boolean
  stop: () => TranscriptTurn[]
}

export const connectLiveInterview = async ({
  token,
  models,
  instructions,
  stream,
  refreshToken,
  video,
  handlers,
}: {
  token: string
  models: string[]
  instructions: string
  stream: MediaStream
  refreshToken: () => Promise<string>
  video: HTMLVideoElement | null
  handlers: Handlers
}): Promise<LiveInterview> => {
  const turns: TranscriptTurn[] = []
  let interviewer = ""
  let candidate = ""
  let closed = false
  let socket: WebSocket | null = null
  let captureContext: AudioContext | null = null
  let playContext: AudioContext | null = null
  let processor: ScriptProcessorNode | null = null
  let frameTimer: number | null = null
  let nextPlay = 0
  const playing: AudioBufferSourceNode[] = []
  const activeModel = models[0] || "gemini-2.0-flash-exp"
  let currentToken = token
  let ready = false

  const publish = () => {
    const snapshot = [...turns]
    if (interviewer) snapshot.push({ role: "interviewer", text: interviewer })
    if (candidate) snapshot.push({ role: "candidate", text: candidate })
    handlers.onTranscript(snapshot.filter((turn) => turn.text.trim()))
  }

  const flush = () => {
    if (interviewer.trim()) turns.push({ role: "interviewer", text: interviewer.trim() })
    if (candidate.trim()) turns.push({ role: "candidate", text: candidate.trim() })
    interviewer = ""
    candidate = ""
    publish()
  }

  const stopPlayback = () => {
    playing.forEach((source) => {
      try {
        source.stop()
      } catch {
        /* already stopped */
      }
    })
    playing.length = 0
    nextPlay = 0
  }

  const playPcm = async (base64: string) => {
    if (typeof window === "undefined") return
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext
    if (!playContext) playContext = new AudioCtx({ sampleRate: 24000 })
    if (playContext.state === "suspended") await playContext.resume()
    const bytes = fromBase64(base64)
    const pcm = new Int16Array(bytes.buffer, bytes.byteOffset, Math.floor(bytes.byteLength / 2))
    const floats = new Float32Array(pcm.length)
    for (let i = 0; i < pcm.length; i += 1) floats[i] = pcm[i] / 32768
    const outputRate = playContext.sampleRate
    let channel = floats
    if (outputRate !== 24000) {
      const ratio = outputRate / 24000
      channel = new Float32Array(Math.max(1, Math.floor(floats.length * ratio)))
      for (let i = 0; i < channel.length; i += 1) {
        const position = i / ratio
        const index = Math.min(Math.floor(position), floats.length - 1)
        const next = Math.min(index + 1, floats.length - 1)
        const mix = position - index
        channel[i] = floats[index] * (1 - mix) + floats[next] * mix
      }
    }
    const buffer = playContext.createBuffer(1, channel.length, outputRate)
    buffer.copyToChannel(channel, 0)
    const source = playContext.createBufferSource()
    source.buffer = buffer
    source.connect(playContext.destination)
    const now = playContext.currentTime
    if (nextPlay < now) nextPlay = now
    source.start(nextPlay)
    nextPlay += buffer.duration
    playing.push(source)
    source.onended = () => {
      const index = playing.indexOf(source)
      if (index >= 0) playing.splice(index, 1)
    }
    handlers.onAiSpeaking()
  }

  const sendVideoFrame = () => {
    if (!video || !socket || socket.readyState !== WebSocket.OPEN || video.readyState < 2) return
    const canvas = document.createElement("canvas")
    canvas.width = 320
    canvas.height = 240
    const context = canvas.getContext("2d")
    if (!context) return
    context.drawImage(video, 0, 0, canvas.width, canvas.height)
    const data = canvas.toDataURL("image/jpeg", 0.5).split(",")[1]
    if (!data) return
    socket.send(
      JSON.stringify({
        realtimeInput: { video: { data, mimeType: "image/jpeg" } },
      })
    )
  }

  const startCapture = () => {
    if (typeof window === "undefined") return
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext
    const audioContext = new AudioCtx()
    captureContext = audioContext
    const source = audioContext.createMediaStreamSource(stream)
    const node = audioContext.createScriptProcessor(4096, 1, 1)
    processor = node
    const silent = audioContext.createGain()
    silent.gain.value = 0
    node.onaudioprocess = (event) => {
      if (!socket || socket.readyState !== WebSocket.OPEN) return
      const channel = event.inputBuffer.getChannelData(0)
      const pcm = floatToPcm(downsample(channel, audioContext.sampleRate, 16000))
      socket.send(
        JSON.stringify({
          realtimeInput: {
            audio: { data: toBase64(pcm), mimeType: "audio/pcm;rate=16000" },
          },
        })
      )
    }
    source.connect(node)
    node.connect(silent)
    silent.connect(audioContext.destination)
  }

  const handleMessage = async (raw: string) => {
    try {
      const message = JSON.parse(raw)
      if (message.error?.message) {
        if (!ready) throw new Error(message.error.message)
        handlers.onError(message.error.message)
        return
      }
      if (message.setupComplete) {
        ready = true
        handlers.onReady()
        startCapture()
        if (video) {
          frameTimer = window.setInterval(sendVideoFrame, 1000)
        }
        return
      }
      if (message.serverContent?.interrupted) {
        stopPlayback()
        flush()
        handlers.onListening()
        return
      }
      const parts = message.serverContent?.modelTurn?.parts || []
      for (const part of parts) {
        if (part.text) {
          interviewer = mergeText(interviewer, part.text)
          publish()
        }
        if (part.inlineData?.data) {
          await playPcm(part.inlineData.data)
        }
      }
      if (message.serverContent?.turnComplete) {
        flush()
        handlers.onListening()
      }
    } catch (err: any) {
      handlers.onError(err.message || "Error processing audio message")
    }
  }

  const connect = (tokenToUse: string): Promise<void> =>
    new Promise((resolve, reject) => {
      const ws = new WebSocket(wsUrl(tokenToUse))
      socket = ws

      ws.onopen = () => {
        ws.send(
          JSON.stringify({
            setup: {
              model: `models/${activeModel}`,
              generationConfig: {
                responseModalities: ["AUDIO"],
                speechConfig: {
                  voiceConfig: {
                    prebuiltVoiceConfig: { voiceName: "Aoede" },
                  },
                },
              },
              systemInstruction: {
                parts: [{ text: instructions }],
              },
            },
          })
        )
        resolve()
      }

      ws.onmessage = (event) => {
        if (typeof event.data === "string") handleMessage(event.data)
      }

      ws.onerror = () => {
        if (!ready) reject(new Error("Could not connect to Gemini Live voice service"))
        else handlers.onError("Lost connection to Gemini Live session")
      }

      ws.onclose = async (event) => {
        if (closed) return
        if (event.code === 401 || event.code === 403 || event.code === 1006) {
          try {
            currentToken = await refreshToken()
            await connect(currentToken)
            return
          } catch {
            // refresh failed
          }
        }
        handlers.onError("Interviewer disconnected")
      }
    })

  await connect(currentToken)

  return {
    model: activeModel,
    sendText: (text: string) => {
      if (!socket || socket.readyState !== WebSocket.OPEN) return false
      stopPlayback()
      flush()
      candidate = text.trim()
      publish()
      flush()
      socket.send(
        JSON.stringify({
          clientContent: {
            turns: [{ role: "user", parts: [{ text }] }],
            turnComplete: true,
          },
        })
      )
      handlers.onListening()
      return true
    },
    stop: () => {
      closed = true
      if (frameTimer) clearInterval(frameTimer)
      stopPlayback()
      try {
        processor?.disconnect()
      } catch {}
      try {
        captureContext?.close()
      } catch {}
      try {
        playContext?.close()
      } catch {}
      try {
        socket?.close()
      } catch {}
      flush()
      return [...turns]
    },
  }
}
