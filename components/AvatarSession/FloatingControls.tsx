"use client"

import React, { useMemo } from "react"
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
    avatarType,
}) => {
    const { interrupt } = useInterrupt()

    // Solo para indicar en la UI qué backend gestiona el micrófono
    const micBackend = useMemo(() => {
        const knowledge = ["volcano", "gbm-onboarding", "microsoft-services"]
        return knowledge.includes(avatarType) ? "SDK" : "Google"
    }, [avatarType])

    // Etiqueta + título del botón de micrófono (tooltip)
    const micLabel = isMuted ? "Silenciado" : "Micrófono"
    const micTitle =
        isMuted
            ? `Micrófono desactivado. Haz clic para activar.`
            : `Micrófono activado. Haz clic para silenciar.`

    return (
        <div className="fixed bottom-10 left-1/2 -translate-x-1/2 z-50">
            <div className="flex gap-12 bg-background/90 backdrop-blur-xl px-12 py-6 rounded-3xl border border-border shadow-2xl">

                {/* Volver */}
                <ControlButton
                    onClick={onBack}
                    icon={<ArrowLeft className="h-10 w-10" />}
                    label="Volver"
                    title="Detener sesión y volver"
                />

                {/* Mute / Unmute */}
                <ControlButton
                    onClick={onToggleMute}
                    icon={isMuted ? <MicOff className="h-10 w-10" /> : <Mic className="h-10 w-10" />}
                    label={`${micLabel}`}
                    title={micTitle}
                    ariaPressed={!isMuted ? true : false}
                    className={
                        isMuted
                            ? "bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            : "bg-success text-success-foreground hover:bg-success/90"
                    }
                    // Pequeña marca del backend
                    // footer={<span className="text-xs text-muted-foreground">({micBackend})</span>}
                />

                {/* Chat */}
                <ControlButton
                    onClick={onToggleChat}
                    icon={<MessageCircle className="h-10 w-10" />}
                    label="Chat"
                    title={isChatOpen ? "Ocultar chat" : "Mostrar chat"}
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
                    title="Cortar la locución actual del avatar"
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
    title,
    ariaPressed,
    footer,
}: {
    onClick: () => void
    icon: React.ReactNode
    label: string
    className?: string
    title?: string
    ariaPressed?: boolean
    footer?: React.ReactNode
}) => (
    <div className="flex flex-col items-center gap-2">
        <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={onClick}
            title={title}
            aria-pressed={ariaPressed}
            className={`w-20 h-20 rounded-full shadow-lg transition-all ${className}`}
        >
            {icon}
        </Button>
        <span className="text-lg font-semibold text-foreground">{label}</span>
        {footer}
    </div>
)
