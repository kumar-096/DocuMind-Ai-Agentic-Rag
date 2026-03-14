import { createContext, useContext, useState, type ReactNode } from "react"
import type { ChatResponse } from "../lib/api"

export type MessageRole = "user" | "assistant"

export interface Message {
  id: number
  role: MessageRole
  content: string
  response?: ChatResponse
}

interface ChatContextType {
  messages: Message[]
  setMessages: React.Dispatch<React.SetStateAction<Message[]>>
}

const ChatContext = createContext<ChatContextType | null>(null)

export function ChatProvider({ children }: { children: ReactNode }) {
  const [messages, setMessages] = useState<Message[]>([])

  return (
    <ChatContext.Provider value={{ messages, setMessages }}>
      {children}
    </ChatContext.Provider>
  )
}

export function useChat() {
  const ctx = useContext(ChatContext)
  if (!ctx) throw new Error("ChatContext missing")
  return ctx
}