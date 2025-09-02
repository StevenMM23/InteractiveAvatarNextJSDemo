"use client"

import { ToggleGroup, ToggleGroupItem } from "@radix-ui/react-toggle-group"
import type React from "react"

import { useVoiceChat } from "../logic/useVoiceChat"
import { Button } from "../Button"
import { useInterrupt } from "../logic/useInterrupt"

import { AudioInput } from "./AudioInput"
import { TextInput } from "./TextInput"
import { useAvatarStore } from "../../store/avatarStore"

export const AvatarControls: React.FC = () => {
  // 👇 Leemos y seteamos el avatar seleccionado desde el store
  const { currentAvatarType, setCurrentAvatarType } = useAvatarStore()
  const { isVoiceChatLoading, isVoiceChatActive, startVoiceChat, stopVoiceChat } =
    useVoiceChat()
  const { interrupt } = useInterrupt()

  return (
    <div className="flex flex-col gap-3 relative w-full items-center">
      <ToggleGroup
        className={`bg-zinc-700 rounded-lg p-1 ${isVoiceChatLoading ? "opacity-50" : ""}`}
        disabled={isVoiceChatLoading}
        type="single"
        value={isVoiceChatActive || isVoiceChatLoading ? "voice" : "text"}
        onValueChange={(value) => {
          if (value === "voice" && !isVoiceChatActive && !isVoiceChatLoading) {
            startVoiceChat()
          } else if (value === "text" && isVoiceChatActive && !isVoiceChatLoading) {
            stopVoiceChat()
          }
        }}
      >
        <ToggleGroupItem
          className="data-[state=on]:bg-zinc-800 rounded-lg p-2 text-sm w-[90px] text-center"
          value="voice"
        >
          Voice Chat
        </ToggleGroupItem>
        <ToggleGroupItem
          className="data-[state=on]:bg-zinc-800 rounded-lg p-2 text-sm w-[90px] text-center"
          value="text"
        >
          Text Chat
        </ToggleGroupItem>
      </ToggleGroup>

      {/* 👇 Renderizamos input según modo */}
      {isVoiceChatActive || isVoiceChatLoading ? (
        <AudioInput />
      ) : (
        <TextInput avatarType={currentAvatarType || "gestor-cobranza"} />
      )}

      <div className="absolute top-[-70px] right-3">
        <Button className="!bg-zinc-700 !text-white" onClick={interrupt}>
          Interrupt
        </Button>
      </div>
    </div>
  )
}
