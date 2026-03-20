import { createContext, useContext, useState } from "react"

type Message = {
  id: string
  role: "user" | "assistant"
  content: string
}

type ChatContextType = {
  sessionId: number | null
  setSessionId: (id: number) => void

  messages: Message[]
  setMessages: React.Dispatch<React.SetStateAction<Message[]>>
}

const ChatContext = createContext<ChatContextType | null>(null)

export function ChatProvider({ children }: { children: React.ReactNode }) {

  const [sessionId, setSessionIdState] = useState<number | null>(() => {
    const stored = localStorage.getItem("active_chat_session")
    return stored ? Number(stored) : null
  })

  const [messages, setMessages] = useState<Message[]>([])

  function setSessionId(id: number) {
    localStorage.setItem("active_chat_session", String(id))
    setSessionIdState(id)
  }

  return (
    <ChatContext.Provider
      value={{
        sessionId,
        setSessionId,
        messages,
        setMessages
      }}
    >
      {children}
    </ChatContext.Provider>
  )
}

export function useChat() {
  const ctx = useContext(ChatContext)

  if (!ctx) {
    throw new Error("ChatContext missing")
  }

  return ctx
}