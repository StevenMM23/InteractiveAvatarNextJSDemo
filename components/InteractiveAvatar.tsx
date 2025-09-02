"use client"

import {
  AvatarQuality,
  StreamingEvents,
  VoiceChatTransport,
  VoiceEmotion,
  type StartAvatarRequest,
  ElevenLabsModel,
} from "@heygen/streaming-avatar"
import { useEffect, useRef, useState } from "react"
import { useMemoizedFn, useUnmount } from "ahooks"

import { Button } from "./Button"
import { AvatarVideo } from "./AvatarSession/AvatarVideo"
import { useStreamingAvatarSession } from "./logic/useStreamingAvatarSession"
import { useVoiceChat } from "./logic/useVoiceChat"
import { StreamingAvatarProvider, StreamingAvatarSessionState } from "./logic/context"
import { AvatarControls } from "./AvatarSession/AvatarControls"
import { LoadingIcon } from "./Icons"
import { MessageHistory } from "./AvatarSession/MessageHistory"
import { Select } from "./Select"
import type { DemoDefinition } from "../types/demo"
import { useAvatarStore } from "../store/avatarStore"

import { STT_LANGUAGE_LIST } from "../app/lib/constants"

// =====================
// CONFIG
// =====================

const DEFAULT_CONFIG: StartAvatarRequest = {
  quality: AvatarQuality.Low,
  avatarName: "ea745510dfc64dfc9afce9c443943828", // Default avatar ID (el mismo que usas en otros)
  knowledgeId: undefined,
  voice: {
    rate: 1.5,
    emotion: VoiceEmotion.EXCITED,
    model: ElevenLabsModel.eleven_flash_v2_5,
  },
  language: "en",
  voiceChatTransport: VoiceChatTransport.WEBSOCKET,
}

/** 👇 Registramos los avatares disponibles en UI */
const AVATAR_IDS = {
  "gestor-cobranza": "ea745510dfc64dfc9afce9c443943828",
  "bcg-product": "ea745510dfc64dfc9afce9c443943828",
  // 👇 Nuevo avatar Volcano (usa el mismo avatarName, lo importante es el knowledgeId)
  volcano: "ea745510dfc64dfc9afce9c443943828",
} as const

/** 👇 Knowledge IDs por avatar “knowledge-driven” */
const KNOWLEDGE_IDS: Partial<Record<keyof typeof AVATAR_IDS, string | undefined>> = {
  volcano: "9f09452d95724ae28de9e474d23f0825", // 👈 Volcano KB
  // otros avatares con knowledge en el futuro...
}

interface InteractiveAvatarProps {
  selectedDemo: DemoDefinition
  formData?: any
  onBack: () => void
}

