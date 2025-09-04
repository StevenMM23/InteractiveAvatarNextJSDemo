"use client"

import type React from "react"
import { useState } from "react"
import { Card } from "@/components/ui/card"

interface AnimatedCardProps {
    children: React.ReactNode
    className?: string
    delay?: number
    onClick?: () => void
}

export const AnimatedCard: React.FC<AnimatedCardProps> = ({ children, className = "", delay = 0, onClick }) => {
    const [isHovered, setIsHovered] = useState(false)

    return (
        <Card
            className={`
        transform transition-all duration-500 cursor-pointer
        hover:scale-105 hover:shadow-2xl hover:shadow-primary/25
        animate-fade-in-scale
        ${className}
      `}
            style={{
                animationDelay: `${delay}ms`,
                transform: isHovered ? "scale(1.02) rotateY(5deg)" : "scale(1) rotateY(0deg)",
            }}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            onClick={onClick}
        >
            <div className="relative overflow-hidden">
                {children}

                {/* Hover glow effect */}
                <div
                    className={`
          absolute inset-0 bg-gradient-to-r from-primary/20 via-transparent to-primary/20 
          opacity-0 transition-opacity duration-500
          ${isHovered ? "opacity-100" : "opacity-0"}
        `}
                />
            </div>
        </Card>
    )
}
