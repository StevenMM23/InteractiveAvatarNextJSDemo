"use client"

import { TaskMode, TaskType } from "@heygen/streaming-avatar"
import { useCallback } from "react"

import { useStreamingAvatarContext } from "./context"
import { getAvatarService } from "../../services/avatarServices"
import { useAvatarStore } from "@/store/avatarStore"

export const useTextChat = (avatarType = "gestor-cobranza") => {
  // Si tu contexto tiene addAssistantMessage úsalo; si no, ignóralo sin romper.
  const {
    avatarRef,
    addUserMessage,
    isAvatarTalking,
    // @ts-ignore – puede no existir, lo tratamos opcional
    addAssistantMessage,
  } = useStreamingAvatarContext()

  const sendMessageToAPI = useCallback(
    async (userInput: string) => {
      console.log("🎯 [useTextChat] ROUTER - avatarType:", avatarType)

      const isKnowledge =
        avatarType === "volcano" ||
        avatarType === "gbm-onboarding" ||
        avatarType === "microsoft-services"

      // Para API-driven, guardamos el mensaje del usuario en el historial
      if (!isKnowledge) addUserMessage(userInput)

      // Si el avatar está hablando, interrumpimos antes de lo nuevo
      if (isAvatarTalking) {
        try {
          await avatarRef.current?.interrupt()
        } catch (e) {
          console.warn("[useTextChat] interrupt error:", e)
        }
      }

      try {
        // KNOWLEDGE → TALK directo por SDK
        if (isKnowledge) {
          if (!avatarRef.current) return
          await avatarRef.current.speak({
            text: userInput,
            taskType: TaskType.TALK,
            taskMode: TaskMode.ASYNC,
          })
          return
        }

        // API-driven (gestor / bcg)
        // ✅ BCG: validar sesión lista ANTES de pedir a la API
        if (avatarType === "bcg-product") {
          const { bcgProduct } = useAvatarStore.getState()
          if (!bcgProduct?.conversationId || !bcgProduct?.selectedProduct) {
            // Si tu contexto soporta mensajes del asistente, muéstralo en el chat:
            try {
              addAssistantMessage?.(
                "Antes de empezar, selecciona un producto en el formulario de BCG.",
              )
            } catch {}
            // Además habla por voz, para mantener UX consistente:
            await avatarRef.current?.speak({
              text: "Antes de empezar, selecciona un producto en el formulario de BCG.",
              taskType: TaskType.REPEAT,
              taskMode: TaskMode.ASYNC,
            })
            return
          }
        }

        const service = getAvatarService(avatarType)
        const response = await service.sendMessage(userInput)
        if (!response || !avatarRef.current) return

        let textToSpeak = ""
        let imageBase64: string | undefined

        if (avatarType === "bcg-product") {
          const res = response as { response?: string; image_base64?: string }
          textToSpeak = res.response ?? ""
          imageBase64 = res.image_base64

          if (imageBase64) {
            const { addBCGImage, setImageModalOpen, setSelectedImage } =
              useAvatarStore.getState()

            // Guardar en store y abrir modal de una
            addBCGImage(imageBase64)
            setSelectedImage(imageBase64)
            setImageModalOpen(true)
          }
        } else {
          textToSpeak = (response as string) ?? ""
        }

        if (!textToSpeak) return

        // (Opcional) también mete la respuesta en el historial de chat,
        // con la imagen si llegó (si tu contexto lo soporta):
        try {
          addAssistantMessage?.(textToSpeak, imageBase64)
        } catch {}

        // Hablarlo con REPEAT
        const speakResult = avatarRef.current.speak({
          text: textToSpeak,
          taskType: TaskType.REPEAT,
          taskMode: TaskMode.ASYNC,
        })
        if (speakResult && typeof (speakResult as any).then === "function") {
          await speakResult
        }
      } catch (error) {
        console.error("❌ [useTextChat] Error:", error)
      }
    },
    [avatarRef, avatarType, addUserMessage, isAvatarTalking, addAssistantMessage],
  )

  // helpers
  const sendMessage = useCallback(
    (message: string) => {
      if (!avatarRef.current) return
      avatarRef.current.speak({
        text: message,
        taskType: TaskType.TALK,
        taskMode: TaskMode.ASYNC,
      })
    },
    [avatarRef],
  )

  const sendMessageSync = useCallback(
    async (message: string) => {
      if (!avatarRef.current) return
      return await avatarRef.current.speak({
        text: message,
        taskType: TaskType.TALK,
        taskMode: TaskMode.SYNC,
      })
    },
    [avatarRef],
  )

  const repeatMessage = useCallback(
    (message: string) => {
      if (!avatarRef.current) return
      return avatarRef.current.speak({
        text: message,
        taskType: TaskType.REPEAT,
        taskMode: TaskMode.ASYNC,
      })
    },
    [avatarRef],
  )

  const repeatMessageSync = useCallback(
    async (message: string) => {
      if (!avatarRef.current) return
      return await avatarRef.current.speak({
        text: message,
        taskType: TaskType.REPEAT,
        taskMode: TaskMode.SYNC,
      })
    },
    [avatarRef],
  )

  return { sendMessage, sendMessageSync, repeatMessage, repeatMessageSync, sendMessageToAPI }
}
