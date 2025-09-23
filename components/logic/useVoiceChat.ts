"use client"

import { useCallback, useRef, useState, useEffect } from "react"
import { TaskType } from "@heygen/streaming-avatar"
import axios from "axios"
import { useStreamingAvatarContext } from "./context"
import { useAvatarStore } from "../../store/avatarStore"

const TAG = "[useVoiceChat]"
const isBCGSession = (s: any): s is import("../../store/avatarStore").BCGSession =>
  s && "conversationId" in s && "selectedProduct" in s

// ---------- SINGLETON (por pestaña) ----------
let activeOwnerId: string | null = null
let globalStop: ((reason?: string) => void) | null = null

function makeId() {
  return Math.random().toString(36).slice(2)
}

function pickMimeAndEncoding() {
  const prefs = [
    { mime: "audio/webm;codecs=opus", encoding: "WEBM_OPUS" as const }, // Chrome
    { mime: "audio/ogg;codecs=opus", encoding: "OGG_OPUS" as const },   // Firefox
  ]
  for (const p of prefs) {
    if (typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported(p.mime)) return p
  }
  throw new Error("Este navegador no soporta MediaRecorder con Opus (WebM/OGG)")
}

// Avatares que usan SDK (HeyGen) – sin Google STT
const KNOWLEDGE_AVATARS = new Set(["volcano", "gbm-onboarding", "microsoft-services"])

