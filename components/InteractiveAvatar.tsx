"use client"

import {
  AvatarQuality,
  StreamingEvents,
  VoiceChatTransport,
  VoiceEmotion,
  type StartAvatarRequest,
  ElevenLabsModel,
} from "@heygen/streaming-avatar"
import { useEffect, useMemo, useRef, useState } from "react"
import { useMemoizedFn, useUnmount } from "ahooks"

import { AvatarVideo } from "./AvatarSession/AvatarVideo"
import { useStreamingAvatarSession } from "./logic/useStreamingAvatarSession"
import { useVoiceChat } from "./logic/useVoiceChat"
import { StreamingAvatarProvider, StreamingAvatarSessionState } from "./logic/context"
import { LoadingIcon } from "./Icons"
import type { DemoDefinition } from "../types/demo"
import { useAvatarStore } from "../store/avatarStore"
import { ImageModal } from "./ImageModal"

import { AvatarHeader } from "./AvatarSession/AvatarHeader"
import { StartButtons } from "./AvatarSession/StartButtons"
import { AdvancedSettings } from "./AvatarSession/AdvanceSettings"
import { ChatSidebar } from "./AvatarSession/ChatSidebar"
import { FloatingControls } from "./AvatarSession/FloatingControls"

const TAG = "[InteractiveAvatar]"

const DEFAULT_CONFIG: StartAvatarRequest = {
  quality: AvatarQuality.High,
  avatarName: "ea745510dfc64dfc9afce9c443943828",
  knowledgeId: undefined,
  voice: {
    rate: 1.5,
    emotion: VoiceEmotion.EXCITED,
    model: ElevenLabsModel.eleven_flash_v2_5,
  },
  language: "es",
  voiceChatTransport: VoiceChatTransport.WEBSOCKET,
}

const AVATAR_IDS = {
  "gestor-cobranza": "ea745510dfc64dfc9afce9c443943828",
  "bcg-product": "7f53aab9ad9848248caf19ef21aa3b3e",
  volcano: "7f53aab9ad9848248caf19ef21aa3b3e",
  "gbm-onboarding": "ea745510dfc64dfc9afce9c443943828",
  "microsoft-services": "7f53aab9ad9848248caf19ef21aa3b3e",
  "gbm-information": "7f53aab9ad9848248caf19ef21aa3b3e",
} as const

const KNOWLEDGE_IDS: Partial<Record<keyof typeof AVATAR_IDS, string | undefined>> = {
  volcano: "9f09452d95724ae28de9e474d23f0825",
  "gbm-onboarding": "c143998195c945e9b58e29fab7759d49",
  "microsoft-services": "c21c8ab19b5945359f439dde3481062c",
  "gbm-information": "b7db08cfa96547b095cd3931570fc03a",
}

interface InteractiveAvatarProps {
  selectedDemo: DemoDefinition
  formData?: any
  onBack: () => void
}

