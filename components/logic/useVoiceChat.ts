"use client"

import { useCallback, useRef, useState } from "react"
import { TaskType } from "@heygen/streaming-avatar"
import axios from "axios"
import { useStreamingAvatarContext } from "./context"
import { useAvatarStore } from "../../store/avatarStore"

const isBCGSession = (s: any): s is import("../../store/avatarStore").BCGSession =>
  s && "conversationId" in s && "selectedProduct" in s

/** Pick a recorder mimetype supported by the browser and its matching STT encoding hint */
function pickMimeAndEncoding() {
  const candidates = [
    { mime: "audio/ogg;codecs=opus", encoding: "OGG_OPUS" as const },
    { mime: "audio/webm;codecs=opus", encoding: "WEBM_OPUS" as const },
  ]
  for (const c of candidates) {
    if (typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported(c.mime)) {
      return c
    }
  }
  throw new Error("No MediaRecorder support for OGG/WebM Opus in this browser")
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

  // --- WS / media refs
  const wsRef = useRef<WebSocket | null>(null)
  const recorderRef = useRef<MediaRecorder | null>(null)
  const mediaStreamRef = useRef<MediaStream | null>(null)

  // persist chosen mime/encoding for re-handshake on unmute
  const desiredMimeRef = useRef<string | null>(null)
  const desiredEncodingRef = useRef<"OGG_OPUS" | "WEBM_OPUS" | null>(null)

  const [isRecording, setIsRecording] = useState(false)

  // ---- transcript validation
  const isValidTranscript = (t: string) => {
    const clean = t.replace(/[^\w\sáéíóúüñÁÉÍÓÚÜÑ]/g, "").trim()
    const validShort = ["si", "sí", "no", "ok"]
    if (validShort.includes(clean.toLowerCase())) return true
    if (clean.length < 3) return false
    const noise = ["ah", "eh", "um", "uh", "mm", "hmm"]
    if (noise.includes(clean.toLowerCase())) return false
    return true
  }

  // ---- helpers
  const stopMedia = useCallback(() => {
    try {
      recorderRef.current?.stop()
    } catch { }
    recorderRef.current = null
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((t) => {
        try { t.stop() } catch { }
      })
      mediaStreamRef.current = null
    }
    setIsRecording(false)
  }, [])

  const beginRecording = useCallback(async () => {
    const mime = desiredMimeRef.current
    if (!mime) throw new Error("No recorder mimetype selected")
    const ws = wsRef.current
    if (!ws || ws.readyState !== WebSocket.OPEN) throw new Error("WebSocket not open")
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    mediaStreamRef.current = stream
    const rec = new MediaRecorder(stream, { mimeType: mime })
    recorderRef.current = rec

    rec.ondataavailable = async (e) => {
      if (e.data && e.data.size > 0 && ws.readyState === WebSocket.OPEN) {
        try {
          const buf = await e.data.arrayBuffer()
          ws.send(buf)
        } catch (err) {
          console.error("[GoogleSTT] ❌ Error sending chunk:", err)
        }
      }
    }
    rec.onstart = () => { setIsRecording(true); console.log("[GoogleSTT] 🎤 Recording started") }
    rec.onstop = () => { setIsRecording(false); console.log("[GoogleSTT] ⏹️ Recording stopped") }
    rec.onerror = (ev) => console.error("[GoogleSTT] 🎙️ MediaRecorder error:", (ev as any).error || ev)

    rec.start(250) // send ~every 250ms
  }, [])

  // ---- WS message handler
  const handleWSMessage = useCallback(async (event: MessageEvent) => {
    let data: any
    try { data = JSON.parse(event.data) } catch { }
    if (!data) return

    if (data.type === "ready") {
      console.log("[GoogleSTT] ✅ Backend ready → start recording")
      try {
        await beginRecording()
      } catch (err) {
        console.error("[GoogleSTT] ❌ beginRecording failed:", err)
      }
      return
    }

    if (data.error) {
      console.error("[GoogleSTT] ❌ Backend error:", data.error)
      return
    }

    if (data.transcript) {
      if (!data.isFinal) {
        console.log("[GoogleSTT] ✍️ Partial:", data.transcript)
        // Interrupt avatar if it's speaking
        avatarRef.current?.interrupt?.()
        return
      }

      const transcript = String(data.transcript || "").trim()
      console.log("[GoogleSTT] ✅ Final:", transcript)
      if (!isValidTranscript(transcript)) {
        console.warn("[GoogleSTT] ⚠️ Invalid/empty transcript")
        return
      }

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
        console.error("[GoogleSTT] ❌ Error calling business API:", err)
      }
    }
  }, [addUserMessage, avatarRef, avatarType, getSession])

  // ---- start WS streaming
  const startStreaming = useCallback(async () => {
    console.log(`[GoogleSTT] 🎤 Starting streaming (${avatarType})...`)

    const { mime, encoding } = pickMimeAndEncoding()
    desiredMimeRef.current = mime
    desiredEncodingRef.current = encoding
    console.log(`[GoogleSTT] Chosen format → mime=${mime} encoding=${encoding}`)

    const url =
      process.env.NEXT_PUBLIC_STT_WS_URL ??
      (location.protocol === "https:" ? `wss://${location.hostname}:4000/ws` : `ws://${location.hostname}:4000/ws`)

    const ws = new WebSocket(url)
    ws.binaryType = "arraybuffer"
    wsRef.current = ws

    ws.onopen = () => {
      console.log("[GoogleSTT] 🔗 WS open → handshake")
      ws.send(JSON.stringify({
        type: "start",
        encoding,               // "OGG_OPUS" | "WEBM_OPUS" (server converts to LINEAR16)
        languageCode: "es-ES",
        interimResults: true,
        singleUtterance: false,
        model: "latest_long",
        sampleRateHertz: 16000, // informational; backend outputs 16k mono
      }))
    }

    ws.onmessage = handleWSMessage

    ws.onclose = () => {
      console.log("[GoogleSTT] 🔌 WS closed")
      stopMedia()
    }
    ws.onerror = (err) => console.error("[GoogleSTT] ⚠️ WS error:", err)
  }, [avatarType, handleWSMessage, stopMedia])

  // ---- stop WS streaming
  const stopStreaming = useCallback(() => {
    try { stopMedia() } catch { }
    try { wsRef.current?.send(JSON.stringify({ type: "stop" })) } catch { }
    try { wsRef.current?.close() } catch { }
    wsRef.current = null
    console.log("[GoogleSTT] ⏹️ Streaming stopped")
  }, [stopMedia])

  // ---- public API expected by your UI

  const startVoiceChat = useCallback(async () => {
    if (!isActive || !avatarRef.current) return
    setIsVoiceChatLoading(true)
    try {
      const isKnowledge = ["volcano", "gbm-onboarding", "microsoft-services"].includes(avatarType)
      if (isKnowledge) {
        console.log("🟦 [useVoiceChat] SDK handles mic:", avatarType)
        await avatarRef.current.startVoiceChat({})
      } else {
        await startStreaming()
      }
      setIsVoiceChatActive(true)
      setIsMuted(false)
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
    setIsMuted(true)
  }, [isActive, avatarRef, stopStreaming, setIsMuted, setIsVoiceChatActive])

  const muteInputAudio = useCallback(() => {
    // Keep WS open; stop STT pipelines so Google won't timeout
    const isKnowledge = ["volcano", "gbm-onboarding", "microsoft-services"].includes(avatarType)
    if (isKnowledge) {
      avatarRef.current?.muteInputAudio?.()
      setIsMuted(true)
      return
    }

    console.log("[GoogleSTT] 🔇 Muting mic (stop STT pipelines)")
    try { stopMedia() } catch { }
    try { wsRef.current?.send(JSON.stringify({ type: "stop" })) } catch { }
    setIsMuted(true)
  }, [avatarType, stopMedia, avatarRef])

  const unmuteInputAudio = useCallback(async () => {
    const isKnowledge = ["volcano", "gbm-onboarding", "microsoft-services"].includes(avatarType)
    if (isKnowledge) {
      avatarRef.current?.unmuteInputAudio?.()
      setIsMuted(false)
      return
    }

    console.log("[GoogleSTT] 🔊 Unmuting mic (re-handshake)")
    const ws = wsRef.current
    const encoding = desiredEncodingRef.current
    if (!ws || ws.readyState !== WebSocket.OPEN) {
      // re-open full streaming if WS died
      await startStreaming()
      setIsMuted(false)
      return
    }
    if (!encoding) {
      const picked = pickMimeAndEncoding()
      desiredMimeRef.current = picked.mime
      desiredEncodingRef.current = picked.encoding
    }

    // Re-handshake; backend will reply {type:"ready"} and then beginRecording() runs
    ws.send(JSON.stringify({
      type: "start",
      encoding: desiredEncodingRef.current,
      languageCode: "es-ES",
      interimResults: true,
      singleUtterance: false,
      model: "latest_long",
      sampleRateHertz: 16000,
    }))
    setIsMuted(false)
  }, [avatarType, startStreaming, avatarRef])

  return {
    // voice session
    startVoiceChat,
    stopVoiceChat,

    // mic controls (used by your AudioInput)
    muteInputAudio,
    unmuteInputAudio,

    // state
    isMuted,
    isVoiceChatActive,
    isVoiceChatLoading,
    isRecording,
  }
}
