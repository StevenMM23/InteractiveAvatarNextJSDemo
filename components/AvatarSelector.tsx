"use client"

import type { DemoDefinition } from "@/types/demo"
import { demoRegistry } from "@/lib/avatarRegistry"
import { Flame, GraduationCap, CreditCard, MessageCircle, TrendingUp, Settings } from "lucide-react"

const iconMap = {
    Flame,
    GraduationCap,
    CreditCard,
    MessageCircle,
    TrendingUp,
    Settings,
}

interface AvatarSelectorProps {
    onSelectAvatar: (demo: DemoDefinition) => void
    selectedAvatar?: DemoDefinition
}

export function AvatarSelector({ onSelectAvatar, selectedAvatar }: AvatarSelectorProps) {
    return (
        <div className="flex flex-col gap-4 w-full max-w-2xl">
            <h2 className="text-white text-xl font-semibold text-center mb-4">Selecciona un Avatar</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {demoRegistry.map((demo) => {
                    const IconComponent = iconMap[demo.icon as keyof typeof iconMap]
                    const isSelected = selectedAvatar?.id === demo.id

                    return (
                        <div
                            key={demo.id}
                            className={`
                p-4 rounded-lg border cursor-pointer transition-all
                ${isSelected ? "border-blue-500 bg-blue-500/10" : "border-zinc-700 bg-zinc-800 hover:border-zinc-600"}
              `}
                            onClick={() => onSelectAvatar(demo)}
                        >
                            <div className="flex items-start gap-3">
                                {IconComponent && <IconComponent className="w-6 h-6 text-blue-400 mt-1 flex-shrink-0" />}
                                <div className="flex-1">
                                    <h3 className="text-white font-medium mb-1">{demo.name}</h3>
                                    <p className="text-zinc-400 text-sm leading-relaxed">{demo.description}</p>
                                    {demo.requiresForm && (
                                        <span className="inline-block mt-2 px-2 py-1 bg-orange-500/20 text-orange-400 text-xs rounded">
                                            Requiere formulario
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>
                    )
                })}
            </div>
        </div>
    )
}
