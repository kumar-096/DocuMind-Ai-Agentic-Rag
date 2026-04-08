import type { FormEvent } from "react"
import { useEffect, useRef, useState } from "react"
import {
  getSettings,
  cancelCurrentRequest,
  askQuestionSSE,
  loadSessionMessages,
  createSession
} from "../lib/api"

import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import { motion } from "framer-motion"
import { useChat } from "../context/ChatContext"

type MessageRole = "user" | "assistant"

interface Message {
  id: string
  role: MessageRole
  content: string
}

export function ChatPage() {
  const { sessionId, setSessionId, messages, setMessages } = useChat()

  const [input, setInput] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [settings, setSettings] = useState<any>(null)

  const messagesEndRef = useRef<HTMLDivElement | null>(null)
  const assistantRef = useRef<string | null>(null)

  const queue = useRef<string[]>([])
  const streaming = useRef(false)

  /* ---------------- SETTINGS ---------------- */
  useEffect(() => {
    getSettings().then(setSettings).catch(console.error)
  }, [])

  /* ---------------- LOAD SESSION ---------------- */
  useEffect(() => {
    if (!sessionId) return

    let cancelled = false

    async function loadMessages() {
      try {
        const stored = await loadSessionMessages(sessionId)
        if (cancelled) return

        setMessages(
          stored.map((m) => ({
            id: String(m.id),
            role: m.role,
            content: m.content
          }))
        )
      } catch (err: any) {
        if (err.message === "SESSION_NOT_FOUND") {
          const newSession = await createSession()

          if (!cancelled) {
            setSessionId(newSession.id)
            setMessages([])
          }
          return
        }

        console.error("Load messages error:", err)
      }
    }

    loadMessages()
    return () => {
      cancelled = true
    }
  }, [sessionId])

  /* ---------------- AUTO SCROLL ---------------- */
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  /* ---------------- STREAM ENGINE ---------------- */
  useEffect(() => {
  if (streaming.current) return
  streaming.current = true

  function process() {
    if (queue.current.length === 0) {
      if (!loading) {
        streaming.current = false
      } else {
        setTimeout(process, 20)
      }
      return
    }

    const next = queue.current.shift() || ""

    setMessages((prev) => {
      const updated = [...prev]
      const i = updated.findIndex(
        (m) => m.id === assistantRef.current
      )

      if (i !== -1) {
        updated[i].content += next
      }

      return updated
    })

    //  minimal UI smoothing
    setTimeout(process, 8)
  }

  process()
}, [loading, setMessages])

  /* ---------------- COPY ---------------- */
  function copy(text: string) {
    navigator.clipboard.writeText(text)
  }

  /* ---------------- STOP ---------------- */
  function stopGeneration() {
    cancelCurrentRequest()
    setLoading(false)
    queue.current = []
    streaming.current = false
  }

  function isValidToken(token: string) {
    return !["Copy", "Stop", "Regenerate"].some((b) =>
      token.includes(b)
    )
  }

  /* ---------------- REGENERATE ---------------- */
  function regenerate(lastUserMessage: string) {
    if (loading) return

    setError(null)
    setLoading(true)

    const assistantId = crypto.randomUUID()
    assistantRef.current = assistantId

    setMessages((prev) => [
      ...prev,
      {
        id: assistantId,
        role: "assistant",
        content: ""
      }
    ])

    queue.current = []
    streaming.current = false

    askQuestionSSE(
      {
        query: lastUserMessage,
        session_id: (sessionId ?? 0) as number,
        top_k: settings?.top_k || 5
      },
      (token) => {
        if (!token.includes("Thinking") && isValidToken(token)) {
          queue.current.push(token)
        }
      },
      () => {
        setError(null)
        setLoading(false)
      },
      (err) => {
        console.error("Regenerate error:", err)
        setError(typeof err === "string" ? err : "Retry failed")
        setLoading(false)
      }
    )
  }

  /* ---------------- SUBMIT ---------------- */
  async function handleSubmit(e: FormEvent) {
    e.preventDefault()

    if (!input.trim() || loading) return

    let activeSessionId = sessionId

    if (!activeSessionId) {
      const newSession = await createSession()
      setSessionId(newSession.id)
      activeSessionId = newSession.id
    }

    setError(null)

    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: "user",
      content: input
    }

    setMessages((prev) => [...prev, userMessage])
    setInput("")
    setLoading(true)

    const assistantId = crypto.randomUUID()
    assistantRef.current = assistantId

    setMessages((prev) => [
      ...prev,
      { id: assistantId, role: "assistant", content: "" }
    ])

    queue.current = []
    streaming.current = false

    askQuestionSSE(
      {
        query: userMessage.content,
        session_id: activeSessionId as number,
        top_k: settings?.top_k || 5
      },
      (token) => {
        if (!token.includes("Thinking") && isValidToken(token)) {
          queue.current.push(token)
        }
      },
      () => setLoading(false),
      (err) => {
        console.error("Streaming error:", err)
        setError(typeof err === "string" ? err : "Something went wrong")
        setLoading(false)
      }
    )
  }

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
        {messages.map((m, index) => (
          <div key={m.id} className="group space-y-2">
            <div
              className={`flex ${
                m.role === "user"
                  ? "justify-end"
                  : "justify-start"
              }`}
            >
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`group relative border shadow-lg transition-all duration-300 ${
                  m.role === "user"
                    ? "max-w-fit min-w-[80px] rounded-2xl px-4 py-2.5 bg-blue-600 text-white border-blue-500/30"
                    : "max-w-[82%] rounded-3xl px-6 pt-12 pb-5 bg-slate-900 text-slate-50 border-white/10"
                }`}
              >
                {m.role === "assistant" && (
                  <div className="absolute top-3 right-3 flex gap-2 z-20">
                    <button
                      onClick={() => copy(m.content)}
                      className="cursor-pointer rounded-lg bg-black/40 px-2 py-1 text-xs hover:bg-black/60"
                    >
                      Copy
                    </button>

                    {loading &&
                    m.id === assistantRef.current &&
                    m.content.trim().length > 0 ? (
                      <button
                        onClick={stopGeneration}
                        className="cursor-pointer rounded-lg bg-red-600/70 px-2 py-1 text-xs hover:bg-red-600"
                      >
                        Stop
                      </button>
                    ) : null}

                    {!loading &&
                      index > 0 &&
                      messages[index - 1].role === "user" && (
                        <button
                          onClick={() =>
                            regenerate(messages[index - 1].content)
                          }
                          className="cursor-pointer rounded-lg bg-yellow-600/70 px-2 py-1 text-xs hover:bg-yellow-600"
                        >
                          Retry
                        </button>
                      )}
                  </div>
                )}

                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  components={{
                    h2: ({ children }) => (
                      <div className="mt-8 mb-5 border-l-4 border-cyan-400 bg-cyan-500/5 px-4 py-2 rounded-r-xl">
                        <h2 className="text-lg font-semibold tracking-wide text-cyan-300">
                          {children}
                        </h2>
                      </div>
                    ),

                    h3: ({ children }) => (
                      <h3 className="mt-7 mb-3 text-lg font-semibold text-blue-300">
                        {children}
                      </h3>
                    ),

                    p: ({ children }) => (
                      <p className="my-5 leading-8 text-slate-300">
                        {children}
                      </p>
                    ),

                    ul: ({ children }) => (
                      <ul className="my-5 ml-6 list-disc space-y-3">
                        {children}
                      </ul>
                    ),

                    ol: ({ children }) => (
                      <ol className="my-5 ml-6 list-decimal space-y-3">
                        {children}
                      </ol>
                    ),

                    li: ({ children }) => (
                      <li className="leading-7 text-slate-300">
                        {children}
                      </li>
                    ),

                    code(props: any) {
                      const { inline, children } = props

                      return inline ? (
                        <code className="rounded-md bg-slate-800 px-2 py-1 text-emerald-400">
                          {children}
                        </code>
                      ) : (
                        <div className="group/code relative my-6">
                          <pre className="overflow-x-auto rounded-2xl bg-black px-4 py-4">
                            <code className="text-emerald-400">
                              {children}
                            </code>
                          </pre>

                          <button
                            onClick={() => copy(String(children))}
                            className="cursor-pointer absolute top-3 right-3 rounded-lg bg-slate-800 px-2 py-1 text-xs opacity-0 transition group-hover/code:opacity-100"
                          >
                            Copy
                          </button>
                        </div>
                      )
                    },

                    blockquote: ({ children }) => (
                      <blockquote className="my-6 border-l-4 border-cyan-400 pl-4 italic text-slate-400">
                        {children}
                      </blockquote>
                    ),

                    hr: () => (
                      <hr className="my-8 border-white/10" />
                    )
                  }}
                >
                  {m.content}
                </ReactMarkdown>
              </motion.div>
            </div>
          </div>
        ))}

        {loading && (
          <div className="text-sm text-slate-400 animate-pulse">
            Thinking...
          </div>
        )}

        {error && (
          <div className="text-yellow-400 text-sm bg-yellow-900/20 p-2 rounded">
            {error}
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>
    </div>

    <form
      onSubmit={handleSubmit}
      className="sticky bottom-0 p-4 bg-slate-950 border-t"
    >
      <div className="max-w-3xl mx-auto flex gap-3">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white"
          placeholder="Ask..."
        />

        <button
          type="submit"
          disabled={loading}
          className="cursor-pointer bg-blue-600 px-5 rounded-lg text-white hover:bg-blue-500 transition"
        >
          Send
        </button>
      </div>
    </form>
  </div>
)
}