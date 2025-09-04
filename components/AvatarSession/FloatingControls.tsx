"use client"

import React from "react"
import { Mic, MicOff, ArrowLeft, MessageCircle, Zap } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useInterrupt } from "../logic/useInterrupt"

interface FloatingControlsProps {
    isMuted: boolean
    onToggleMute: () => void
    onBack: () => void
    onToggleChat: () => void
    isChatOpen: boolean
    avatarType: string
}

export const FloatingControls: React.FC<FloatingControlsProps> = ({
    isMuted,
    onToggleMute,
    onBack,
    onToggleChat,
    isChatOpen,
}) => {
    const { interrupt } = useInterrupt()

    return (
        <div className="fixed bottom-10 left-1/2 -translate-x-1/2 z-50">
            <div className="flex gap-12 bg-background/90 backdrop-blur-xl px-12 py-6 rounded-3xl border border-border shadow-2xl">
                {/* Volver */}
                <ControlButton
                    onClick={onBack}
                    icon={<ArrowLeft className="h-10 w-10" />}
                    label="Volver"
                />

                {/* Mute / Unmute */}
                <ControlButton
                    onClick={onToggleMute}
                    icon={isMuted ? <MicOff className="h-10 w-10" /> : <Mic className="h-10 w-10" />}
                    label={isMuted ? "Silenciado" : "Micrófono"}
                    className={
                        isMuted
                            ? "bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            : "bg-success text-success-foreground hover:bg-success/90"
                    }
                />

                {/* Chat */}
                <ControlButton
                    onClick={onToggleChat}
                    icon={<MessageCircle className="h-10 w-10" />}
                    label="Chat"
                    className={
                        isChatOpen
                            ? "bg-primary text-primary-foreground hover:bg-primary/90"
                            : "bg-muted text-foreground hover:ring-4 hover:ring-primary/50 hover:text-primary"
                    }
                />

                {/* Interrumpir */}
                <ControlButton
                    onClick={interrupt}
                    icon={<Zap className="h-10 w-10" />}
                    label="Interrumpir"
                    className="bg-warning text-warning-foreground hover:bg-warning/90"
                />
            </div>
        </div>
    )
}

const ControlButton = ({
    onClick,
    icon,
    label,
    className = "bg-muted text-foreground hover:ring-4 hover:ring-primary/50 hover:text-primary",
}: {
    onClick: () => void
    icon: React.ReactNode
    label: string
    className?: string
}) => (
    <div className="flex flex-col items-center gap-3">
        <Button
            variant="ghost"
            size="icon"
            onClick={onClick}
            className={`w-20 h-20 rounded-full shadow-lg transition-all ${className}`}
        >
            {icon}
        </Button>
        <span className="text-lg font-semibold text-foreground">{label}</span>
    </div>
)
