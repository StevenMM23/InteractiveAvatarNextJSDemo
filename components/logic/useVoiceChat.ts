"use client"

import { useCallback, useEffect, useRef } from "react"
import { TaskType } from "@heygen/streaming-avatar"
import axios from "axios"

import { useStreamingAvatarContext } from "./context"
import { useAvatarStore } from "../../store/avatarStore"

interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList
  resultIndex: number
}
interface SpeechRecognition extends EventTarget {
  continuous: boolean
  interimResults: boolean
  lang: string
  start(): void
  stop(): void
  abort(): void
  onresult: ((event: SpeechRecognitionEvent) => void) | null
  onstart: ((event: Event) => void) | null
  onend: ((event: Event) => void) | null
  onerror: ((event: Event) => void) | null
}
declare global {
  interface Window {
    SpeechRecognition: new () => SpeechRecognition
    webkitSpeechRecognition: new () => SpeechRecognition
  }
}

const isBCGSession = (session: any): session is import("../../store/avatarStore").BCGSession =>
  session && "conversationId" in session && "selectedProduct" in session

export const useVoiceChat = (avatarType = "gestor-cobranza") => {
  const {
    avatarRef,
    isMuted,
    setIsMuted,
    isVoiceChatActive,
    setIsVoiceChatActive,
    isVoiceChatLoading,
    setIsVoiceChatLoading,
    addUserMessage
  } = useStreamingAvatarContext()

  const { getSession, currentAvatarType } = useAvatarStore()
  const isActive = avatarType === currentAvatarType

  // refs
  const speechRecognitionRef = useRef<SpeechRecognition | null>(null)
  const isAvatarSpeakingRef = useRef(false)

  // --- Validación transcript ---
  const isValidTranscript = (t: string) => {
    const clean = t.replace(/[^\w\sáéíóúüñÁÉÍÓÚÜÑ]/g, "").trim()
    const validShort = ["si", "sí", "no", "ok"]
    if (validShort.includes(clean.toLowerCase())) return true
    if (clean.length < 3) return false
    const noise = ["ah", "eh", "um", "uh", "mm", "hmm"]
    if (noise.includes(clean.toLowerCase())) return false
    return true
  }

  const pauseSpeechRecognition = useCallback(() => {
    if (!isActive) return
    try {
      speechRecognitionRef.current?.stop()
      isAvatarSpeakingRef.current = true
    } catch { }
  }, [isActive])

  const resumeSpeechRecognition = useCallback(() => {
    if (!isActive) return
    if (speechRecognitionRef.current && !isMuted && isVoiceChatActive) {
      setTimeout(() => {
        try {
          speechRecognitionRef.current?.start()
          isAvatarSpeakingRef.current = false
        } catch { }
      }, 1000)
    }
  }, [isMuted, isVoiceChatActive, isActive])

  // 🎤 Inicialización de Web Speech (solo API-driven)
  useEffect(() => {
    if (!isActive) {
      console.log(`⏸️ [useVoiceChat] ${avatarType} ignorado. Activo: ${currentAvatarType}`)
      return
    }

    const isKnowledge = ["volcano", "gbm-onboarding", "microsoft-services"].includes(avatarType)
    if (isKnowledge) {
      console.log("🟦 [useVoiceChat] SDK maneja micro:", avatarType)
      return
    }

    if (typeof window === "undefined") return
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SR) return

    console.log("🟩 [useVoiceChat] Web Speech inicializado:", avatarType)
    speechRecognitionRef.current = new SR()
    speechRecognitionRef.current.continuous = true
    speechRecognitionRef.current.interimResults = true
    speechRecognitionRef.current.lang = "es-ES"

    // --- Evento onresult ---
    speechRecognitionRef.current.onresult = async (event) => {
      if (!isActive) return
      const last = event.results[event.results.length - 1]
      const transcript = last[0].transcript.trim()

      // interrupción natural
      if (!last.isFinal && transcript.length > 0) {
        avatarRef.current?.interrupt?.()
        isAvatarSpeakingRef.current = false
        return
      }

      if (!last.isFinal) return
      if (!isValidTranscript(transcript)) return
      if (!avatarRef.current) return
      pauseSpeechRecognition()

      addUserMessage(transcript)

      try {
        let textToSpeak = ""

        if (avatarType === "gestor-cobranza") {
          const session = getSession("gestor-cobranza")
          if (!session?.sessionId) return
          const body = { session_id: session.sessionId, user_input: transcript }
          const res = await axios.post("/api/gestor-cobranza/chat", body, {
            headers: { "Content-Type": "application/json" },
            timeout: 30000,
          })
          textToSpeak = res.data?.agent_response || ""
        } else if (avatarType === "bcg-product") {
          const session = getSession("bcg-product")
          if (!session || !isBCGSession(session) || !session.conversationId) return
          const body = { user_input: transcript, conversation_id: session.conversationId }
          const res = await axios.post("/api/bcg/chat", body, {
            headers: { "Content-Type": "application/json" },
            timeout: 30000,
          })
          textToSpeak = res.data?.response || ""

          // 🚀 Nuevo: imagen
          if (res.data?.image_base64) {
            const { addBCGImage, setImageModalOpen } = useAvatarStore.getState()
            addBCGImage(res.data.image_base64)
            setImageModalOpen(true)
          }
        }

        if (textToSpeak) {
          await avatarRef.current?.speak({ text: textToSpeak, taskType: TaskType.REPEAT })
        }
      } catch (err) {
        console.error("[useVoiceChat] error:", err)
      }

      setTimeout(resumeSpeechRecognition, 2000)
    }

    // reinicio en error
    speechRecognitionRef.current.onerror = () => {
      if (!isMuted && isVoiceChatActive && !isAvatarSpeakingRef.current) {
        setTimeout(() => speechRecognitionRef.current?.start(), 1500)
      }
    }

    // reinicio en cierre natural
    speechRecognitionRef.current.onend = () => {
      if (!isMuted && isVoiceChatActive && !isAvatarSpeakingRef.current) {
        setTimeout(() => speechRecognitionRef.current?.start(), 1000)
      }
    }

    return () => {
      try {
        speechRecognitionRef.current?.stop()
      } catch { }
      speechRecognitionRef.current = null
    }
  }, [avatarType, avatarRef, getSession, isMuted, isVoiceChatActive, pauseSpeechRecognition, resumeSpeechRecognition, isActive, currentAvatarType])

  // 🚀 start/stop/mute/unmute
  const startVoiceChat = useCallback(async (isInputAudioMuted?: boolean) => {
    if (!isActive || !avatarRef.current) return
    setIsVoiceChatLoading(true)

    try {
      const isKnowledge = ["volcano", "gbm-onboarding", "microsoft-services"].includes(avatarType)

      if (isKnowledge) {
        await avatarRef.current.startVoiceChat({ isInputAudioMuted })
      } else {
        if (speechRecognitionRef.current && !isInputAudioMuted) {
          speechRecognitionRef.current.start()
        }
      }
      setIsVoiceChatActive(true)
      setIsMuted(!!isInputAudioMuted)
    } catch (err) {
      console.error("[useVoiceChat] startVoiceChat error:", err)
    } finally {
      setIsVoiceChatLoading(false)
    }
  }, [isActive, avatarType, avatarRef, setIsVoiceChatLoading, setIsVoiceChatActive, setIsMuted])

  const stopVoiceChat = useCallback(() => {
    if (!isActive || !avatarRef.current) return
    try {
      speechRecognitionRef.current?.stop()
    } catch { }
    avatarRef.current.closeVoiceChat?.()
    setIsVoiceChatActive(false)
    setIsMuted(true)
  }, [isActive, avatarRef, setIsMuted, setIsVoiceChatActive])

  const muteInputAudio = useCallback(() => {
    if (!isActive || !avatarRef.current) return
    const isKnowledge = ["volcano", "gbm-onboarding", "microsoft-services"].includes(avatarType)

    if (isKnowledge) {
      avatarRef.current.muteInputAudio?.()
    } else {
      try {
        speechRecognitionRef.current?.stop()
      } catch { }
      const mediaStream = (avatarRef.current as any).localStream
      mediaStream?.getAudioTracks().forEach((t: MediaStreamTrack) => (t.enabled = false))
    }
    setIsMuted(true)
  }, [isActive, avatarType, avatarRef, setIsMuted])

  const unmuteInputAudio = useCallback(() => {
    if (!isActive || !avatarRef.current) return
    const isKnowledge = ["volcano", "gbm-onboarding", "microsoft-services"].includes(avatarType)

    if (isKnowledge) {
      avatarRef.current.unmuteInputAudio?.()
    } else {
      try {
        speechRecognitionRef.current?.start()
      } catch { }
      const mediaStream = (avatarRef.current as any).localStream
      mediaStream?.getAudioTracks().forEach((t: MediaStreamTrack) => (t.enabled = true))
    }
    setIsMuted(false)
  }, [isActive, avatarType, avatarRef, setIsMuted])

  const setSpeechLanguage = useCallback((language: string) => {
    if (!isActive) return
    if (speechRecognitionRef.current) speechRecognitionRef.current.lang = language
  }, [isActive])

  return {
    startVoiceChat,
    stopVoiceChat,
    muteInputAudio,
    unmuteInputAudio,
    setSpeechLanguage,
    isMuted,
    isVoiceChatActive,
    isVoiceChatLoading,
  }
}
