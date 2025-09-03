"use client";

import { ToggleGroup, ToggleGroupItem } from "@radix-ui/react-toggle-group";
import React, { useEffect, useState } from "react";

import { useVoiceChat } from "../logic/useVoiceChat";
import { Button } from "../Button";
import { useInterrupt } from "../logic/useInterrupt";
import { AudioInput } from "./AudioInput";
import { TextInput } from "./TextInput";
import { useAvatarStore } from "../../store/avatarStore";

export const AvatarControls: React.FC<{ avatarType: string }> = ({
  avatarType,
}) => {
  const { currentAvatarType } = useAvatarStore();
  const {
    isVoiceChatLoading,
    isVoiceChatActive,
    startVoiceChat,
    stopVoiceChat,
  } = useVoiceChat(avatarType);

  const { interrupt } = useInterrupt();

  // Estado local para controlar el toggle manualmente
  const [mode, setMode] = useState<"voice" | "text">("text");

  // 🔄 Sincronizamos el toggle con el estado real de voice chat
  useEffect(() => {
    if (isVoiceChatActive || isVoiceChatLoading) {
      setMode("voice");
    } else {
      setMode("text");
    }
  }, [isVoiceChatActive, isVoiceChatLoading]);

  return (
    <div className="flex flex-col gap-3 relative w-full items-center">
      <ToggleGroup
        className={`bg-zinc-700 rounded-lg p-1 ${
          isVoiceChatLoading ? "opacity-50" : ""
        }`}
        disabled={isVoiceChatLoading}
        type="single"
        value={mode}
        onValueChange={(value) => {
          if (!value) return;
          if (value === "voice" && !isVoiceChatActive && !isVoiceChatLoading) {
            startVoiceChat();
          } else if (
            value === "text" &&
            isVoiceChatActive &&
            !isVoiceChatLoading
          ) {
            stopVoiceChat();
          }
          setMode(value as "voice" | "text");
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

      {/* Input dinámico */}
      {mode === "voice" ? (
        <AudioInput avatarType={avatarType} />
      ) : (
        <TextInput avatarType={currentAvatarType || avatarType} />
      )}

      {/* Botón de interrupción */}
      <div className="absolute top-[-70px] right-3">
        <Button className="!bg-zinc-700 !text-white" onClick={interrupt}>
          Interrupt
        </Button>
      </div>
    </div>
  );
};
