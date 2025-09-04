"use client"

import { Button } from "../Button"

interface StartButtonsProps {
  onStart: () => void
}

export function StartButtons({ onStart }: StartButtonsProps) {
  return (
    <div className="flex flex-col gap-12 items-center animate-bounce-in">
      {/* Título */}
      <h3 className="text-2xl md:text-3xl lg:text-5xl font-bold text-center text-foreground">
        Inicia tu sesión
      </h3>

      {/* Botón único */}
      <div className="flex flex-col gap-8">
        <Button
          onClick={onStart}
          className="px-16 py-10 text-3xl font-semibold 
             bg-primary text-primary-foreground 
             hover:bg-primary/90 
             shadow-2xl hover:shadow-primary/40 
             transform hover:scale-105 
             transition-all duration-300 rounded-2xl"
        >
          Iniciar Sesión
        </Button>
      </div>

      {/* Nota */}
      <p className="text-base md:text-xl lg:text-2xl text-muted-foreground text-center max-w-2xl lg:max-w-3xl leading-relaxed">
        El micrófono estará activo, pero podrás cambiar entre modos en cualquier momento
      </p>
    </div>
  )
}