export const useVoiceChat = (avatarType = "gestor-cobranza") => {
  const {
    avatarRef,
    isMuted, setIsMuted,
    isVoiceChatActive, setIsVoiceChatActive,
    isVoiceChatLoading, setIsVoiceChatLoading,
    addUserMessage,
  } = useStreamingAvatarContext()

  const { getSession, currentAvatarType } = useAvatarStore()
  const instanceIdRef = useRef<string>(makeId())
  const isOwner = () => activeOwnerId === instanceIdRef.current

  const mode: "SDK" | "GOOGLE" = KNOWLEDGE_AVATARS.has(avatarType) ? "SDK" : "GOOGLE"
  useEffect(() => {
    console.log(`${TAG} mount: avatarType=${avatarType} (mode=${mode}), store.current=${currentAvatarType}`)
    return () => console.log(`${TAG} unmount: avatarType=${avatarType} (mode=${mode})`)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [avatarType])

  // ---------- WS / Recorder / AudioGraph (solo Google STT) ----------
  const wsRef = useRef<WebSocket | null>(null)
  const wsReadyRef = useRef(false)
  const preReadyBufferRef = useRef<ArrayBuffer[]>([])
  const MAX_PRE_READY = 24

  const recorderRef = useRef<MediaRecorder | null>(null)
  const mediaStreamRef = useRef<MediaStream | null>(null)

  const audioCtxRef = useRef<AudioContext | null>(null)
  const gainRef = useRef<GainNode | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)

  const [isRecording, setIsRecording] = useState(false)
  const desiredMimeRef = useRef<string | null>(null)
  const desiredEncodingRef = useRef<"OGG_OPUS" | "WEBM_OPUS" | null>(null)

  // estado vivo del mute
  const isMutedRef = useRef(isMuted)
  useEffect(() => {
    isMutedRef.current = isMuted
    console.log(`${TAG} isMuted →`, isMuted)
  }, [isMuted])

  // ---------- VAD / barge-in (solo Google STT) ----------
  const VAD_UP = 0.014
  const INTERRUPT_COOLDOWN_MS = 700
  const lastInterruptAtRef = useRef(0)

  const isValidTranscript = (t: string) => {
    const clean = t.replace(/[^\w\sáéíóúüñÁÉÍÓÚÜÑ]/g, "").trim()
    const short = ["si", "sí", "no", "ok"]
    if (short.includes(clean.toLowerCase())) return true
    if (clean.length < 3) return false
    const noise = ["ah", "eh", "um", "uh", "mm", "hmm"]
    if (noise.includes(clean.toLowerCase())) return false
    return true
  }

  const teardown = useCallback((reason: string = "teardown") => {
    console.log(`${TAG} teardown(${reason}) start; mode=${mode}`)

    // SDK → cerrar canal de voz del SDK (sin tocar nada de Google)
    if (mode === "SDK") {
      try {
        console.log(`${TAG} [SDK] closeVoiceChat()`)
        avatarRef.current?.closeVoiceChat?.()
      } catch (e) {
        console.warn(`${TAG} [SDK] closeVoiceChat error`, e)
      }
    }

    // Google STT → apagar grabación + WS + audio graph
    try {
      if (recorderRef.current && recorderRef.current.state !== "inactive") {
        console.log(`${TAG} [GOOGLE] recorder.stop()`)
        recorderRef.current.stop()
      }
    } catch (e) { console.warn(`${TAG} [GOOGLE] recorder.stop error`, e) }
    recorderRef.current = null

    try { wsRef.current?.send(JSON.stringify({ type: "stop" })) } catch { }
    try { wsRef.current?.close() } catch { }
    wsRef.current = null
    wsReadyRef.current = false
    preReadyBufferRef.current = []

    try { audioCtxRef.current?.close() } catch { }
    audioCtxRef.current = null
    gainRef.current = null
    analyserRef.current = null

    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(t => { try { t.stop() } catch { } })
      mediaStreamRef.current = null
    }

    setIsRecording(false)
    setIsVoiceChatActive(false)
    setIsMuted(true)

    if (isOwner()) {
      activeOwnerId = null
      globalStop = null
    }

    console.log(`${TAG} teardown(${reason}) end; isVoiceChatActive=false, isMuted=true`)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [avatarRef, mode])

  // unmount → apagar si este hook es la “dueña”
  useEffect(() => {
    return () => { if (isOwner()) teardown("hook-unmount") }
  }, [teardown])

  // ---------- Audio graph (solo Google STT) ----------
  const buildGraphIfNeeded = useCallback(async () => {
    if (mode === "SDK") return // nunca construir audio local para SDK

    if (!mediaStreamRef.current) {
      console.log(`${TAG} [GOOGLE] getUserMedia()`)
      mediaStreamRef.current = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: false,
          autoGainControl: false,
          channelCount: 1,
        },
      })
    }
    if (!audioCtxRef.current) {
      audioCtxRef.current = new AudioContext()
      const src = audioCtxRef.current.createMediaStreamSource(mediaStreamRef.current)
      const g = audioCtxRef.current.createGain()
      g.gain.value = 1
      const an = audioCtxRef.current.createAnalyser()
      an.fftSize = 512
      src.connect(g); g.connect(an)
      gainRef.current = g
      analyserRef.current = an
      console.log(`${TAG} [GOOGLE] AudioGraph OK (gain=1)`)

      const buf = new Uint8Array(an.frequencyBinCount)
      const tick = () => {
        if (!analyserRef.current) return
        analyserRef.current.getByteTimeDomainData(buf)
        let s = 0
        for (let i = 0; i < buf.length; i++) {
          const v = (buf[i] - 128) / 128
          s += v * v
        }
        const rms = Math.sqrt(s / buf.length)
        if (rms >= VAD_UP && !isMutedRef.current && wsReadyRef.current) {
          const now = performance.now()
          if (now - lastInterruptAtRef.current > INTERRUPT_COOLDOWN_MS) {
            lastInterruptAtRef.current = now
            try { avatarRef.current?.interrupt?.() } catch { }
          }
        }
        requestAnimationFrame(tick)
      }
      requestAnimationFrame(tick)
    }
  }, [avatarRef, mode])

  const restartRecorder = useCallback(async () => {
    if (mode === "SDK") return
    return new Promise<void>((resolve) => {
      if (!recorderRef.current) return resolve()
      const stopAndStart = async () => {
        try {
          // @ts-ignore
          const stream = mediaStreamRef.current!
          if (recorderRef.current?.state !== "inactive") {
            // @ts-ignore
            recorderRef.current.onstop = () => {
              const nrec = new MediaRecorder(stream, { mimeType: desiredMimeRef.current! })
              recorderRef.current = nrec
              nrec.ondataavailable = async (e) => {
                if (!e.data || e.data.size === 0 || !wsRef.current) return
                const buf = await e.data.arrayBuffer()
                if (wsRef.current.readyState === WebSocket.OPEN) wsRef.current.send(buf)
              }
              nrec.start(100)
              setIsRecording(true)
              console.log(`${TAG} [GOOGLE] Recorder restarted`)
              resolve()
            }
            console.log(`${TAG} [GOOGLE] Recorder stop (for restart)`)
            // @ts-ignore
            recorderRef.current.stop()
          } else {
            const nrec = new MediaRecorder(stream, { mimeType: desiredMimeRef.current! })
            recorderRef.current = nrec
            nrec.ondataavailable = async (e) => {
              if (!e.data || e.data.size === 0 || !wsRef.current) return
              const buf = await e.data.arrayBuffer()
              if (wsRef.current.readyState === WebSocket.OPEN) wsRef.current.send(buf)
            }
            nrec.start(100)
            setIsRecording(true)
            console.log(`${TAG} [GOOGLE] Recorder started (was inactive)`)
            resolve()
          }
        } catch (e) {
          console.error(`${TAG} [GOOGLE] restartRecorder error:`, e)
          resolve()
        }
      }
      stopAndStart()
    })
  }, [setIsRecording, mode])

  const beginRecording = useCallback(async () => {
    if (mode === "SDK") return
    if (recorderRef.current && recorderRef.current.state !== "inactive") return
    await buildGraphIfNeeded()

    if (!recorderRef.current) {
      const mime =
        MediaRecorder.isTypeSupported("audio/webm;codecs=opus") ? "audio/webm;codecs=opus"
          : MediaRecorder.isTypeSupported("audio/ogg;codecs=opus") ? "audio/ogg;codecs=opus"
            : ""
      if (!mime) throw new Error("MediaRecorder sin soporte para Opus")
      recorderRef.current = new MediaRecorder(mediaStreamRef.current!, { mimeType: mime })
      console.log(`${TAG} [GOOGLE] MediaRecorder created (${mime})`)

      recorderRef.current.ondataavailable = async (e) => {
        if (!e.data || e.data.size === 0) return
        if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return
        if (isMutedRef.current) {
          // Filtro hard: nada sale si está muteado
          return
        }
        const buf = await e.data.arrayBuffer()
        if (wsReadyRef.current) {
          try { wsRef.current.send(buf) } catch { }
        } else {
          if (preReadyBufferRef.current.length < MAX_PRE_READY) {
            preReadyBufferRef.current.push(buf)
          }
        }
      }
    }

    recorderRef.current.start(100)
    setIsRecording(true)
    console.log(`${TAG} [GOOGLE] Recorder.start(100) -> isRecording=true`)
  }, [buildGraphIfNeeded, mode])

  // ---------- WS (solo Google STT) ----------
  const handleWSMessage = useCallback(async (event: MessageEvent) => {
    if (mode === "SDK") return
    let data: any
    try { data = JSON.parse(event.data) } catch { return }

    if (data.type === "reset") {
      console.log(`${TAG} [GOOGLE] WS reset → restartRecorder`)
      await restartRecorder()
      return
    }
    if (data.type === "ready") {
      console.log(`${TAG} [GOOGLE] WS ready; flush pre-buffer len=${preReadyBufferRef.current.length}`)
      wsReadyRef.current = true
      const pending = preReadyBufferRef.current
      preReadyBufferRef.current = []
      for (const chunk of pending) { try { wsRef.current?.send(chunk) } catch { } }
      return
    }
    if (data.error) { console.error(`${TAG} [GOOGLE] WS error:`, data.error); return }

    if (data.transcript) {
      if (!data.isFinal) {
        if (!isMutedRef.current) {
          // barge-in por parcial
          try { avatarRef.current?.interrupt?.() } catch { }
        }
        return
      }

      const transcript = String(data.transcript || "").trim()
      if (!isValidTranscript(transcript)) return

      console.log(`${TAG} [GOOGLE] FINAL transcript:`, transcript, " (isMuted=", isMutedRef.current, ")")
      addUserMessage(transcript)

      try {
        let textToSpeak = ""
        if (avatarType === "gestor-cobranza") {
          const session = getSession("gestor-cobranza")
          if (!session?.sessionId) return
          const body = { session_id: session.sessionId, user_input: transcript }
          const r = await axios.post("/api/gestor-cobranza/chat", body, {
            headers: { "Content-Type": "application/json" }, timeout: 30000
          })
          textToSpeak = r.data?.agent_response || ""
        } else if (avatarType === "bcg-product") {
          const session = getSession("bcg-product")
          if (!session || !isBCGSession(session) || !session.conversationId) return
          const body = { user_input: transcript, conversation_id: session.conversationId }
          const r = await axios.post("/api/bcg/chat", body, {
            headers: { "Content-Type": "application/json" }, timeout: 30000
          })
          textToSpeak = r.data?.response || ""
          if (r.data?.image_base64) {
            const { addBCGImage, setImageModalOpen } = useAvatarStore.getState()
            addBCGImage(r.data.image_base64)
            setImageModalOpen(true)
          }
        }
        if (textToSpeak) {
          await avatarRef.current?.speak({ text: textToSpeak, taskType: TaskType.REPEAT })
        }
      } catch (e) {
        console.error(`${TAG} [GOOGLE] ❌ Error API negocio:`, e)
      }
    }
  }, [addUserMessage, avatarRef, avatarType, getSession, restartRecorder, mode])

  const startStreaming = useCallback(async () => {
    if (mode === "SDK") return
    const { mime, encoding } = pickMimeAndEncoding()
    desiredMimeRef.current = mime
    desiredEncodingRef.current = encoding

    const url =
      process.env.NEXT_PUBLIC_STT_WS_URL ??
      (location.protocol === "https:"
        ? `wss://${location.hostname}:4000/ws`
        : `ws://${location.hostname}:4000/ws`)
    console.log(`${TAG} [GOOGLE] WS connect →`, url, mime, encoding)
    const ws = new WebSocket(url)
    ws.binaryType = "arraybuffer"
    wsRef.current = ws
    wsReadyRef.current = false
    preReadyBufferRef.current = []

    ws.onopen = async () => {
      try { await beginRecording() } catch (e) { console.error(`${TAG} [GOOGLE] beginRecording failed:`, e) }
      ws.send(JSON.stringify({
        type: "start",
        encoding,
        languageCode: "es-ES",
        interimResults: true,
        singleUtterance: false,
        model: "latest_long",
        sampleRateHertz: 16000,
      }))
    }
    ws.onmessage = handleWSMessage
    ws.onclose = () => teardown("ws-close")
    ws.onerror = (err) => console.error(`${TAG} [GOOGLE] WS onerror:`, err)
  }, [beginRecording, handleWSMessage, teardown, mode])

  // ---------- API pública ----------
  const startVoiceChat = useCallback(async () => {
    if (!avatarRef.current) { console.warn(`${TAG} startVoiceChat: avatarRef=null`); return }
    // Ownership
    if (!isOwner()) {
      if (activeOwnerId && activeOwnerId !== instanceIdRef.current) {
        console.log(`${TAG} preempting previous owner ${activeOwnerId}`)
        globalStop?.("preempt-by-new-owner")
      }
      activeOwnerId = instanceIdRef.current
      globalStop = (why?: string) => { if (isOwner()) teardown(why ?? "global-stop") }
    }

    console.log(`${TAG} startVoiceChat → mode=${mode}, avatarType=${avatarType}`)
    setIsVoiceChatLoading(true)
    try {
      if (mode === "SDK") {
        // Arrancamos activo (desmuteado)
        await avatarRef.current.startVoiceChat({ isInputAudioMuted: false })
        console.log(`${TAG} [SDK] startVoiceChat({ isInputAudioMuted:false }) OK`)
        // Guardas dobles (asegurar estado):
        try { avatarRef.current.unmuteInputAudio?.() } catch { }
        try { avatarRef.current.startListening?.() } catch { }
        setIsMuted(false)
      } else {
        // Google STT
        isMutedRef.current = false
        setIsMuted(false)
        await startStreaming()
      }
      setIsVoiceChatActive(true)
      console.log(`${TAG} startVoiceChat DONE → isVoiceChatActive=true, isMuted=false`)
    } catch (e) {
      console.error(`${TAG} startVoiceChat ERROR:`, e)
      if (isOwner()) { activeOwnerId = null; globalStop = null }
    } finally {
      setIsVoiceChatLoading(false)
    }
  }, [avatarRef, mode, avatarType, setIsMuted, setIsVoiceChatActive, setIsVoiceChatLoading, startStreaming, teardown])

  const stopVoiceChat = useCallback(() => {
    console.log(`${TAG} stopVoiceChat()`)
    globalStop?.("ui-stop")
  }, [])

  const muteInputAudio = useCallback(() => {
    console.log(`${TAG} muteInputAudio (mode=${mode})`)
    if (mode === "SDK") {
      // Guardas dobles en SDK: mutear + detener el “listening”
      try { avatarRef.current?.muteInputAudio?.() } catch (e) {
        console.warn(`${TAG} [SDK] muteInputAudio error`, e)
      }
      try { avatarRef.current?.stopListening?.() } catch (e) {
        console.warn(`${TAG} [SDK] stopListening error`, e)
      }
      isMutedRef.current = true
      setIsMuted(true)
      console.log(`${TAG} [SDK] muted=true`)
      return
    }
    // Google STT: bajar ganancia + bloquear envío
    try {
      if (gainRef.current && audioCtxRef.current) {
        gainRef.current.gain.setTargetAtTime(0, audioCtxRef.current.currentTime, 0.01)
      }
    } catch { }
    isMutedRef.current = true
    setIsMuted(true)
    console.log(`${TAG} [GOOGLE] muted=true (gain=0 + filtro de chunks)`)
  }, [avatarRef, mode, setIsMuted])

  const unmuteInputAudio = useCallback(() => {
    console.log(`${TAG} unmuteInputAudio (mode=${mode})`)
    if (mode === "SDK") {
      // Guardas dobles en SDK: desmutear + reanudar “listening”
      try { avatarRef.current?.unmuteInputAudio?.() } catch (e) {
        console.warn(`${TAG} [SDK] unmuteInputAudio error`, e)
      }
      try { avatarRef.current?.startListening?.() } catch (e) {
        console.warn(`${TAG} [SDK] startListening error`, e)
      }
      isMutedRef.current = false
      setIsMuted(false)
      console.log(`${TAG} [SDK] muted=false`)
      return
    }
    // Google STT: subir ganancia y permitir envío
    try {
      if (gainRef.current && audioCtxRef.current) {
        gainRef.current.gain.setTargetAtTime(1, audioCtxRef.current.currentTime, 0.01)
      }
    } catch { }
    isMutedRef.current = false
    setIsMuted(false)
    console.log(`${TAG} [GOOGLE] muted=false (gain=1 + envío activo)`)
  }, [avatarRef, mode, setIsMuted])

  return {
    startVoiceChat,
    stopVoiceChat,
    muteInputAudio,
    unmuteInputAudio,
    isMuted,
    isVoiceChatActive,
    isVoiceChatLoading,
    isRecording,
  }
}
