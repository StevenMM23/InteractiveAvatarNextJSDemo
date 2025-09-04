"use client"

import { forwardRef } from "react"
import { ConnectionQuality } from "@heygen/streaming-avatar"

import { useConnectionQuality, useStreamingAvatarSession, StreamingAvatarSessionState } from "@/components/logic"
import { CloseIcon } from "../Icons"
import { Button } from "../Button"
import { useAvatarStore } from "@/store/avatarStore"

export const AvatarVideo = forwardRef<HTMLVideoElement>(({ }, ref) => {
  const { sessionState, stopAvatar } = useStreamingAvatarSession()
  const { connectionQuality } = useConnectionQuality()
  const { isImmersive } = useAvatarStore() // 🔹 estado global

  const isLoaded = sessionState === StreamingAvatarSessionState.CONNECTED

  return (
    <>
      {/* {connectionQuality !== ConnectionQuality.UNKNOWN && (
        // <div className="absolute top-3 left-3 bg-black/70 text-white rounded-lg px-3 py-2 text-sm">
        //   Calidad: {connectionQuality}
        // </div>
      )} */}

      {isLoaded && (
        <Button
          className="absolute top-3 right-3 !p-2 bg-zinc-700/70 text-white rounded-full z-10 hover:bg-zinc-600"
          onClick={stopAvatar}
        >
          <CloseIcon />
        </Button>
      )}

      <video
        ref={ref}
        autoPlay
        playsInline
        style={{
          width: "100%",
          height: "100%",
          
        }}
      >
        <track kind="captions" />
      </video>

      {!isLoaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/80">
          Loading...
        </div>
      )}
    </>
  )
})
AvatarVideo.displayName = "AvatarVideo"