function InteractiveAvatar({ selectedDemo, formData, onBack }: InteractiveAvatarProps) {
  const { initAvatar, startAvatar, stopAvatar, sessionState, stream } = useStreamingAvatarSession()
  const { startVoiceChat } = useVoiceChat()
  const { gestorCobranza, bcgProduct, volcano, setCurrentAvatarType, clearAllSessions } = useAvatarStore()
  useEffect(() => {
    setCurrentAvatarType(selectedDemo.id as "gestor-cobranza" | "bcg-product" | "volcano")
  }, [selectedDemo.id, setCurrentAvatarType])

 
  // Config inicial: avatarName y knowledgeId según selectedDemo.id
  const [config, setConfig] = useState<StartAvatarRequest>({
    ...DEFAULT_CONFIG,
    avatarName: AVATAR_IDS[selectedDemo.id as keyof typeof AVATAR_IDS] || DEFAULT_CONFIG.avatarName,
    knowledgeId: KNOWLEDGE_IDS[selectedDemo.id as keyof typeof AVATAR_IDS],
  })

  const mediaStream = useRef<HTMLVideoElement>(null)

  const getCurrentSession = () => {
    switch (selectedDemo.id) {
      case "gestor-cobranza":
        return gestorCobranza
      case "bcg-product":
        return bcgProduct
      case "volcano":
        return volcano
      default:
        return null
    }
  }

  const currentSession = getCurrentSession()

  const handleLanguageChange = (language: string) => {
    setConfig((prev) => ({ ...prev, language }))
  }

  const handleQualityChange = (quality: AvatarQuality) => {
    setConfig((prev) => ({ ...prev, quality }))
  }

  const handleTransportChange = (transport: VoiceChatTransport) => {
    setConfig((prev) => ({ ...prev, voiceChatTransport: transport }))
  }

  async function fetchAccessToken() {
    const response = await fetch("/api/get-access-token", { method: "POST" })
    const token = await response.text()
    return token
  }

  const startSessionV2 = useMemoizedFn(async (isVoiceChat: boolean) => {
    try {
      const newToken = await fetchAccessToken()
      const avatar = initAvatar(newToken)

      avatar.on(StreamingEvents.AVATAR_START_TALKING, (e) => {
        console.log("[Avatar] start talking", e)
      })
      avatar.on(StreamingEvents.AVATAR_STOP_TALKING, (e) => {
        console.log("[Avatar] stop talking", e)
      })
      avatar.on(StreamingEvents.STREAM_DISCONNECTED, () => {
        console.log("[Avatar] Stream disconnected")
      })
      avatar.on(StreamingEvents.STREAM_READY, async () => {
        // Si tienes un mensaje de bienvenida por sesión, puedes hablarlo:
        if (currentSession?.message) {
          avatar.speak({ text: currentSession.message })
        }
      })

      await startAvatar(config)

      if (isVoiceChat) {
        await startVoiceChat()
      }
    } catch (error) {
      console.error("[Avatar] Error starting session:", error)
    }
  })

  useUnmount(() => {
    stopAvatar()
  })

  useEffect(() => {
    if (stream && mediaStream.current) {
      mediaStream.current.srcObject = stream
      mediaStream.current.onloadedmetadata = () => {
        mediaStream.current!.play()
      }
    }
  }, [mediaStream, stream])

  return (
    <div className="w-full flex flex-col gap-4">
      <div className="flex flex-col rounded-xl bg-zinc-900 overflow-hidden">
        <div className="relative w-full aspect-video overflow-hidden flex flex-col items-center justify-center">
          {sessionState !== StreamingAvatarSessionState.INACTIVE ? (
            <AvatarVideo ref={mediaStream} />
          ) : (
            <div className="flex flex-col gap-4 w-full py-8 px-4 items-center">
              <div className="flex flex-col gap-4 w-[400px]">
                <div className="flex items-center gap-3 mb-4">
                  <Button onClick={onBack} className="text-sm px-3 py-1">← Volver</Button>
                  <h2 className="text-white text-xl font-semibold">{selectedDemo.name}</h2>
                </div>

                {currentSession && (
                  <div className="bg-zinc-800 p-3 rounded-lg mb-4">
                    <h3 className="text-zinc-300 text-sm font-medium mb-2">Sesión Activa:</h3>
                    <div className="text-zinc-400 text-xs space-y-1">
                      <div><strong>Tipo:</strong> {selectedDemo.id}</div>
                      <div><strong>Session ID:</strong> {currentSession.sessionId}</div>
                      {"knowledgeId" in currentSession && (
                        <div><strong>Knowledge ID:</strong> {(currentSession as any).knowledgeId}</div>
                      )}
                      <div><strong>Mensaje inicial:</strong> {currentSession.message}</div>
                      <div><strong>Timestamp:</strong> {new Date(currentSession.timestamp).toLocaleString()}</div>
                    </div>
                  </div>
                )}

                {formData && (
                  <div className="bg-zinc-800 p-3 rounded-lg mb-4">
                    <h3 className="text-zinc-300 text-sm font-medium mb-2">Datos del formulario:</h3>
                    <pre className="text-zinc-400 text-xs overflow-auto">{JSON.stringify(formData, null, 2)}</pre>
                  </div>
                )}

                <div className="flex flex-col gap-2">
                  <label className="text-zinc-300 text-sm">Idioma</label>
                  <Select
                    isSelected={(option) => option.value === config.language}
                    options={STT_LANGUAGE_LIST}
                    renderOption={(option) => option.label}
                    value={STT_LANGUAGE_LIST.find((option) => option.value === config.language)?.label}
                    onSelect={(option) => handleLanguageChange(option.value)}
                  />
                </div>

                <div className="flex flex-col gap-2">
                  <label className="text-zinc-300 text-sm">Calidad de Video</label>
                  <Select
                    isSelected={(option) => option === config.quality}
                    options={Object.values(AvatarQuality)}
                    renderOption={(option) => option}
                    value={config.quality}
                    onSelect={(option) => handleQualityChange(option)}
                  />
                </div>

                <div className="flex flex-col gap-2">
                  <label className="text-zinc-300 text-sm">Transporte de Voz</label>
                  <Select
                    isSelected={(option) => option === config.voiceChatTransport}
                    options={Object.values(VoiceChatTransport)}
                    renderOption={(option) => option}
                    value={config.voiceChatTransport}
                    onSelect={(option) => handleTransportChange(option)}
                  />
                </div>
              </div>
            </div>
          )}
        </div>
        <div className="flex flex-col gap-3 items-center justify-center p-4 border-t border-zinc-700 w-full">
          {sessionState === StreamingAvatarSessionState.CONNECTED ? (
            <AvatarControls  />
          ) : sessionState === StreamingAvatarSessionState.INACTIVE ? (
            <div className="flex flex-row gap-4">
              <Button onClick={() => startSessionV2(true)}>Iniciar Chat de Voz</Button>
              <Button onClick={() => startSessionV2(false)}>Iniciar Chat de Texto</Button>
            </div>
          ) : (
            <LoadingIcon />
          )}
        </div>
      </div>
      {sessionState === StreamingAvatarSessionState.CONNECTED && <MessageHistory />}
    </div>
  )
}

export default function InteractiveAvatarWrapper({ selectedDemo, formData, onBack }: InteractiveAvatarProps) {
  return (
    <StreamingAvatarProvider basePath={process.env.NEXT_PUBLIC_BASE_API_URL}>
      <InteractiveAvatar selectedDemo={selectedDemo} formData={formData} onBack={onBack} />
    </StreamingAvatarProvider>
  )
}
