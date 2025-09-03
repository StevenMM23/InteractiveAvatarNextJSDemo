"use client"

import { TaskMode, TaskType } from "@heygen/streaming-avatar"
import { useCallback } from "react"

import { useStreamingAvatarContext } from "./context"
import { getAvatarService } from "../../services/avatarServices"

export const useTextChat = (avatarType = "gestor-cobranza") => {
  const { avatarRef, addUserMessage, isAvatarTalking } = useStreamingAvatarContext()

  const sendMessageToAPI = useCallback(
    async (userInput: string) => {
      console.log("🎯 [useTextChat] ROUTER - avatarType:", avatarType)
      addUserMessage(userInput)

      // Interrumpe si el avatar ya está hablando
      if (isAvatarTalking) {
        try {
          await avatarRef.current?.interrupt()
        } catch (e) {
          console.warn("[useTextChat] interrupt error:", e)
        }
      }

      try {
        // 🌋/🟠 Knowledge-driven → TALK directo (SDK)
        const isKnowledge =
          avatarType === "volcano" ||
          avatarType === "gbm-onboarding" ||
          avatarType === "microsoft-services"

        if (isKnowledge) {
          if (!avatarRef.current) return
          console.log("[useTextChat] KNOWLEDGE - TALK via SDK")
          await avatarRef.current.speak({
            text: userInput,
            taskType: TaskType.TALK,
            taskMode: TaskMode.ASYNC,
          })
          return
        }

        // 🟢/🔵 API-driven → llamar servicio y REPEAT
        const service = getAvatarService(avatarType)
        const response = await service.sendMessage(userInput)

        if (!response || !avatarRef.current) return
        let textToSpeak = ""

        if (avatarType === "bcg-product") {
          textToSpeak = (response as { response: string })?.response ?? ""
        } else {
          textToSpeak = (response as string) ?? ""
        }

        if (!textToSpeak) return

        const speakResult = avatarRef.current.speak({
          text: textToSpeak,
          taskType: TaskType.REPEAT,
          taskMode: TaskMode.ASYNC,
        })
        if (speakResult && typeof (speakResult as any).then === "function") await speakResult
      } catch (error) {
        console.error("❌ [useTextChat] Error:", error)
      }
    },
    [avatarRef, avatarType, addUserMessage, isAvatarTalking],
  )

  // helpers
  const sendMessage = useCallback(
    (message: string) => {
      if (!avatarRef.current) return
      avatarRef.current.speak({ text: message, taskType: TaskType.TALK, taskMode: TaskMode.ASYNC })
    },
    [avatarRef],
  )

  const sendMessageSync = useCallback(
    async (message: string) => {
      if (!avatarRef.current) return
      return await avatarRef.current.speak({ text: message, taskType: TaskType.TALK, taskMode: TaskMode.SYNC })
    },
    [avatarRef],
  )

  const repeatMessage = useCallback(
    (message: string) => {
      if (!avatarRef.current) return
      return avatarRef.current.speak({ text: message, taskType: TaskType.REPEAT, taskMode: TaskMode.ASYNC })
    },
    [avatarRef],
  )

  const repeatMessageSync = useCallback(
    async (message: string) => {
      if (!avatarRef.current) return
      return await avatarRef.current.speak({ text: message, taskType: TaskType.REPEAT, taskMode: TaskMode.SYNC })
    },
    [avatarRef],
  )

  return { sendMessage, sendMessageSync, repeatMessage, repeatMessageSync, sendMessageToAPI }
}
