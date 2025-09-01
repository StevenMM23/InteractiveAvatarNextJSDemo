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

const DEFAULT_CONFIG: StartAvatarRequest = {
  quality: AvatarQuality.Low,
  avatarName: "ea745510dfc64dfc9afce9c443943828",
  knowledgeId: undefined,
  voice: {
    rate: 1.5,
    emotion: VoiceEmotion.EXCITED,
    model: ElevenLabsModel.eleven_flash_v2_5,
  },
  language: "en",
  voiceChatTransport: VoiceChatTransport.WEBSOCKET,
}

interface InteractiveAvatarProps {
  selectedDemo: DemoDefinition
  formData?: any
  onBack: () => void
}

function InteractiveAvatar({ selectedDemo, formData, onBack }: InteractiveAvatarProps) {
  const { initAvatar, startAvatar, stopAvatar, sessionState, stream } = useStreamingAvatarSession()
  const { startVoiceChat } = useVoiceChat()
  const { gestorCobranza, bcgProduct } = useAvatarStore()

  const [config, setConfig] = useState<StartAvatarRequest>(DEFAULT_CONFIG)
  const mediaStream = useRef<HTMLVideoElement>(null)

  const getCurrentSession = () => {
    switch (selectedDemo.id) {
      case "gestor-cobranza":
        return gestorCobranza
      case "bcg-product":
        return bcgProduct
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
    try {
      const response = await fetch("/api/get-access-token", {
        method: "POST",
      })
      const token = await response.text()

      console.log("[v0] Access Token:", token)
      console.log("[v0] Form Data:", formData)
      console.log("[v0] Current Session:", currentSession)

      return token
    } catch (error) {
      console.error("[v0] Error fetching access token:", error)
      throw error
    }
  }

  const startSessionV2 = useMemoizedFn(async (isVoiceChat: boolean) => {
    try {
      const newToken = await fetchAccessToken()
      const avatar = initAvatar(newToken)

      avatar.on(StreamingEvents.AVATAR_START_TALKING, (e) => {
        console.log("[v0] Avatar started talking", e)
      })
      avatar.on(StreamingEvents.AVATAR_STOP_TALKING, (e) => {
        console.log("[v0] Avatar stopped talking", e)
      })
      avatar.on(StreamingEvents.STREAM_DISCONNECTED, () => {
        console.log("[v0] Stream disconnected")
      })
      avatar.on(StreamingEvents.STREAM_READY, (event) => {
        console.log("[v0] >>>>> Stream ready:", event.detail)

        if (currentSession?.message) {
          console.log("[v0] Enviando mensaje inicial:", currentSession.message)
          avatar.speak({ text: currentSession.message })
        }
      })
      avatar.on(StreamingEvents.USER_START, (event) => {
        console.log("[v0] >>>>> User started talking:", event)
      })
      avatar.on(StreamingEvents.USER_STOP, (event) => {
        console.log("[v0] >>>>> User stopped talking:", event)
      })
      avatar.on(StreamingEvents.USER_END_MESSAGE, (event) => {
        console.log("[v0] >>>>> User end message:", event)
      })
      avatar.on(StreamingEvents.USER_TALKING_MESSAGE, (event) => {
        console.log("[v0] >>>>> User talking message:", event)
      })
      avatar.on(StreamingEvents.AVATAR_TALKING_MESSAGE, (event) => {
        console.log("[v0] >>>>> Avatar talking message:", event)
      })
      avatar.on(StreamingEvents.AVATAR_END_MESSAGE, (event) => {
        console.log("[v0] >>>>> Avatar end message:", event)
      })

      await startAvatar(config)

      if (isVoiceChat) {
        await startVoiceChat()
      }
    } catch (error) {
      console.error("[v0] Error starting avatar session:", error)
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
                  <Button onClick={onBack} className="text-sm px-3 py-1">
                    ← Volver
                  </Button>
                  <h2 className="text-white text-xl font-semibold">{selectedDemo.name}</h2>
                </div>

                {currentSession && (
                  <div className="bg-zinc-800 p-3 rounded-lg mb-4">
                    <h3 className="text-zinc-300 text-sm font-medium mb-2">Sesión Activa:</h3>
                    <div className="text-zinc-400 text-xs space-y-1">
                      <div>
                        <strong>Session ID:</strong> {currentSession.sessionId}
                      </div>
                      <div>
                        <strong>Mensaje inicial:</strong> {currentSession.message}
                      </div>
                      <div>
                        <strong>Timestamp:</strong> {new Date(currentSession.timestamp).toLocaleString()}
                      </div>
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
            <AvatarControls />
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
