import type { FormEvent } from "react"
import { useEffect, useRef, useState } from "react"

import {
  askQuestionSSE,
  loadSessionMessages,
  type ChatResponse
} from "../lib/api"

import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import { motion } from "framer-motion"

import { useSource } from "../context/SourceContext"
import { useChat } from "../context/ChatContext"

type MessageRole = "user" | "assistant"

interface Message {
  id: string
  role: MessageRole
  content: string
  response?: ChatResponse
}

export function ChatPage() {

  const { setSource } = useSource()
  const { sessionId } = useChat() as { sessionId: number | null }

  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const messagesEndRef = useRef<HTMLDivElement | null>(null)

  /* ---------------- Load session ---------------- */

  useEffect(() => {

    if (typeof sessionId !== "number") return
  
    const stableSessionId = sessionId  // ✅ freeze value
  
    async function loadMessages() {
  
      try {
        const stored = await loadSessionMessages(stableSessionId)
  
        const mapped: Message[] = stored.map((m) => ({
          id: String(m.id),
          role: m.role,
          content: m.content
        }))
  
        setMessages(mapped)
  
      } catch (err) {
        console.error(err)
      }
    }
  
    loadMessages()
  
  }, [sessionId])
  /* ---------------- Auto scroll ---------------- */

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages, loading])

  /* ---------------- Edit ---------------- */

  function editMessage(message: Message) {

    setInput(message.content)

    setMessages(prev =>
      prev.filter((_, index) =>
        index <= prev.findIndex(x => x.id === message.id)
      )
    )
  }

  /* ---------------- Submit ---------------- */

  async function handleSubmit(e: FormEvent) {

    e.preventDefault()

    const trimmed = input.trim()

    if (!trimmed || loading) return

    if (!sessionId) {
      setError("No active chat session.")
      return
    }

    setError(null)

    // USER
    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: "user",
      content: trimmed
    }

    setMessages(prev => [...prev, userMessage])

    setInput("")
    setLoading(true)

    // ASSISTANT
    const assistantId = crypto.randomUUID()

    const assistantMessage: Message = {
      id: assistantId,
      role: "assistant",
      content: ""
    }

    setMessages(prev => [...prev, assistantMessage])

    let fullAnswer = ""

    try {

      askQuestionSSE(
        {
          query: trimmed,
          session_id: sessionId,
          top_k: 5
        },
        (token) => {

          fullAnswer += token

          setMessages(prev =>
            prev.map(m =>
              m.id === assistantId
                ? { ...m, content: fullAnswer }
                : m
            )
          )

        },
        () => {
          setLoading(false)
        },
        (err) => {
          console.error(err)
          setError("Streaming error")
          setLoading(false)
        }
      )

    } catch (err) {
      console.error(err)
      setError("Something went wrong")
      setLoading(false)
    }
  }

  /* ---------------- Enter key ---------------- */

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {

    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      e.currentTarget.form?.requestSubmit()
    }
  }

  return (

    <div className="flex h-full flex-col">

      <div className="flex-1 overflow-y-auto px-6 py-6">

        <div className="mx-auto max-w-3xl space-y-6">

          {messages.map((m) => (

            <div key={m.id} className="space-y-2">

              <div className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>

                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`max-w-[80%] rounded-xl px-4 py-3 text-sm ${
                    m.role === "user"
                      ? "bg-blue-600 text-white"
                      : "bg-slate-800 text-slate-50"
                  }`}
                >
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {m.content}
                  </ReactMarkdown>
                </motion.div>

              </div>

              {m.role === "user" && (
                <button
                  onClick={() => editMessage(m)}
                  className="text-xs text-blue-400 cursor-pointer"
                >
                  Edit
                </button>
              )}

            </div>

          ))}

          {loading && (
            <div className="text-sm text-slate-400 animate-pulse">
              Thinking...
            </div>
          )}

          {error && (
            <div className="text-sm text-red-400">
              {error}
            </div>
          )}

          <div ref={messagesEndRef} />

        </div>

      </div>

      <form
        onSubmit={handleSubmit}
        className="border-t border-slate-800 bg-slate-950 p-4"
      >

        <div className="mx-auto max-w-3xl flex gap-3">

          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            className="flex-1 resize-none rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-50"
            placeholder="Ask about your documents..."
          />

          <button
            type="submit"
            disabled={loading}
            className="rounded-lg bg-blue-600 px-5 text-sm text-white hover:bg-blue-500"
          >
            Send
          </button>

        </div>

      </form>

    </div>
  )
}