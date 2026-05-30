import {
  createContext,
  useContext,
  useState,
  useEffect
} from "react"
import { fetchWithAuth } from "../lib/api"

type Message = {
  id: string
  role: "user" | "assistant"
  content: string
}

type ChatContextType = {
  sessionId: number | null
  setSessionId: (id: number | null) => void
  messages: Message[]
  setMessages: React.Dispatch<React.SetStateAction<Message[]>>
}

const ChatContext = createContext<ChatContextType | null>(null)

const BASE_URL =
  import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000"

export function ChatProvider({
  children
}: {
  children: React.ReactNode
}) {
  const [sessionId, setSessionIdState] = useState<number | null>(null)
  const [messages, setMessages] = useState<Message[]>([])

  // ✅ validate restored session on startup
  useEffect(() => {
    const restoreSession = async () => {
      const stored = localStorage.getItem("active_chat_session")

      if (!stored) return

      const parsedId = Number(stored)

      try {
        const res = await fetchWithAuth(
          `${BASE_URL}/api/sessions/${parsedId}/messages`
        )

        if (!res.ok) {
          localStorage.removeItem("active_chat_session")
          setSessionIdState(null)
          return
        }

        setSessionIdState(parsedId)
      } catch {
        localStorage.removeItem("active_chat_session")
        setSessionIdState(null)
      }
    }

    restoreSession()
  }, [])

  function setSessionId(id: number | null) {
    if (id === null) {
      localStorage.removeItem("active_chat_session")
      setSessionIdState(null)
      return
    }

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