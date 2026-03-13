import type { FormEvent } from "react"
import { useEffect, useRef, useState } from "react"
import type { ChatResponse } from "../lib/api"
import { askQuestion } from "../lib/api"

type MessageRole = "user" | "assistant"

interface Message {
  id: number
  role: MessageRole
  content: string
  response?: ChatResponse
}

export function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const messagesEndRef = useRef<HTMLDivElement | null>(null)

  /* Load previous chat */
  useEffect(() => {
    const saved = localStorage.getItem("rag-chat-history")
    if (saved) {
      setMessages(JSON.parse(saved))
    }
  }, [])

  /* Save chat */
  useEffect(() => {
    localStorage.setItem("rag-chat-history", JSON.stringify(messages))
  }, [messages])

  /* Auto scroll */
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages, loading])

  async function streamAnswer(id: number, text: string) {
    const words = text.split(" ")

    for (let i = 0; i < words.length; i++) {
      await new Promise((r) => setTimeout(r, 18))

      setMessages((prev) =>
        prev.map((m) =>
          m.id === id
            ? { ...m, content: m.content + words[i] + " " }
            : m
        )
      )
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()

    const trimmed = input.trim()
    if (!trimmed || loading) return

    setError(null)

    const userMessage: Message = {
      id: Date.now(),
      role: "user",
      content: trimmed
    }

    setMessages((prev) => [...prev, userMessage])
    setInput("")
    setLoading(true)

    try {
      const response = await askQuestion({
        query: trimmed,
        top_k: 5
      })

      const id = Date.now() + 1

      const assistantMessage: Message = {
        id,
        role: "assistant",
        content: "",
        response
      }

      setMessages((prev) => [...prev, assistantMessage])

      await streamAnswer(id, response.answer)
    } catch (err) {
      console.error(err)
      setError(err instanceof Error ? err.message : "Something went wrong")
    } finally {
      setLoading(false)
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      const form = e.currentTarget.form
      form?.requestSubmit()
    }
  }

  return (
    <div className="flex h-full flex-col overflow-hidden">

      {/* Chat messages */}
      <div className="flex-1 overflow-y-auto px-6 py-6">

        {messages.length === 0 && (
          <div className="flex h-full items-center justify-center text-sm text-slate-400">
            Ask a question about your uploaded documents.
          </div>
        )}

        <div className="mx-auto max-w-3xl space-y-6">

          {messages.map((m) => (
            <div key={m.id} className="space-y-2">

              {/* Message bubble */}
              <div
                className={`flex ${
                  m.role === "user" ? "justify-end" : "justify-start"
                }`}
              >
                <div
                  className={`max-w-[80%] rounded-xl px-4 py-3 text-sm leading-relaxed ${
                    m.role === "user"
                      ? "bg-blue-600 text-white"
                      : "bg-slate-800 text-slate-50"
                  }`}
                >
                  {m.content}
                </div>
              </div>

              {/* Citations */}
              {m.role === "assistant" && m.response && (
                <div className="text-xs text-slate-400">

                  <div className="mb-1 font-semibold text-slate-300">
                    Sources
                  </div>

                  <div className="flex flex-wrap gap-2">

                    {m.response.citations.map((c, idx) => (
                      <span
                        key={`${c.document_id}-${c.chunk_index}-${idx}`}
                        className="cursor-pointer rounded-full border border-slate-700 bg-slate-900 px-2 py-1 hover:bg-slate-800"
                      >
                        {c.filename}
                        {typeof c.page === "number" && ` p.${c.page}`}
                        {typeof c.chunk_index === "number" &&
                          ` · chunk ${c.chunk_index}`}
                      </span>
                    ))}

                  </div>

                </div>
              )}

            </div>
          ))}

          {/* Thinking indicator */}
          {loading && (
            <div className="flex justify-start">
              <div className="rounded-xl bg-slate-800 px-4 py-2 text-sm text-slate-400 animate-pulse">
                Thinking...
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />

        </div>

      </div>

      {/* Input area */}
      <form
        onSubmit={handleSubmit}
        className="border-t border-slate-800 bg-slate-950 p-4"
      >
        <div className="mx-auto max-w-3xl flex flex-col gap-2">

          {error && (
            <p className="text-xs text-red-400">{error}</p>
          )}

          <div className="flex items-end gap-3">

            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask a question about your documents..."
              className="min-h-[60px] flex-1 resize-none rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-50 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            />

            <button
              type="submit"
              disabled={loading}
              className="h-[60px] rounded-lg bg-blue-600 px-5 text-sm font-medium text-white hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? "..." : "Send"}
            </button>

          </div>

        </div>
      </form>

    </div>
  )
}