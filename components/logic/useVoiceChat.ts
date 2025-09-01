"use client"

import { useCallback, useRef, useEffect } from "react"
import { useAvatarStore } from "../../store/avatarStore"
import { useStreamingAvatarContext } from "./context"

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

  const { getSession } = useAvatarStore()

  const speechRecognitionRef = useRef<SpeechRecognition | null>(null)
  const isAvatarSpeakingRef = useRef(false)

  const sendMessageToAPI = useCallback(
    async (userInput: string, avatarType: string) => {
      console.log("[v0] DEBUG - Iniciando sendMessageToAPI con userInput:", userInput)
      console.log("[v0] DEBUG - Avatar type:", avatarType)

      const session = getSession(avatarType)
      if (!session?.sessionId) {
        console.error("[v0] No session ID found for avatar type:", avatarType)
        return null
      }

      console.log("[v0] DEBUG - Session encontrada:", session.sessionId)

      try {
        console.log("[v0] DEBUG - Enviando petición a /api/chat con datos:", {
          session_id: session.sessionId,
          user_input: userInput,
        })

        const response = await fetch("/api/chat", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            session_id: session.sessionId,
            user_input: userInput,
          }),
        })

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`)
        }

        const data = await response.json()
        console.log("[v0] DEBUG - Respuesta completa de API:", data)
        console.log("[v0] DEBUG - Agent response extraído:", data.agent_response)
        return data.agent_response
      } catch (error) {
        console.error("[v0] Error sending message to API:", error)
        return null
      }
    },
    [getSession],
  )

  const pauseSpeechRecognition = useCallback(() => {
    if (speechRecognitionRef.current && !isMuted) {
      console.log("[v0] DEBUG - Pausando reconocimiento de voz - avatar va a hablar")
      console.log(
        "[v0] DEBUG - Estado antes de pausar - isMuted:",
        isMuted,
        "isAvatarSpeaking:",
        isAvatarSpeakingRef.current,
      )
      speechRecognitionRef.current.stop()
      isAvatarSpeakingRef.current = true
      console.log("[v0] DEBUG - Speech recognition pausado, isAvatarSpeaking ahora es:", isAvatarSpeakingRef.current)
    }
  }, [isMuted])

  const resumeSpeechRecognition = useCallback(() => {
    console.log("[v0] DEBUG - Intentando reanudar reconocimiento de voz")
    console.log(
      "[v0] DEBUG - Estado actual - isMuted:",
      isMuted,
      "isVoiceChatActive:",
      isVoiceChatActive,
      "isAvatarSpeaking:",
      isAvatarSpeakingRef.current,
    )

    if (speechRecognitionRef.current && !isMuted && isVoiceChatActive) {
      console.log("[v0] DEBUG - Reanudando reconocimiento de voz en 500ms")
      setTimeout(() => {
        if (speechRecognitionRef.current && !isMuted) {
          console.log("[v0] DEBUG - Ejecutando restart de speech recognition")
          speechRecognitionRef.current.start()
        }
        isAvatarSpeakingRef.current = false
        console.log("[v0] DEBUG - isAvatarSpeaking ahora es:", isAvatarSpeakingRef.current)
      }, 500)
    }
  }, [isMuted, isVoiceChatActive])

  useEffect(() => {
    if (typeof window !== "undefined") {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
      if (SpeechRecognition) {
        speechRecognitionRef.current = new SpeechRecognition()
        speechRecognitionRef.current.continuous = true
        speechRecognitionRef.current.interimResults = true
        speechRecognitionRef.current.lang = "es-ES"

        speechRecognitionRef.current.onresult = async (event) => {
          console.log("[v0] DEBUG - Speech recognition onresult disparado")
          console.log("[v0] DEBUG - isAvatarSpeaking:", isAvatarSpeakingRef.current)

          if (isAvatarSpeakingRef.current) {
            console.log("[v0] DEBUG - IGNORANDO reconocimiento - avatar está hablando")
            return
          }

          const lastResult = event.results[event.results.length - 1]
          console.log("[v0] DEBUG - Resultado de speech recognition - isFinal:", lastResult.isFinal)
          console.log("[v0] DEBUG - Transcript parcial:", lastResult[0].transcript)

          if (lastResult.isFinal) {
            const transcript = lastResult[0].transcript.trim()
            console.log("[v0] DEBUG - RESULTADO FINAL de speech recognition:", transcript)
            console.log("[v0] DEBUG - Longitud del transcript:", transcript.length)

            // Validar que el transcript tenga contenido real (mínimo 3 caracteres y no solo espacios/puntuación)
            const cleanTranscript = transcript.replace(/[^\w\s]/g, "").trim()
            if (cleanTranscript.length < 3) {
              console.log("[v0] DEBUG - IGNORANDO transcript - muy corto o solo ruido:", transcript)
              return
            }

            // Filtrar palabras comunes de ruido o falsos positivos
            const noiseWords = ["ah", "eh", "um", "uh", "mm", "hmm", "sí", "no", "ok"]
            if (noiseWords.includes(cleanTranscript.toLowerCase())) {
              console.log("[v0] DEBUG - IGNORANDO transcript - palabra de ruido:", transcript)
              return
            }

            if (avatarRef.current && transcript) {
              console.log("[v0] DEBUG - Procesando transcript final, pausando speech recognition")
              pauseSpeechRecognition()

              console.log("[v0] DEBUG - Enviando transcript a API:", transcript)
              const apiResponse = await sendMessageToAPI(transcript, "gestor-cobranza")

              if (apiResponse) {
                console.log("[v0] DEBUG - API respondió exitosamente")
                console.log("[v0] DEBUG - Respuesta de API que se enviará al avatar:", apiResponse)
                console.log("[v0] DEBUG - Haciendo que el avatar hable la respuesta")

                avatarRef.current.speak({ text: apiResponse })

                console.log("[v0] DEBUG - Avatar.speak() ejecutado, esperando 5 segundos antes de reanudar")
                setTimeout(() => {
                  console.log("[v0] DEBUG - Timeout completado, reanudando speech recognition")
                  resumeSpeechRecognition()
                }, 5000)
              } else {
                console.log("[v0] DEBUG - API falló, usando transcript original como fallback")
                avatarRef.current.speak({ text: transcript })

                setTimeout(() => {
                  resumeSpeechRecognition()
                }, 5000)
              }
            } else {
              console.log("[v0] DEBUG - No se procesó - avatarRef o transcript vacío")
              console.log("[v0] DEBUG - avatarRef.current:", !!avatarRef.current)
              console.log("[v0] DEBUG - transcript:", transcript)
            }
          }
        }

        speechRecognitionRef.current.onerror = (event) => {
          console.error("[v0] DEBUG - Speech recognition error:", event)
          console.log(
            "[v0] DEBUG - Estado en error - isMuted:",
            isMuted,
            "isVoiceChatActive:",
            isVoiceChatActive,
            "isAvatarSpeaking:",
            isAvatarSpeakingRef.current,
          )

          if (!isMuted && isVoiceChatActive && !isAvatarSpeakingRef.current) {
            console.log("[v0] DEBUG - Reintentando speech recognition en 3 segundos debido a error")
            setTimeout(() => {
              if (speechRecognitionRef.current && !isMuted && isVoiceChatActive) {
                speechRecognitionRef.current.start()
              }
            }, 3000)
          }
        }

        speechRecognitionRef.current.onend = () => {
          console.log("[v0] DEBUG - Speech recognition ended")
          console.log(
            "[v0] DEBUG - Estado en onend - isMuted:",
            isMuted,
            "isVoiceChatActive:",
            isVoiceChatActive,
            "isAvatarSpeaking:",
            isAvatarSpeakingRef.current,
          )

          if (!isMuted && isVoiceChatActive && !isAvatarSpeakingRef.current) {
            console.log("[v0] DEBUG - Reiniciando speech recognition automáticamente en 1 segundo")
            setTimeout(() => {
              if (speechRecognitionRef.current && !isMuted && isVoiceChatActive && !isAvatarSpeakingRef.current) {
                speechRecognitionRef.current.start()
              }
            }, 1000)
          } else {
            console.log("[v0] DEBUG - NO reiniciando speech recognition - condiciones no cumplidas")
          }
        }
      }
    }
  }, [avatarRef, sendMessageToAPI, pauseSpeechRecognition, resumeSpeechRecognition, isMuted, isVoiceChatActive])

  const startVoiceChat = useCallback(
    async (isInputAudioMuted?: boolean) => {
      if (!avatarRef.current) return
      setIsVoiceChatLoading(true)

      try {
        await avatarRef.current?.startVoiceChat({
          isInputAudioMuted,
        })

        if (speechRecognitionRef.current && !isInputAudioMuted) {
          speechRecognitionRef.current.start()
        }

        setIsVoiceChatLoading(false)
        setIsVoiceChatActive(true)
        setIsMuted(!!isInputAudioMuted)
      } catch (error) {
        console.error("[v0] Error starting voice chat:", error)
        setIsVoiceChatLoading(false)
      }
    },
    [avatarRef, setIsMuted, setIsVoiceChatActive, setIsVoiceChatLoading],
  )

  const stopVoiceChat = useCallback(() => {
    if (!avatarRef.current) return

    if (speechRecognitionRef.current) {
      speechRecognitionRef.current.stop()
    }

    avatarRef.current?.closeVoiceChat()
    setIsVoiceChatActive(false)
    setIsMuted(true)
  }, [avatarRef, setIsMuted, setIsVoiceChatActive])

  const muteInputAudio = useCallback(() => {
    if (!avatarRef.current) return

    if (speechRecognitionRef.current) {
      speechRecognitionRef.current.stop()
    }

    avatarRef.current?.muteInputAudio()
    setIsMuted(true)
  }, [avatarRef, setIsMuted])

  const unmuteInputAudio = useCallback(() => {
    if (!avatarRef.current) return

    if (speechRecognitionRef.current) {
      speechRecognitionRef.current.start()
    }

    avatarRef.current?.unmuteInputAudio()
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
    sendMessageToAPI,
    isMuted,
    isVoiceChatActive,
    isVoiceChatLoading,
  }
}
