"use client"

import { useCallback, useRef, useEffect } from "react"
import { useAvatarStore } from "../../store/avatarStore"
import { useStreamingAvatarContext } from "./context"
import { TaskType } from "@heygen/streaming-avatar"
import axios from "axios"

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

const isBCGSession = (session: any): session is import("../../store/avatarStore").BCGSession => {
  return session && "conversationId" in session && "selectedProduct" in session
}

export const useVoiceChat = () => {
  const {
    avatarRef,
    isMuted,
    setIsMuted,
    isVoiceChatActive,
    setIsVoiceChatActive,
    isVoiceChatLoading,
    setIsVoiceChatLoading,
  } = useStreamingAvatarContext()

  const { getSession, currentAvatarType } = useAvatarStore()

  const speechRecognitionRef = useRef<SpeechRecognition | null>(null)
  const isAvatarSpeakingRef = useRef(false)
  const lastAvatarResponseRef = useRef("")

  // ✅ validación mínima de transcript
  const isValidTranscript = (transcript: string): boolean => {
    const clean = transcript.replace(/[^\w\sáéíóúüñÁÉÍÓÚÜÑ]/g, "").trim()
    const validShort = ["si", "sí", "no", "ok"]
    if (validShort.includes(clean.toLowerCase())) return true
    if (clean.length < 3) return false
    const noiseWords = ["ah", "eh", "um", "uh", "mm", "hmm"]
    if (noiseWords.includes(clean.toLowerCase())) return false
    return true
  }

  const pauseSpeechRecognition = useCallback(() => {
    if (speechRecognitionRef.current && !isMuted) {
      console.log("[v0] SPEECH - Pausando reconocimiento")
      speechRecognitionRef.current.stop()
      isAvatarSpeakingRef.current = true
    }
  }, [isMuted])

  const resumeSpeechRecognition = useCallback(() => {
    if (speechRecognitionRef.current && !isMuted && isVoiceChatActive) {
      console.log("[v0] SPEECH - Reanudando reconocimiento")
      setTimeout(() => {
        if (speechRecognitionRef.current && !isMuted) {
          speechRecognitionRef.current.start()
        }
        isAvatarSpeakingRef.current = false
      }, 1000)
    }
  }, [isMuted, isVoiceChatActive])

  // 🎤 SpeechRecognition
  useEffect(() => {
    if (typeof window === "undefined") return
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SpeechRecognition) return

    speechRecognitionRef.current = new SpeechRecognition()
    speechRecognitionRef.current.continuous = true
    speechRecognitionRef.current.interimResults = true
    speechRecognitionRef.current.lang = "es-ES"

    speechRecognitionRef.current.onresult = async (event) => {
      const avatarType = currentAvatarType || "gestor-cobranza"

      const lastResult = event.results[event.results.length - 1]
      const transcript = lastResult[0].transcript.trim()

      // 🚨 Usuario empezó a hablar (interim) → interrumpir avatar
      if (!lastResult.isFinal && transcript.length > 0) {
        console.log("[v0] 🎤 SPEECH - Usuario empezó a hablar:", transcript)
        if (avatarRef.current?.interrupt) {
          avatarRef.current.interrupt()
        } else {
          avatarRef.current?.closeVoiceChat()
        }
        isAvatarSpeakingRef.current = false
        return
      }

      // 🚨 Usuario terminó de hablar (final)
      if (lastResult.isFinal) {
        console.log("[v0] 🎤 SPEECH - Final transcript:", transcript)

        if (!isValidTranscript(transcript)) {
          console.log("[v0] 🎤 SPEECH - Transcript inválido, ignorado")
          return
        }

        if (!avatarRef.current) return
        pauseSpeechRecognition()

        try {
          let textToSpeak = ""

          if (avatarType === "gestor-cobranza") {
            const session = getSession("gestor-cobranza")
            if (!session?.sessionId) {
              console.error("[v0] GESTOR - No sessionId")
              return
            }
            const body = { session_id: session.sessionId, user_input: transcript }
            console.log("[v0] GESTOR - Request:", body)

            const res = await axios.post("/api/gestor-cobranza/chat", body, {
              headers: { "Content-Type": "application/json" },
              timeout: 30000,
            })
            textToSpeak = res.data.agent_response || ""
          }

          if (avatarType === "bcg-product") {
            const session = getSession("bcg-product")
            if (!session || !isBCGSession(session) || !session.conversationId) {
              console.error("[v0] BCG - No conversationId")
              return
            }
            const body = { user_input: transcript, conversation_id: session.conversationId }
            console.log("[v0] BCG - Request:", body)

            const res = await axios.post("/api/bcg/chat", body, {
              headers: { "Content-Type": "application/json" },
              timeout: 30000,
            })
            textToSpeak = res.data.response || ""
          }

          if (textToSpeak) {
            await avatarRef.current.speak({
              text: textToSpeak,
              taskType: TaskType.REPEAT,
            })
            lastAvatarResponseRef.current = textToSpeak.toLowerCase()
            console.log("[v0] AVATAR - Repeated:", textToSpeak)
          }
        } catch (err) {
          console.error("[v0] ❌ Error procesando transcript:", err)
        }

        setTimeout(resumeSpeechRecognition, 2000)
      }
    }

    speechRecognitionRef.current.onerror = (event) => {
      console.error("[v0] ❌ SPEECH_ERROR:", event)
      if (!isMuted && isVoiceChatActive && !isAvatarSpeakingRef.current) {
        setTimeout(() => {
          speechRecognitionRef.current?.start()
        }, 3000)
      }
    }

    speechRecognitionRef.current.onend = () => {
      console.log("[v0] 🔚 SPEECH_END")
      if (!isMuted && isVoiceChatActive && !isAvatarSpeakingRef.current) {
        setTimeout(() => {
          speechRecognitionRef.current?.start()
        }, 1000)
      }
    }
  }, [avatarRef, pauseSpeechRecognition, resumeSpeechRecognition, isMuted, isVoiceChatActive, getSession, currentAvatarType])

  // 🚀 Start Voice Chat
  const startVoiceChat = useCallback(
    async (isInputAudioMuted?: boolean) => {
      const avatarType = currentAvatarType || "gestor-cobranza"
      if (!avatarRef.current) return
      setIsVoiceChatLoading(true)

      try {
        if (avatarType === "gestor-cobranza" || avatarType === "bcg-product") {
          if (speechRecognitionRef.current && !isInputAudioMuted) {
            speechRecognitionRef.current.start()
          }
          setIsVoiceChatActive(true)
          setIsMuted(!!isInputAudioMuted)
        } else {
          await avatarRef.current?.startVoiceChat({ isInputAudioMuted })
          if (speechRecognitionRef.current && !isInputAudioMuted) {
            speechRecognitionRef.current.start()
          }
          setIsVoiceChatActive(true)
          setIsMuted(!!isInputAudioMuted)
        }
      } catch (err) {
        console.error("[v0] ❌ Error startVoiceChat:", err)
      } finally {
        setIsVoiceChatLoading(false)
      }
    },
    [avatarRef, setIsMuted, setIsVoiceChatActive, setIsVoiceChatLoading, currentAvatarType],
  )

  // 🛑 Stop Voice Chat
  const stopVoiceChat = useCallback(() => {
    if (!avatarRef.current) return
    speechRecognitionRef.current?.stop()
    avatarRef.current?.closeVoiceChat()
    setIsVoiceChatActive(false)
    setIsMuted(true)
  }, [avatarRef, setIsMuted, setIsVoiceChatActive])

  // 🔇 Mute
  const muteInputAudio = useCallback(() => {
    if (!avatarRef.current) return
    speechRecognitionRef.current?.stop()
    const mediaStream = (avatarRef.current as any).localStream
    if (mediaStream) {
      mediaStream.getAudioTracks().forEach(track => (track.enabled = false))
    }
    console.log("[v0] 🔇 Mic muted")
    setIsMuted(true)
  }, [avatarRef, setIsMuted])

  // 🔊 Unmute
  const unmuteInputAudio = useCallback(() => {
    if (!avatarRef.current) return
    speechRecognitionRef.current?.start()
    const mediaStream = (avatarRef.current as any).localStream
    if (mediaStream) {
      mediaStream.getAudioTracks().forEach(track => (track.enabled = true))
    }
    console.log("[v0] 🎤 Mic unmuted")
    setIsMuted(false)
  }, [avatarRef, setIsMuted])

  const setSpeechLanguage = useCallback((language: string) => {
    if (speechRecognitionRef.current) {
      speechRecognitionRef.current.lang = language
    }
  }, [])

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
