"use client"

import { Button } from "../Button"
import type { DemoDefinition } from "../../types/demo"

interface AvatarHeaderProps {
  selectedDemo: DemoDefinition
  onBack: () => void
}

export function AvatarHeader({ selectedDemo, onBack }: AvatarHeaderProps) {
  return (
    <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between w-full mb-12 gap-8 animate-fade-in">
      {/* Bloque izquierdo */}
      <div className="flex flex-col gap-6 w-full">
        {/* Botón volver */}
        <div className="flex lg:inline-flex">
          <Button
            onClick={onBack}
            variant="outline"
            className="text-base md:text-lg 
                       px-6 md:px-8 
                       py-3 md:py-4 
                       rounded-xl 
                       border-border 
                       hover:bg-muted 
                       transition-all 
                       duration-300 
                       shadow-sm md:shadow-md"
          >
            ← Volver
          </Button>
        </div>

        {/* Título y descripción */}
        <div className="flex flex-col text-center lg:text-left">
          <h1
            className="font-extrabold 
                       bg-gradient-to-r from-primary to-primary/80 
                       bg-clip-text text-transparent tracking-tight
                       text-3xl md:text-5xl lg:text-6xl 
                       leading-tight"
          >
            {selectedDemo.name}
          </h1>
          <p
            className="mt-3 md:mt-4 text-muted-foreground 
                       text-base md:text-xl lg:text-2xl 
                       leading-relaxed max-w-2xl mx-auto lg:mx-0"
          >
            {selectedDemo.description}
          </p>
        </div>
      </div>

      {/* Estado */}
      <div
        className="flex items-center justify-center gap-3 
                   bg-card px-4 md:px-6 py-2 md:py-3 
                   rounded-xl border border-border shadow-sm md:shadow-lg 
                   self-center lg:self-auto"
      >
        <div className="w-3 h-3 md:w-4 md:h-4 bg-green-600 rounded-full animate-pulse" />
        <span className="font-medium text-success text-sm md:text-base lg:text-lg">
          Listo para iniciar
        </span>
      </div>
    </div>
  )
}
