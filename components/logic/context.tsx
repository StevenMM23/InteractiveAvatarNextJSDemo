"use client"

import type StreamingAvatar from "@heygen/streaming-avatar"
import {
  ConnectionQuality,
  type StreamingTalkingMessageEvent,
  type UserTalkingMessageEvent,
} from "@heygen/streaming-avatar"
import React, { useRef, useState } from "react"

export enum StreamingAvatarSessionState {
  INACTIVE = "inactive",
  CONNECTING = "connecting",
  CONNECTED = "connected",
}

export enum MessageSender {
  CLIENT = "CLIENT",
  AVATAR = "AVATAR",
}

export interface Message {
  id: string
  sender: MessageSender
  content: string
}

type StreamingAvatarContextProps = {
  avatarRef: React.MutableRefObject<StreamingAvatar | null>
  basePath?: string

  isMuted: boolean
  setIsMuted: (isMuted: boolean) => void
  isVoiceChatLoading: boolean
  setIsVoiceChatLoading: (isVoiceChatLoading: boolean) => void
  isVoiceChatActive: boolean
  setIsVoiceChatActive: (isVoiceChatActive: boolean) => void

  sessionState: StreamingAvatarSessionState
  setSessionState: (sessionState: StreamingAvatarSessionState) => void
  stream: MediaStream | null
  setStream: (stream: MediaStream | null) => void

  messages: Message[]
  clearMessages: () => void
  addUserMessage: (content: string) => void // Agregando función para agregar mensajes del usuario manualmente
  handleUserTalkingMessage: ({
    detail,
  }: {
    detail: UserTalkingMessageEvent
  }) => void
  handleStreamingTalkingMessage: ({
    detail,
  }: {
    detail: StreamingTalkingMessageEvent
  }) => void
  handleEndMessage: () => void

  isListening: boolean
  setIsListening: (isListening: boolean) => void
  isUserTalking: boolean
  setIsUserTalking: (isUserTalking: boolean) => void
  isAvatarTalking: boolean
  setIsAvatarTalking: (isAvatarTalking: boolean) => void

  connectionQuality: ConnectionQuality
  setConnectionQuality: (connectionQuality: ConnectionQuality) => void
}

const StreamingAvatarContext = React.createContext<StreamingAvatarContextProps>({
  avatarRef: { current: null },
  isMuted: true,
  setIsMuted: () => {},
  isVoiceChatLoading: false,
  setIsVoiceChatLoading: () => {},
  sessionState: StreamingAvatarSessionState.INACTIVE,
  setSessionState: () => {},
  isVoiceChatActive: false,
  setIsVoiceChatActive: () => {},
  stream: null,
  setStream: () => {},
  messages: [],
  clearMessages: () => {},
  addUserMessage: () => {}, // Agregando función vacía por defecto
  handleUserTalkingMessage: () => {},
  handleStreamingTalkingMessage: () => {},
  handleEndMessage: () => {},
  isListening: false,
  setIsListening: () => {},
  isUserTalking: false,
  setIsUserTalking: () => {},
  isAvatarTalking: false,
  setIsAvatarTalking: () => {},
  connectionQuality: ConnectionQuality.UNKNOWN,
  setConnectionQuality: () => {},
})

const useStreamingAvatarSessionState = () => {
  const [sessionState, setSessionState] = useState(StreamingAvatarSessionState.INACTIVE)
  const [stream, setStream] = useState<MediaStream | null>(null)

  return {
    sessionState,
    setSessionState,
    stream,
    setStream,
  }
}

const useStreamingAvatarVoiceChatState = () => {
  const [isMuted, setIsMuted] = useState(true)
  const [isVoiceChatLoading, setIsVoiceChatLoading] = useState(false)
  const [isVoiceChatActive, setIsVoiceChatActive] = useState(false)

  return {
    isMuted,
    setIsMuted,
    isVoiceChatLoading,
    setIsVoiceChatLoading,
    isVoiceChatActive,
    setIsVoiceChatActive,
  }
}

