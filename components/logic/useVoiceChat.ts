"use client"

import { useCallback, useRef, useState } from "react"
import { TaskType } from "@heygen/streaming-avatar"
import axios from "axios"
import { useStreamingAvatarContext } from "./context"
import { useAvatarStore } from "../../store/avatarStore"

const isBCGSession = (s: any): s is import("../../store/avatarStore").BCGSession =>
  s && "conversationId" in s && "selectedProduct" in s

function pickMimeAndEncoding() {
  const candidates = [
    { mime: "audio/webm;codecs=opus", encoding: "WEBM_OPUS" as const },
    { mime: "audio/ogg;codecs=opus", encoding: "OGG_OPUS" as const },
  ]
  for (const c of candidates) {
    if (typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported(c.mime)) return c
  }
  throw new Error("No MediaRecorder support for WebM/Opus or OGG/Opus in this browser")
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

  // WS / Recorder
  const wsRef = useRef<WebSocket | null>(null)
  const wsReadyRef = useRef(false)
  const isStreamingRef = useRef(false)

  const recorderRef = useRef<MediaRecorder | null>(null)
  const isRecorderStartingRef = useRef(false)
  const [isRecording, setIsRecording] = useState(false)

  const preReadyBufferRef = useRef<ArrayBuffer[]>([])
  const MAX_PRE_READY_BUFFERS = 30

  // WebAudio
  const mediaStreamRef = useRef<MediaStream | null>(null)
  const audioCtxRef = useRef<AudioContext | null>(null)
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null)
  const hpfRef = useRef<BiquadFilterNode | null>(null)
  const gainRef = useRef<GainNode | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const destRef = useRef<MediaStreamAudioDestinationNode | null>(null)

  // Gates
  const isMutedRef = useRef<boolean>(isMuted)
  const sendGateRef = useRef<boolean>(true)   // ⬅️ blocks sending while muted

  // VAD / interrupt throttle
  const lastInterruptAtRef = useRef(0)
  const VAD_UP = 0.012
  const INTERRUPT_COOLDOWN_MS = 800

  const isValidTranscript = (t: string) => {
    const clean = t.replace(/[^\w\sáéíóúüñÁÉÍÓÚÜÑ]/g, "").trim()
    const validShort = ["si", "sí", "no", "ok"]
    if (validShort.includes(clean.toLowerCase())) return true
    if (clean.length < 3) return false
    const noise = ["ah", "eh", "um", "uh", "mm", "hmm"]
    if (noise.includes(clean.toLowerCase())) return false
    return true
  }

  const stopMedia = useCallback(() => {
    try { if (recorderRef.current && recorderRef.current.state !== "inactive") recorderRef.current.stop() } catch { }
    recorderRef.current = null

    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(t => { try { t.stop() } catch { } })
      mediaStreamRef.current = null
    }
    if (audioCtxRef.current) {
      try { audioCtxRef.current.close() } catch { }
      audioCtxRef.current = null
    }
    sourceRef.current = null
    hpfRef.current = null
    gainRef.current = null
    analyserRef.current = null
    destRef.current = null

    setIsRecording(false)
  }, [])

  const beginRecording = useCallback(async () => {
    if (isRecorderStartingRef.current) {
      console.log("[GoogleSTT] ⚠️ beginRecording: start in progress")
      return
    }
    if (recorderRef.current && recorderRef.current.state !== "inactive") {
      console.log("[GoogleSTT] ⚠️ beginRecording: already recording")
      return
    }

    isRecorderStartingRef.current = true
    try {
      // 1) Get mic
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

      // 2) Build graph (mic → HPF → gain → analyser → DEST)
      if (!audioCtxRef.current) {
        audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)()
        sourceRef.current = audioCtxRef.current.createMediaStreamSource(mediaStreamRef.current)
        hpfRef.current = audioCtxRef.current.createBiquadFilter()
        hpfRef.current.type = "highpass"
        hpfRef.current.frequency.value = 120

        gainRef.current = audioCtxRef.current.createGain()
        gainRef.current.gain.value = 1

        analyserRef.current = audioCtxRef.current.createAnalyser()
        analyserRef.current.fftSize = 512

        destRef.current = audioCtxRef.current.createMediaStreamDestination()

        // connect
        sourceRef.current.connect(hpfRef.current)
        hpfRef.current.connect(gainRef.current)
        gainRef.current.connect(analyserRef.current)
        gainRef.current.connect(destRef.current)

        // VAD loop (disabled while muted)
        const buf = new Uint8Array(analyserRef.current.frequencyBinCount)
        const tick = () => {
          if (!analyserRef.current) return
          analyserRef.current.getByteTimeDomainData(buf)
          let s = 0
          for (let i = 0; i < buf.length; i++) {
            const v = (buf[i] - 128) / 128
            s += v * v
          }
          const rms = Math.sqrt(s / buf.length)
          if (!isMutedRef.current && rms >= VAD_UP) {
            const now = performance.now()
            if (now - lastInterruptAtRef.current > INTERRUPT_COOLDOWN_MS) {
              console.log(`[GoogleSTT][VAD] 📢 start (rms=${rms.toFixed(3)}) → interrupt()`)
              lastInterruptAtRef.current = now
              try { avatarRef.current?.interrupt?.() } catch { }
            }
          }
          requestAnimationFrame(tick)
        }
        requestAnimationFrame(tick)
      }

      // 3) Recorder from DEST stream (processed!)
      if (!recorderRef.current) {
        const { mime } = pickMimeAndEncoding()
        recorderRef.current = new MediaRecorder(destRef.current!.stream, { mimeType: mime })

        recorderRef.current.ondataavailable = async (e) => {
          if (!e.data || e.data.size === 0 || !wsRef.current) return
          if (wsRef.current.readyState !== WebSocket.OPEN) return
          if (!wsReadyRef.current) {
            // buffer small pre-ready
            const buf = await e.data.arrayBuffer()
            if (preReadyBufferRef.current.length < MAX_PRE_READY_BUFFERS) {
              preReadyBufferRef.current.push(buf)
            }
            return
          }
          if (!sendGateRef.current) return // ⬅️ hard gate while muted
          wsRef.current.send(await e.data.arrayBuffer())
        }

        recorderRef.current.onstop = () => console.log("[GoogleSTT] ⏹️ recorder stopped")
      }

      if (recorderRef.current.state === "inactive") {
        recorderRef.current.start(100) // 100ms chunks
        setIsRecording(true)
        console.log("[GoogleSTT] 🎤 Recording started")
      }
    } finally {
      isRecorderStartingRef.current = false
    }
  }, [avatarRef, setIsRecording])

  const handleWSMessage = useCallback(async (event: MessageEvent) => {
    let data: any
    try { data = JSON.parse(event.data) } catch { }
    if (!data) return

    if (data.type === "ready") {
      console.log("[GoogleSTT] ✅ Backend ready → flush pre-ready buffers")
      wsReadyRef.current = true
      for (const chunk of preReadyBufferRef.current) {
        try { if (sendGateRef.current) wsRef.current?.send(chunk) } catch { }
      }
      preReadyBufferRef.current = []
      return
    }

    if (data.error) {
      console.error("[GoogleSTT] ❌ Backend error:", data.error)
      return
    }

    if (data.transcript) {
      if (!data.isFinal) {
        if (!isMutedRef.current) {
          console.log("[GoogleSTT] ✍️ Partial:", data.transcript)
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
          const apiRes = await axios.post("/api/gestor-cobranza/chat", body, {
            headers: { "Content-Type": "application/json" }, timeout: 30000,
          })
          textToSpeak = apiRes.data?.agent_response || ""
        } else if (avatarType === "bcg-product") {
          const session = getSession("bcg-product")
          if (!session || !isBCGSession(session) || !session.conversationId) return
          const body = { user_input: transcript, conversation_id: session.conversationId }
          const apiRes = await axios.post("/api/bcg/chat", body, {
            headers: { "Content-Type": "application/json" }, timeout: 30000,
          })
          textToSpeak = apiRes.data?.response || ""
          if (apiRes.data?.image_base64) {
            const { addBCGImage, setImageModalOpen } = useAvatarStore.getState()
            addBCGImage(apiRes.data.image_base64)
            setImageModalOpen(true)
          }
        }
        if (textToSpeak) {
          await avatarRef.current?.speak({ text: textToSpeak, taskType: TaskType.REPEAT })
        }
      } catch (err) {
        console.error("[GoogleSTT] ❌ Business API error:", err)
      }
    }
  }, [addUserMessage, avatarRef, avatarType, getSession])

  const startStreaming = useCallback(async () => {
    if (isStreamingRef.current) {
      console.log("[GoogleSTT] ⚠️ startStreaming ignored: already running")
      return
    }
    isStreamingRef.current = true

    try {
      console.log(`[GoogleSTT] 🎤 Starting streaming (${avatarType})...`)
      const { encoding } = pickMimeAndEncoding()
      console.log(`[GoogleSTT] Chosen encoding=${encoding}`)

      const url =
        process.env.NEXT_PUBLIC_STT_WS_URL ??
        (location.protocol === "https:"
          ? `wss://${location.hostname}:4000/ws`
          : `ws://${location.hostname}:4000/ws`)

      const ws = new WebSocket(url)
      ws.binaryType = "arraybuffer"
      wsRef.current = ws
      wsReadyRef.current = false
      preReadyBufferRef.current = []

      ws.onopen = async () => {
        console.log("[GoogleSTT] 🔗 WS open → handshake")
        ws.send(JSON.stringify({
          type: "start",
          encoding, languageCode: "es-ES",
          interimResults: true, singleUtterance: false,
          model: "latest_long", sampleRateHertz: 16000,
        }))
        try { await beginRecording() } catch (e) {
          console.error("[GoogleSTT] ❌ beginRecording (pre-ready) failed:", e)
        }
      }
      ws.onmessage = handleWSMessage
      ws.onclose = () => { console.log("[GoogleSTT] 🔌 WS closed"); stopMedia(); isStreamingRef.current = false }
      ws.onerror = (err) => { console.error("[GoogleSTT] ⚠️ WS error:", err); isStreamingRef.current = false }
    } catch (e) {
      isStreamingRef.current = false
      throw e
    }
  }, [avatarType, beginRecording, handleWSMessage, stopMedia])

  const stopStreaming = useCallback(() => {
    try { wsRef.current?.send(JSON.stringify({ type: "stop" })) } catch { }
    try { wsRef.current?.close() } catch { }
    wsRef.current = null
    wsReadyRef.current = false
    preReadyBufferRef.current = []
    isStreamingRef.current = false
    stopMedia()
    console.log("[GoogleSTT] 🔚 teardown done")
  }, [stopMedia])

  // Public API
  const startVoiceChat = useCallback(async () => {
    if (!isActive || !avatarRef.current) return
    setIsVoiceChatLoading(true)
    try {
      isMutedRef.current = false
      sendGateRef.current = true
      setIsMuted(false)

      const isKnowledge = ["volcano", "gbm-onboarding", "microsoft-services"].includes(avatarType)
      if (isKnowledge) {
        await avatarRef.current.startVoiceChat({})
      } else {
        await startStreaming()
      }
      setIsVoiceChatActive(true)
    } catch (err) {
      console.error("[useVoiceChat] ❌ startVoiceChat error:", err)
    } finally {
      setIsVoiceChatLoading(false)
    }
  }, [isActive, avatarRef, avatarType, setIsVoiceChatActive, setIsMuted, setIsVoiceChatLoading, startStreaming])

  const stopVoiceChat = useCallback(() => {
    if (!isActive || !avatarRef.current) return
    stopStreaming()
    avatarRef.current.closeVoiceChat?.()
    setIsVoiceChatActive(false)
    isMutedRef.current = true
    sendGateRef.current = false
    setIsMuted(true)
  }, [isActive, avatarRef, stopStreaming, setIsMuted, setIsVoiceChatActive])

  const muteInputAudio = useCallback(() => {
    const isKnowledge = ["volcano", "gbm-onboarding", "microsoft-services"].includes(avatarType)
    if (isKnowledge) {
      avatarRef.current?.muteInputAudio?.()
    } else if (gainRef.current && audioCtxRef.current) {
      console.log("[GoogleSTT] 🔇 Soft-mute (gain→0 + gate)")
      gainRef.current.gain.setTargetAtTime(0, audioCtxRef.current.currentTime, 0.01)
      sendGateRef.current = false
    }
    isMutedRef.current = true
    setIsMuted(true)
  }, [avatarType, avatarRef, setIsMuted])

  const unmuteInputAudio = useCallback(() => {
    const isKnowledge = ["volcano", "gbm-onboarding", "microsoft-services"].includes(avatarType)
    if (isKnowledge) {
      avatarRef.current?.unmuteInputAudio?.()
    } else if (gainRef.current && audioCtxRef.current) {
      console.log("[GoogleSTT] 🔊 Unmute (gain→1 + gate on)")
      gainRef.current.gain.setTargetAtTime(1, audioCtxRef.current.currentTime, 0.01)
      sendGateRef.current = true
    }
    isMutedRef.current = false
    setIsMuted(false)
  }, [avatarType, avatarRef, setIsMuted])

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