function InteractiveAvatar({ selectedDemo, onBack }: InteractiveAvatarProps) {
  const { initAvatar, startAvatar, stopAvatar, sessionState, stream } = useStreamingAvatarSession()
  const { currentAvatarType, setCurrentAvatarType, getSession } = useAvatarStore()
  const [isChatOpen, setIsChatOpen] = useState(false)

  useEffect(() => {
    setCurrentAvatarType(selectedDemo.id)
    console.log(`${TAG} setCurrentAvatarType →`, selectedDemo.id)
    return () => setCurrentAvatarType(null)
  }, [selectedDemo.id, setCurrentAvatarType])

  // Pasa SIEMPRE el id del avatar actual
  const { startVoiceChat, isMuted, muteInputAudio, unmuteInputAudio, stopVoiceChat } =
    useVoiceChat(selectedDemo.id)

  const handleToggleMute = () => {
    console.log(`${TAG} toggle mute → next=${!isMuted}`)
    isMuted ? unmuteInputAudio() : muteInputAudio()
  }

  const [config, setConfig] = useState<StartAvatarRequest>({
    ...DEFAULT_CONFIG,
    avatarName: AVATAR_IDS[selectedDemo.id as keyof typeof AVATAR_IDS] || DEFAULT_CONFIG.avatarName,
    knowledgeId: KNOWLEDGE_IDS[selectedDemo.id as keyof typeof AVATAR_IDS],
  })

  const mediaStream = useRef<HTMLVideoElement>(null)
  const currentSession = getSession(selectedDemo.id)

  const handleLanguageChange = (language: string) => setConfig((p) => ({ ...p, language }))
  const handleQualityChange = (quality: AvatarQuality) => setConfig((p) => ({ ...p, quality }))
  const handleTransportChange = (t: VoiceChatTransport) => setConfig((p) => ({ ...p, voiceChatTransport: t }))

  async function fetchAccessToken() {
    const response = await fetch("/api/get-access-token", { method: "POST" })
    return response.text()
  }

  useEffect(() => {
    const onRouteAway = () => { try { stopVoiceChat() } catch { } }
    window.addEventListener("pagehide", onRouteAway)
    window.addEventListener("beforeunload", onRouteAway)
    return () => {
      window.removeEventListener("pagehide", onRouteAway)
      window.removeEventListener("beforeunload", onRouteAway)
    }
  }, [stopVoiceChat])

  const cleanupFnsRef = useRef<(() => void)[]>([])

  const startSessionV2 = useMemoizedFn(async () => {
    try {
      console.log(`${TAG} startSessionV2 → id=${selectedDemo.id}`)
      const token = await fetchAccessToken()
      const avatar = initAvatar(token)

      const waitStreamReady = new Promise<void>((resolve) => {
        const onReady = () => { console.log(`${TAG} STREAM_READY`); resolve() }
        avatar.on(StreamingEvents.STREAM_READY, onReady)
        cleanupFnsRef.current.push(() => avatar.off(StreamingEvents.STREAM_READY, onReady))
      })

      const onStreamReadySpeak = async () => {
        if (currentSession?.message) {
          try { await avatar.speak({ text: currentSession.message }) } catch { }
        }
      }
      avatar.on(StreamingEvents.STREAM_READY, onStreamReadySpeak)
      cleanupFnsRef.current.push(() =>
        avatar.off(StreamingEvents.STREAM_READY, onStreamReadySpeak),
      )

      await startAvatar(config)

      // Arrancar voice chat del SDK ASAP cuando haya stream
      await waitStreamReady
      await startVoiceChat()
    } catch (error) {
      console.error(`${TAG} Error starting session:`, error)
    }
  })

  useUnmount(() => {
    try { stopVoiceChat() } catch { }
    try { stopAvatar() } catch { }
    try { cleanupFnsRef.current.forEach((fn) => fn()) } catch { }
    cleanupFnsRef.current = []
  })

  const handleBack = useMemoizedFn(async () => {
    try { stopVoiceChat() } catch { }
    try { stopAvatar() } catch { }
    try { cleanupFnsRef.current.forEach((fn) => fn()) } catch { }
    cleanupFnsRef.current = []
    onBack()
  })

  useEffect(() => {
    if (stream && mediaStream.current) {
      mediaStream.current.srcObject = stream
      mediaStream.current.onloadedmetadata = () => {
        mediaStream.current?.play().catch(() => { })
      }
    }
  }, [stream])

  return (
    <div className="relative w-full h-full bg-background overflow-hidden">
      {sessionState === StreamingAvatarSessionState.INACTIVE ? (
        <div className="p-8">
          <AvatarHeader selectedDemo={selectedDemo} onBack={onBack} />
        </div>
      ) : (
        <div className="absolute top-4 left-6 z-20 bg-black/40 px-4 py-2 rounded-lg">
          <h2 className="text-lg lg:text-2xl font-bold text-white drop-shadow-md">
            {selectedDemo.name}
          </h2>
        </div>
      )}

      <div className="flex h-full">
        <div className="flex-1 flex items-center justify-center">
          {sessionState !== StreamingAvatarSessionState.INACTIVE ? (
            <AvatarVideo ref={mediaStream} />
          ) : (
            <div className="flex flex-col gap-12 w-full max-w-5xl mx-auto py-16 px-12 items-center justify-center">
              <AdvancedSettings
                config={{
                  language: config.language,
                  quality: config.quality,
                  voiceChatTransport: config.voiceChatTransport,
                }}
                onLanguageChange={handleLanguageChange}
                onQualityChange={handleQualityChange}
                onTransportChange={handleTransportChange}
              />
              <StartButtons onStart={() => startSessionV2()} />
            </div>
          )}

          {sessionState === StreamingAvatarSessionState.CONNECTING && (
            <div className="absolute inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center">
              <div className="flex flex-col items-center gap-6">
                <LoadingIcon className="w-16 h-16 text-primary" />
                <p className="text-foreground text-xl">Iniciando avatar...</p>
              </div>
            </div>
          )}
        </div>

        <ChatSidebar
          isOpen={isChatOpen}
          onToggle={() => setIsChatOpen((prev) => !prev)}
        />
      </div>

      {sessionState === StreamingAvatarSessionState.CONNECTED && (
        <FloatingControls
          isMuted={isMuted}
          onToggleMute={handleToggleMute}
          onBack={handleBack}
          onToggleChat={() => setIsChatOpen((prev) => !prev)}
          isChatOpen={isChatOpen}
          avatarType={selectedDemo.id}
        />
      )}
    </div>
  )
}

export default function InteractiveAvatarWrapper({
  selectedDemo,
  formData,
  onBack,
}: InteractiveAvatarProps) {
  const { isImageModalOpen, generatedImages } = useAvatarStore()

  return (
    <StreamingAvatarProvider basePath={process.env.NEXT_PUBLIC_BASE_API_URL}>
      <InteractiveAvatar selectedDemo={selectedDemo} formData={formData} onBack={onBack} />
      {isImageModalOpen && generatedImages.length > 0 && (
        <ImageModal imageBase64={generatedImages.at(-1)!} />
      )}
    </StreamingAvatarProvider>
  )
}
