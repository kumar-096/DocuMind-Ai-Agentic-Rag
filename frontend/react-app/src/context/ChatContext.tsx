import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode
} from "react"

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

  sessionId: number | null
  setSessionId: (id: number | null) => void

  resetChat: () => void
}

const ChatContext = createContext<ChatContextType | null>(null)

export function ChatProvider({ children }: { children: ReactNode }) {

  const [messages, setMessages] = useState<Message[]>([])
  const [sessionId, setSessionIdState] = useState<number | null>(null)

  /* ---------------- Restore session ---------------- */

  useEffect(() => {

    const saved = localStorage.getItem("active_chat_session")

    if (saved) {
      const parsed = Number(saved)

      if (!isNaN(parsed)) {
        setSessionIdState(parsed)
      } else {
        localStorage.removeItem("active_chat_session")
      }
    }

  }, [])

  /* ---------------- Persist session ---------------- */

  function setSessionId(id: number | null) {

    setSessionIdState(id)

    if (id === null) {
      localStorage.removeItem("active_chat_session")
    } else {
      localStorage.setItem("active_chat_session", id.toString())
    }

    setMessages([])
  }

  /* ---------------- HARD RESET ---------------- */

  function resetChat() {
    setMessages([])
    setSessionIdState(null)
    localStorage.removeItem("active_chat_session")
  }

  return (
    <ChatContext.Provider
      value={{
        messages,
        setMessages,
        sessionId,
        setSessionId,
        resetChat
      }}
    >
      {children}
    </ChatContext.Provider>
  )
}

export function useChat() {

  const ctx = useContext(ChatContext)

  if (!ctx) {
    throw new Error("useChat must be used inside ChatProvider")
  }

  return ctx
}