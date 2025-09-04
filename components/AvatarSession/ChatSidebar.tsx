"use client"

import { X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { useMessageHistory, MessageSender } from "../logic"
import { TextInput } from "./TextInput"
import { useAvatarStore } from "@/store/avatarStore"

interface ChatSidebarProps {
  isOpen: boolean
  onToggle: () => void
}

export const ChatSidebar: React.FC<ChatSidebarProps> = ({ isOpen, onToggle }) => {
  const { messages } = useMessageHistory()
  const { currentAvatarType } = useAvatarStore()

  return (
    <div
      className={`fixed right-0 top-0 h-full 
        w-[clamp(24rem,40vw,40rem)] 
        bg-card border-l border-border shadow-2xl z-50 
        transform transition-transform duration-300 ease-in-out 
        ${isOpen ? "translate-x-0" : "translate-x-full"}`}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-border">
        <h3 className="font-semibold text-[clamp(1.25rem,2vw,2rem)] text-foreground">
          Chat
        </h3>
        <Button
          variant="ghost"
          size="icon"
          onClick={onToggle}
          className="text-muted-foreground hover:text-primary transition-colors"
        >
          <X className="h-8 w-8" />
        </Button>
      </div>

      {/* Mensajes */}
      <ScrollArea className="flex-1 h-[calc(100vh-160px)] px-6 py-4">
        <div className="space-y-6">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex ${
                msg.sender === MessageSender.CLIENT
                  ? "justify-end"
                  : "justify-start"
              }`}
            >
              <div
                className={`max-w-[80%] rounded-2xl px-6 py-4 shadow-md text-[clamp(1rem,1.25vw,1.5rem)] leading-relaxed
                ${
                  msg.sender === MessageSender.CLIENT
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

      {/* Footer con input */}
      <div className="px-6 py-4 border-t border-border">
        {currentAvatarType ? (
          <TextInput avatarType={currentAvatarType} />
        ) : (
          <p className="text-[clamp(0.9rem,1vw,1.25rem)] text-muted-foreground">
            Selecciona un avatar para empezar a chatear
          </p>
        )}
      </div>
    </div>
  )
}
