"use client"

import { TaskMode, TaskType } from "@heygen/streaming-avatar"
import { useCallback } from "react"

import { useStreamingAvatarContext } from "./context"
import { getAvatarService } from "../../services/avatarServices"
import { useAvatarStore } from "../../store/avatarStore"

export const useTextChat = (avatarType = "gestor-cobranza") => {
  const { avatarRef, addUserMessage, isAvatarTalking } = useStreamingAvatarContext()
  const { getSession } = useAvatarStore()

  const sendMessageToAPI = useCallback(
    async (userInput: string) => {
      console.log("🎯 [useTextChat] ROUTER - Avatar Type:", avatarType)
      console.log("📝 [useTextChat] USER_INPUT:", userInput)

      console.log("✍️ [useTextChat] ADDING_USER_MESSAGE_TO_HISTORY:", userInput)
      addUserMessage(userInput)

      if (isAvatarTalking) {
        console.log("⚠️ [useTextChat] INTERRUPTION - Avatar está hablando, interrumpiendo...")
        try {
          if (avatarRef?.current) {
            await avatarRef.current.interrupt()
            console.log("✅ [useTextChat] INTERRUPTION - Avatar interrumpido exitosamente")
          }
        } catch (interruptError) {
          console.error("❌ [useTextChat] INTERRUPTION_ERROR:", interruptError)
        }
      }

      try {
        const service = getAvatarService(avatarType)
        console.log("🔧 [useTextChat] SERVICE_SELECTED:", service.constructor.name)

        console.log("📤 [useTextChat] CALLING_SERVICE.sendMessage with:", userInput)
        const response = await service.sendMessage(userInput)
        console.log("📥 [useTextChat] API_RESPONSE:", response)
        console.log("📥 [useTextChat] API_RESPONSE_TYPE:", typeof response)

        if (!response) {
          console.log("❌ [useTextChat] NO_RESPONSE - Avatar will not speak")
          return
        }

        let textToSpeak = ""

        if (avatarType === "bcg-product") {
          console.log("🔵 [useTextChat] BCG_FLOW - Processing response as BCG")
          const bcgResponse = response as { response: string }
          textToSpeak = bcgResponse.response
          console.log("🔵 [useTextChat] BCG_FLOW - Extracted text:", textToSpeak?.substring(0, 100) + "...")
        } else {
          console.log("🟢 [useTextChat] GESTOR_FLOW - Processing response as Gestor")
          textToSpeak = response as string
          console.log("🟢 [useTextChat] GESTOR_FLOW - Text to speak:", textToSpeak?.substring(0, 100) + "...")
        }

        console.log("🗣️ [useTextChat] AVATAR_WILL_SPEAK:", textToSpeak?.substring(0, 100) + "...")

        console.log("🔍 [useTextChat] DEBUG - avatarRef:", !!avatarRef)
        console.log("🔍 [useTextChat] DEBUG - avatarRef.current:", !!avatarRef?.current)
        console.log("🔍 [useTextChat] DEBUG - textToSpeak length:", textToSpeak?.length)

        console.log("⏳ [useTextChat] DELAY - Esperando 500ms antes de avatar.speak()")
        await new Promise((resolve) => setTimeout(resolve, 500))

        if (avatarRef?.current && textToSpeak) {
          try {
            console.log("🎤 [useTextChat] CALLING_AVATAR.speak with TaskType.REPEAT")
            console.log("   - text length:", textToSpeak.length)
            console.log("   - taskType: REPEAT (para repetir respuesta de API)")

            const speakResult = avatarRef.current.speak({
              text: textToSpeak,
              taskType: TaskType.REPEAT,
              taskMode: TaskMode.ASYNC,
            })

            console.log("🎤 [useTextChat] avatar.speak() returned:", speakResult)
            console.log("✅ [useTextChat] AVATAR.speak called successfully with REPEAT")

            if (speakResult && typeof speakResult.then === "function") {
              console.log("🎤 [useTextChat] avatar.speak() returned a promise, awaiting...")
              await speakResult
              console.log("✅ [useTextChat] avatar.speak() promise resolved")
            }
          } catch (speakError) {
            console.error("❌ [useTextChat] AVATAR.speak ERROR:", speakError)
          }
        } else {
          console.log("❌ [useTextChat] Cannot speak - missing requirements")
        }
      } catch (error) {
        console.error("❌ [useTextChat] API_ERROR:", error)
      }
    },
    [avatarRef, avatarType, addUserMessage, isAvatarTalking],
  )

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

      return await avatarRef.current?.speak({
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

      return avatarRef.current?.speak({
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

      return await avatarRef.current?.speak({
        text: message,
        taskType: TaskType.REPEAT,
        taskMode: TaskMode.SYNC,
      })
    },
    [avatarRef],
  )

  return {
    sendMessage,
    sendMessageSync,
    repeatMessage,
    repeatMessageSync,
    sendMessageToAPI,
  }
}
