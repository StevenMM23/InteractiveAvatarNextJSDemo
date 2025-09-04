"use client"

import type { DemoDefinition } from "@/types/demo"
import { demoRegistry } from "@/lib/avatarRegistry"
import { Flame, GraduationCap, CreditCard, MessageCircle, TrendingUp, Settings } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { AnimatedCard } from "./animated-card"
import Image from "next/image"

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
        <div className="min-h-screen bg-background">
            <div className="container mx-auto px-4 sm:px-8 lg:px-[--tv-padding] py-12">
                <div className="flex justify-center mb-10">
                    <div className="relative w-48 h-16 lg:w-72 lg:h-24">
                        {/* Logo claro */}
                        <Image
                            src="/gbm_logo_azul.png"
                            alt="GBM Logo Azul"
                            fill
                            className="object-contain block dark:hidden"
                            priority
                        />
                        {/* Logo oscuro */}
                        <Image
                            src="/Logo-blanco-sin-fondo.png"
                            alt="GBM Logo Blanco"
                            fill
                            className="object-contain hidden dark:block"
                            priority
                        />
                    </div>
                </div>
                <div className="text-center mb-16 lg:mb-20 animate-fade-in">
                    <h1 className="text-5xl lg:text-7xl font-bold text-foreground mb-6 tracking-tight">Selecciona tu Avatar</h1>
                    <p className="text-2xl lg:text-3xl text-muted-foreground max-w-4xl mx-auto leading-relaxed">
                        Elige el especialista que mejor se adapte a tus necesidades y comienza una conversación personalizada
                    </p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 max-w-6xl mx-auto">
                    {demoRegistry.map((demo, index) => {
                        const IconComponent = iconMap[demo.icon as keyof typeof iconMap]
                        const isSelected = selectedAvatar?.id === demo.id

                        return (
                            <AnimatedCard
                                key={demo.id}
                                delay={index * 150}
                                className={`
                  overflow-hidden bg-card border-border group cursor-pointer
                  ${isSelected ? "ring-4 ring-primary ring-opacity-50 bg-primary/5" : ""}
                `}
                                onClick={() => onSelectAvatar(demo)}
                            >
                                <div className="relative overflow-hidden bg-gradient-to-br from-primary/20 via-primary/10 to-transparent p-8 lg:p-10">
                                    <div className="flex items-center justify-between mb-4">
                                        {IconComponent && (
                                            <div className="p-4 bg-primary/20 rounded-full">
                                                <IconComponent className="w-12 h-12 lg:w-16 lg:h-16 text-primary" />
                                            </div>
                                        )}
                                        <Badge
                                            variant="secondary"
                                            className="bg-primary text-primary-foreground text-lg px-4 py-2 animate-bounce-in"
                                        >
                                            {"Especialista"}
                                        </Badge>
                                        {demo.status === "beta" && (
                                            <Badge
                                                variant="secondary"
                                                className="bg-yellow-400 text-black text-lg px-4 py-2 "
                                            >
                                                En desarrollo
                                            </Badge>)}
                                    </div>

                                    <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                                </div>

                                <div className="p-8 lg:p-10">
                                    <h3 className="text-3xl lg:text-4xl font-bold text-foreground mb-4 group-hover:text-primary transition-colors duration-300">
                                        {demo.name}
                                    </h3>
                                    <p className="text-muted-foreground text-lg lg:text-xl mb-8 line-clamp-3 leading-relaxed">
                                        {demo.description}
                                    </p>

                                    <Button
                                        className={`
                      w-full text-xl lg:text-2xl py-4 lg:py-6 font-semibold 
                      transition-all duration-300 hover:shadow-lg hover:shadow-primary/25
                      ${isSelected
                                                ? "bg-primary hover:bg-primary/90 text-primary-foreground"
                                                : "bg-secondary hover:bg-secondary/80 text-secondary-foreground"
                                            }
                    `}
                                    >
                                        {isSelected ? "Seleccionado" : "Seleccionar Avatar"}
                                    </Button>

                                    {demo.requiresForm && (
                                        <div className="mt-4 flex items-center justify-center gap-2 animate-slide-up">
                                            <div className="w-2 h-2 bg-orange-400 rounded-full animate-pulse"></div>
                                            <p className="text-base text-orange-400 font-medium">Requiere configuración previa</p>
                                        </div>
                                    )}
                                </div>
                            </AnimatedCard>
                        )
                    })}
                </div>
            </div>
        </div>
    )
}