const useStreamingAvatarMessageState = () => {
  const [messages, setMessages] = useState<Message[]>([])
  const currentSenderRef = useRef<MessageSender | null>(null)

  const addUserMessage = (content: string) => {
    // Agregando función para agregar mensajes del usuario manualmente
    console.log("[v0] ✍️ MANUAL_USER_MESSAGE - Agregando:", content.substring(0, 50))

    currentSenderRef.current = MessageSender.CLIENT
    setMessages((prev) => [
      ...prev,
      {
        id: Date.now().toString(),
        sender: MessageSender.CLIENT,
        content: content,
      },
    ])
  }

  const handleUserTalkingMessage = ({
    detail,
  }: {
    detail: UserTalkingMessageEvent
  }) => {
    console.log("[v0] 📝 USER_MESSAGE - Recibido:", detail.message?.substring(0, 50))

    // Filtrar respuestas típicas de BCG que no deben aparecer como mensajes del usuario
    const bcgResponsePatterns = [
      "¿Cómo te puedo ayudar hoy?",
      "Elige un análisis a la vez",
      "Comparar ventas de todos los productos",
      "Ver las ventas anuales del producto",
      "Calcular tasa de crecimiento",
      "Obtener un reporte automático",
    ]

    const isBCGResponse = bcgResponsePatterns.some((pattern) => detail.message?.includes(pattern))

    if (isBCGResponse) {
      console.log("[v0] 🚫 USER_MESSAGE - Bloqueando respuesta de BCG como mensaje de usuario")
      return
    }

    if (currentSenderRef.current === MessageSender.CLIENT) {
      setMessages((prev) => [
        ...prev.slice(0, -1),
        {
          ...prev[prev.length - 1],
          content: [prev[prev.length - 1].content, detail.message].join(""),
        },
      ])
    } else {
      currentSenderRef.current = MessageSender.CLIENT
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now().toString(),
          sender: MessageSender.CLIENT,
          content: detail.message,
        },
      ])
    }
  }

  const handleStreamingTalkingMessage = ({
    detail,
  }: {
    detail: StreamingTalkingMessageEvent
  }) => {
    console.log("[v0] 🤖 AVATAR_MESSAGE - Recibido:", detail.message?.substring(0, 50))

    if (currentSenderRef.current === MessageSender.AVATAR) {
      setMessages((prev) => [
        ...prev.slice(0, -1),
        {
          ...prev[prev.length - 1],
          content: [prev[prev.length - 1].content, detail.message].join(""),
        },
      ])
    } else {
      currentSenderRef.current = MessageSender.AVATAR
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now().toString(),
          sender: MessageSender.AVATAR,
          content: detail.message,
        },
      ])
    }
  }

  const handleEndMessage = () => {
    currentSenderRef.current = null
  }

  return {
    messages,
    clearMessages: () => {
      setMessages([])
      currentSenderRef.current = null
    },
    addUserMessage, // Exportando la nueva función
    handleUserTalkingMessage,
    handleStreamingTalkingMessage,
    handleEndMessage,
  }
}

const useStreamingAvatarListeningState = () => {
  const [isListening, setIsListening] = useState(false)

  return { isListening, setIsListening }
}

const useStreamingAvatarTalkingState = () => {
  const [isUserTalking, setIsUserTalking] = useState(false)
  const [isAvatarTalking, setIsAvatarTalking] = useState(false)

  return {
    isUserTalking,
    setIsUserTalking,
    isAvatarTalking,
    setIsAvatarTalking,
  }
}

const useStreamingAvatarConnectionQualityState = () => {
  const [connectionQuality, setConnectionQuality] = useState(ConnectionQuality.UNKNOWN)

  return { connectionQuality, setConnectionQuality }
}

export const StreamingAvatarProvider = ({
  children,
  basePath,
}: {
  children: React.ReactNode
  basePath?: string
}) => {
  const avatarRef = React.useRef<StreamingAvatar>(null)
  const voiceChatState = useStreamingAvatarVoiceChatState()
  const sessionState = useStreamingAvatarSessionState()
  const messageState = useStreamingAvatarMessageState()
  const listeningState = useStreamingAvatarListeningState()
  const talkingState = useStreamingAvatarTalkingState()
  const connectionQualityState = useStreamingAvatarConnectionQualityState()

  return (
    <StreamingAvatarContext.Provider
      value={{
        avatarRef,
        basePath,
        ...voiceChatState,
        ...sessionState,
        ...messageState,
        ...listeningState,
        ...talkingState,
        ...connectionQualityState,
      }}
    >
      {children}
    </StreamingAvatarContext.Provider>
  )
}

export const useStreamingAvatarContext = () => {
  return React.useContext(StreamingAvatarContext)
}
