// types/chat.ts

export type ChatSender = "avatar" | "user"

export interface ChatMessage {
  id: string
  sender: ChatSender
  content: string
  timestamp: Date
}
