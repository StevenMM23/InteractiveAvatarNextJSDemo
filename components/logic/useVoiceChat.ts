"use client"

import { useCallback, useRef, useState, useEffect } from "react"
import { TaskType } from "@heygen/streaming-avatar"
import axios from "axios"
import { useStreamingAvatarContext } from "./context"
import { useAvatarStore } from "../../store/avatarStore"

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

export const useVoiceChat = (avatarType = "gestor-cobranza") => {
  const {
    avatarRef,
    isMuted, setIsMuted,
    isVoiceChatActive, setIsVoiceChatActive,
    isVoiceChatLoading, setIsVoiceChatLoading,
    addUserMessage,
  } = useStreamingAvatarContext()

  const { getSession, currentAvatarType } = useAvatarStore()
  const isActive = avatarType === currentAvatarType

  // ---------- IDs / flags ----------
  const instanceIdRef = useRef<string>(makeId())
  const isOwner = () => activeOwnerId === instanceIdRef.current

  // ---------- WS / Recorder / AudioGraph ----------
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

  // estados “vivos” que usan callbacks
  const isMutedRef = useRef(isMuted)
  useEffect(() => { isMutedRef.current = isMuted }, [isMuted])

  // ---------- VAD / barge-in ----------
  const VAD_UP = 0.014
  const INTERRUPT_COOLDOWN_MS = 700
  const lastInterruptAtRef = useRef(0)

  // ---------- Utils ----------
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
    // cerrar recorder
    try { if (recorderRef.current && recorderRef.current.state !== "inactive") recorderRef.current.stop() } catch { }
    recorderRef.current = null

    // cerrar WS
    try { wsRef.current?.send(JSON.stringify({ type: "stop" })) } catch { }
    try { wsRef.current?.close() } catch { }
    wsRef.current = null
    wsReadyRef.current = false
    preReadyBufferRef.current = []

    // cerrar audio
    try { audioCtxRef.current?.close() } catch { }
    audioCtxRef.current = null
    gainRef.current = null
    analyserRef.current = null

    // parar tracks
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(t => { try { t.stop() } catch { } })
      mediaStreamRef.current = null
    }

    setIsRecording(false)
    setIsVoiceChatActive(false)
    setIsMuted(true)

    // liberar “dueño”
    if (isOwner()) {
      activeOwnerId = null
      globalStop = null
    }

    console.log(`[GoogleSTT] 🔚 teardown complete (${reason})`)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // expose stop globally: cualquier instancia lo puede invocar
  useEffect(() => {
    return () => {
      // si esta instancia se desmonta y es la dueña, apaga todo
      if (isOwner()) teardown("hook-unmount")
    }
  }, [teardown])

  // ---------- Audio (getUserMedia + WebAudio + Recorder) ----------
  const buildGraphIfNeeded = useCallback(async () => {
    if (!mediaStreamRef.current) {
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

      // VAD loop
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
            // no hacemos más — barge-in mínimo
          }
        }
        requestAnimationFrame(tick)
      }
      requestAnimationFrame(tick)
    }
  }, [avatarRef])
  // dentro del hook
  const restartRecorder = useCallback(async () => {
    // Para garantizar cabecera en el próximo blob
    return new Promise<void>((resolve) => {
      if (!recorderRef.current) return resolve();

      // si ya está grabando → parar y re-crear
      const stopAndStart = async () => {
        try {
          const rec = recorderRef.current!;
          const stream = mediaStreamRef.current!;
          // detach handlers por si el browser dispara eventos tardíos
          rec.ondataavailable = null as any;
          rec.onerror = null as any;
          if (rec.state !== "inactive") {
            rec.onstop = () => {
              // crear uno nuevo
              const nrec = new MediaRecorder(stream, { mimeType: desiredMimeRef.current! });
              recorderRef.current = nrec;
              nrec.ondataavailable = async (e) => {
                if (!e.data || e.data.size === 0 || !wsRef.current) return;
                const buf = await e.data.arrayBuffer();
                if (wsRef.current.readyState === WebSocket.OPEN) {
                  wsRef.current.send(buf);
                }
              };
              nrec.start(100);
              setIsRecording(true);
              console.log("[GoogleSTT] 🔁 Recorder restarted (new header)");
              resolve();
            };
            rec.stop();
          } else {
            // estaba inactivo, simplemente crear de nuevo
            const nrec = new MediaRecorder(stream, { mimeType: desiredMimeRef.current! });
            recorderRef.current = nrec;
            nrec.ondataavailable = async (e) => {
              if (!e.data || e.data.size === 0 || !wsRef.current) return;
              const buf = await e.data.arrayBuffer();
              if (wsRef.current.readyState === WebSocket.OPEN) wsRef.current.send(buf);
            };
            nrec.start(100);
            setIsRecording(true);
            console.log("[GoogleSTT] 🔁 Recorder restarted (inactive→start)");
            resolve();
          }
        } catch (e) {
          console.error("[GoogleSTT] ❌ restartRecorder error:", e);
          resolve();
        }
      };

      stopAndStart();
    });
  }, [setIsRecording]);

  const beginRecording = useCallback(async () => {
    // idempotente
    if (recorderRef.current && recorderRef.current.state !== "inactive") {
      return
    }

    await buildGraphIfNeeded()

    if (!recorderRef.current) {
      const mime =
        MediaRecorder.isTypeSupported("audio/webm;codecs=opus") ? "audio/webm;codecs=opus"
          : MediaRecorder.isTypeSupported("audio/ogg;codecs=opus") ? "audio/ogg;codecs=opus"
            : ""
      if (!mime) throw new Error("MediaRecorder sin soporte para Opus")
      recorderRef.current = new MediaRecorder(mediaStreamRef.current!, { mimeType: mime })

      recorderRef.current.ondataavailable = async (e) => {
        if (!e.data || e.data.size === 0) return
        if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return
        // 🔒 si está muteado → NO enviar
        if (isMutedRef.current) return
        const buf = await e.data.arrayBuffer()
        if (wsReadyRef.current) {
          try { wsRef.current.send(buf) } catch { }
        } else {
          if (preReadyBufferRef.current.length < MAX_PRE_READY) {
            preReadyBufferRef.current.push(buf)
          }
        }
      }
      recorderRef.current.onstop = () => { /* log opcional */ }
    }

    recorderRef.current.start(100) // 100ms para latencia baja
    setIsRecording(true)
  }, [buildGraphIfNeeded])

  // ---------- WS ----------
  const handleWSMessage = useCallback(async (event: MessageEvent) => {
    let data: any
    try { data = JSON.parse(event.data) } catch { return }
    if (data.type === "reset") {
      console.log("[GoogleSTT] 🔁 Server requested recorder reset (need header)");
      await restartRecorder();
      return;
    }
    if (data.type === "ready") {
      wsReadyRef.current = true
      // ⚠️ ya estábamos grabando en pre-ready → sólo vaciamos el buffer
      const pending = preReadyBufferRef.current
      preReadyBufferRef.current = []
      for (const chunk of pending) {
        try { wsRef.current?.send(chunk) } catch { }
      }
      return
    }

    if (data.error) {
      console.error("[GoogleSTT] ❌ Backend error:", data.error)
      return
    }

    if (data.transcript) {
      if (!data.isFinal) {
        // parciales: para consola y barge-in, pero si mute → ignorar
        if (!isMutedRef.current) {
          console.log("[GoogleSTT] ✍️ Partial:", data.transcript)
          // (el VAD ya bargea por sí mismo; mantener aquí por respaldo)
          try { avatarRef.current?.interrupt?.() } catch { }
        }
        return
      }

      const transcript = String(data.transcript || "").trim()
      console.log("[GoogleSTT] ✅ Final:", transcript)
      if (!isValidTranscript(transcript)) return

      addUserMessage(transcript)

      try {
        let textToSpeak = ""
        if (avatarType === "gestor-cobranza") {
          const session = getSession("gestor-cobranza")
          if (!session?.sessionId) return
          const body = { session_id: session.sessionId, user_input: transcript }
          const r = await axios.post("/api/gestor-cobranza/chat", body, { headers: { "Content-Type": "application/json" }, timeout: 30000 })
          textToSpeak = r.data?.agent_response || ""
        } else if (avatarType === "bcg-product") {
          const session = getSession("bcg-product")
          if (!session || !isBCGSession(session) || !session.conversationId) return
          const body = { user_input: transcript, conversation_id: session.conversationId }
          const r = await axios.post("/api/bcg/chat", body, { headers: { "Content-Type": "application/json" }, timeout: 30000 })
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
        console.error("[GoogleSTT] ❌ Error API negocio:", e)
      }
    }
  }, [addUserMessage, avatarRef, avatarType, getSession])

  const startStreaming = useCallback(async () => {
    const { mime, encoding } = pickMimeAndEncoding()
    desiredMimeRef.current = mime
    desiredEncodingRef.current = encoding

    const url =
      process.env.NEXT_PUBLIC_STT_WS_URL ??
      (location.protocol === "https:"
        ? `wss://${location.hostname}:4000/ws`
        : `ws://${location.hostname}:4000/ws`)
    console.log("[GoogleSTT] 🌐 Connecting to WS:", url, mime, encoding)
    const ws = new WebSocket(url)
    ws.binaryType = "arraybuffer"
    wsRef.current = ws
    wsReadyRef.current = false
    preReadyBufferRef.current = []

    ws.onopen = async () => {
      // 1) empezamos a grabar YA (pre-ready)
      try { await beginRecording() } catch (e) { console.error("[GoogleSTT] beginRecording failed:", e) }
      // 2) handshake
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
    ws.onerror = (err) => console.error("[GoogleSTT] ⚠️ WS error:", err)
  }, [beginRecording, handleWSMessage, teardown])

  // ---------- API pública ----------
  const startVoiceChat = useCallback(async () => {
    if (!isActive || !avatarRef.current) return
    setIsVoiceChatLoading(true)
    try {
      // pedir candado
      if (activeOwnerId && activeOwnerId !== instanceIdRef.current) {
        // otro hook ya controla; primero detenerlo
        globalStop?.("preempt-by-new-owner")
      }
      activeOwnerId = instanceIdRef.current
      globalStop = (why?: string) => { if (isOwner()) teardown(why ?? "global-stop") }

      // abrir micro + WS
      isMutedRef.current = false
      setIsMuted(false)

      const isKnowledge = ["volcano", "gbm-onboarding", "microsoft-services"].includes(avatarType)
      if (isKnowledge) {
        await avatarRef.current.startVoiceChat({})
      } else {
        await startStreaming()
      }
      setIsVoiceChatActive(true)
    } catch (e) {
      console.error("[useVoiceChat] ❌ startVoiceChat:", e)
      // si falló, liberar candado
      if (isOwner()) { activeOwnerId = null; globalStop = null }
    } finally {
      setIsVoiceChatLoading(false)
    }
  }, [isActive, avatarRef, avatarType, setIsMuted, setIsVoiceChatActive, setIsVoiceChatLoading, startStreaming, teardown])

  const stopVoiceChat = useCallback(() => {
    // siempre intenta parar la sesión activa (dueña)
    globalStop?.("ui-stop")
  }, [])

  const muteInputAudio = useCallback(() => {
    // soft-mute + no enviar chunks
    try {
      if (gainRef.current && audioCtxRef.current) {
        gainRef.current.gain.setTargetAtTime(0, audioCtxRef.current.currentTime, 0.01)
      }
    } catch { }
    isMutedRef.current = true
    setIsMuted(true)
  }, [setIsMuted])

  const unmuteInputAudio = useCallback(() => {
    try {
      if (gainRef.current && audioCtxRef.current) {
        gainRef.current.gain.setTargetAtTime(1, audioCtxRef.current.currentTime, 0.01)
      }
    } catch { }
    isMutedRef.current = false
    setIsMuted(false)
  }, [setIsMuted])

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
