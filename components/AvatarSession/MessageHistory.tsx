"use client"

import { useState, useRef, useEffect } from "react"
import { X, MessageCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { useMessageHistory } from "../logic"
import { MessageSender } from "../logic/context"

export const MessageHistory: React.FC = () => {
  const { messages } = useMessageHistory()
  const [isOpen, setIsOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  // 🔽 Auto scroll al último mensaje
  useEffect(() => {
    const container = containerRef.current
    if (container) {
      container.scrollTop = container.scrollHeight
    }
  }, [messages])

  return (
    <>
      {/* Botón flotante para abrir */}
      {!isOpen && (
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setIsOpen(true)}
          className="fixed right-4 top-4 z-40 bg-background/90 backdrop-blur-md border border-border/30 rounded-full w-12 h-12"
        >
          <MessageCircle className="h-5 w-5" />
        </Button>
      )}

      {/* Sidebar de chat */}
      <div
        className={`
          fixed right-0 top-0 h-full w-80 md:w-96 bg-card border-l border-border z-50
          transform transition-transform duration-300 ease-in-out
          ${isOpen ? "translate-x-0" : "translate-x-full"}
        `}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h3 className="font-semibold text-foreground">Historial</h3>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsOpen(false)}
            className="text-muted-foreground hover:text-foreground"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Mensajes */}
        <ScrollArea className="flex-1 h-[calc(100vh-140px)]">
          <div ref={containerRef} className="p-4 space-y-4">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${msg.sender === MessageSender.CLIENT ? "justify-end" : "justify-start"
                  }`}
              >
                <div
                  className={`max-w-[80%] rounded-lg px-4 py-2 text-sm shadow-md ${msg.sender === MessageSender.CLIENT
                      ? "bg-primary text-primary-foreground"
                      : "bg-secondary text-secondary-foreground"
                    }`}
                >
                  {msg.content}
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </div>
    </>
  )
}
