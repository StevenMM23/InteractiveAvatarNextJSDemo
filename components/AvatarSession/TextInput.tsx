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
  avatarType: string
}

export const TextInput: React.FC<TextInputProps> = ({ avatarType }) => {
  const { currentAvatarType, setCurrentAvatarType } = useAvatarStore()

  useEffect(() => {
    if (avatarType && avatarType !== currentAvatarType) {
      setCurrentAvatarType(avatarType as any)
    }
  }, [avatarType, currentAvatarType, setCurrentAvatarType])

  const { sendMessageToAPI } = useTextChat(avatarType as any)
  const { startListening, stopListening } = useConversationState()
  const [message, setMessage] = useState("")

  const handleSend = useCallback(async () => {
    const trimmed = message.trim()
    if (!trimmed) return
    setMessage("")
    await sendMessageToAPI(trimmed)
  }, [message, sendMessageToAPI])

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

  const prev = usePrevious(message)
  useEffect(() => {
    if (!prev && message) startListening()
    else if (prev && !message) stopListening()
  }, [message, prev, startListening, stopListening])

  return (
    <div className="flex flex-row items-center gap-3 w-full">
      <Input
        className="flex-1 px-4 py-4 text-lg rounded-xl border border-border 
                   bg-background text-foreground placeholder:text-muted-foreground 
                   focus:ring-2 focus:ring-primary focus:outline-none"
        placeholder={`Escribe tu mensaje`}
        value={message}
        onChange={setMessage}
      />
      <Button
        onClick={handleSend}
        disabled={!message.trim()}
        className="w-14 h-14 rounded-full flex items-center justify-center
                   bg-primary text-primary-foreground 
                   hover:bg-primary/90 hover:ring-4 hover:ring-primary/40
                   transition-all duration-300"
      >
        <SendIcon size={28} />
      </Button>
    </div>
  )
}
