"use client"

import type React from "react"
import { useCallback, useEffect, useState } from "react"
import { usePrevious } from "ahooks"

import { Button } from "../Button"
import { SendIcon } from "../Icons"
import { useTextChat } from "../logic/useTextChat"
import { Input } from "../Input"
import { useConversationState } from "../logic/useConversationState"
import { useAvatarStore } from "@/store/avatarStore"


interface TextInputProps {
  /** "gestor-cobranza" | "bcg-product" | "volcano" */
  avatarType: string
}

export const TextInput: React.FC<TextInputProps> = ({ avatarType }) => {
  // 🟣 Store: sincronizamos avatarType global
  const { currentAvatarType, setCurrentAvatarType } = useAvatarStore()

  // Si cambia el prop, actualizamos el store
  useEffect(() => {
    if (avatarType && avatarType !== currentAvatarType) {
      setCurrentAvatarType(avatarType as any)
    }
  }, [avatarType, currentAvatarType, setCurrentAvatarType])

  // 👇 Router: Volcano => TALK (SDK), Gestor/BCG => REPEAT (API)
  const { sendMessageToAPI } = useTextChat(avatarType as any)
  const { startListening, stopListening } = useConversationState()
  const [message, setMessage] = useState("")

  const handleSend = useCallback(async () => {
    const trimmed = message.trim()
    if (!trimmed) return

    // 🔹 UX: limpiar input INMEDIATAMENTE para sensación de rapidez
    setMessage("")

    // 🔹 El hook agrega el mensaje al historial y enruta TALK/REPEAT según avatarType
    await sendMessageToAPI(trimmed)
  }, [message, sendMessageToAPI])

  // Enter para enviar
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Enter") {
        e.preventDefault()
        handleSend()
      }
    }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [handleSend])

  // Mantener indicadores de “escuchando” si quieres animaciones de UI
  const prev = usePrevious(message)
  useEffect(() => {
    if (!prev && message) startListening()
    else if (prev && !message) stopListening()
  }, [message, prev, startListening, stopListening])

  return (
    <div className="flex flex-row gap-2 items-end w-full">
      <Input
        className="min-w-[500px]"
        placeholder={`Escribe tu mensaje para ${avatarType}…`}
        value={message}
        onChange={setMessage}
      />
      <Button className="!p-2" onClick={handleSend} disabled={!message.trim()}>
        <SendIcon size={20} />
      </Button>
    </div>
  )
}
