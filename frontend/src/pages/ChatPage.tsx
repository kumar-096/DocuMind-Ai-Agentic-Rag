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

        setMessages(stored.map(m => ({
          id: String(m.id),
          role: m.role,
          content: m.content
        })))

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
    return () => { cancelled = true }

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
        if (!loading) streaming.current = false
        else setTimeout(process, 20)
        return
      }

      const next = queue.current.shift() || ""

      setMessages(prev => {
        const updated = [...prev]
        const i = updated.findIndex(m => m.id === assistantRef.current)
        if (i !== -1) updated[i].content += next
        return updated
      })

      let delay = 15
      if (next === " ") delay = 8
      else if ([".", ",", "\n"].includes(next)) delay = 80
      else if (/[A-Z]/.test(next)) delay = 25

      delay += Math.random() * 10

      setTimeout(process, delay)
    }

    process()

  }, [loading])

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
    return !["Copy", "Stop", "Regenerate"].some(b => token.includes(b))
  }

  /* ---------------- REGENERATE ---------------- */
  function regenerate(lastUserMessage: string) {

    if (loading) return

    setLoading(true)

    const assistantId = crypto.randomUUID()
    assistantRef.current = assistantId

    setMessages(prev => [
      ...prev,
      { id: assistantId, role: "assistant", content: "" }
    ])

    queue.current = []
    streaming.current = false

    askQuestionSSE(
      {
        query: lastUserMessage,
        session_id: (sessionId ?? 0) as number, // ✅ FIX
        top_k: settings?.top_k || 5
      },
      (token) => {
        if (!token.includes("Thinking") && isValidToken(token)) {
          queue.current.push(token)
        }
      },
      () => setLoading(false),
      () => {
        setError("Retry failed")
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

    setMessages(prev => [...prev, userMessage])
    setInput("")
    setLoading(true)

    const assistantId = crypto.randomUUID()
    assistantRef.current = assistantId

    setMessages(prev => [
      ...prev,
      { id: assistantId, role: "assistant", content: "" }
    ])

    queue.current = []
    streaming.current = false

    askQuestionSSE(
      {
        query: userMessage.content,
        session_id: activeSessionId as number, // ✅ FIX
        top_k: settings?.top_k || 5
      },
      (token) => {
        if (!token.includes("Thinking") && isValidToken(token)) {
          queue.current.push(token)
        }
      },
      () => setLoading(false),
      () => {
        setError("Streaming error")
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

              <div className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>

                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`max-w-[80%] rounded-xl px-5 py-4 text-sm leading-relaxed ${
                    m.role === "user"
                      ? "bg-blue-600 text-white"
                      : "bg-slate-800 text-slate-50"
                  }`}
                >

                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    components={{
                      code(props: any) { // ✅ FIX (safe typing)
                        const { inline, children } = props

                        return inline ? (
                          <code className="bg-slate-700 px-1 rounded">
                            {children}
                          </code>
                        ) : (
                          <div className="relative">
                            <pre className="bg-black p-3 rounded overflow-x-auto">
                              <code>{children}</code>
                            </pre>

                            <button
                              onClick={() => copy(String(children))}
                              className="absolute top-2 right-2 text-xs bg-slate-700 px-2 py-1 rounded opacity-0 group-hover:opacity-100"
                            >
                              Copy
                            </button>
                          </div>
                        )
                      }
                    }}
                  >
                    {m.content}
                  </ReactMarkdown>

                </motion.div>

              </div>

              {m.role === "assistant" && (
                <div className="flex gap-3 text-xs text-slate-400 opacity-0 group-hover:opacity-100 transition">

                  <button onClick={() => copy(m.content)} className="hover:text-white">
                    Copy
                  </button>

                  <button onClick={stopGeneration} className="hover:text-red-400">
                    Stop
                  </button>

                  {index > 0 && messages[index - 1].role === "user" && (
                    <button
                      onClick={() => regenerate(messages[index - 1].content)}
                      className="hover:text-yellow-400"
                    >
                      Regenerate
                    </button>
                  )}

                </div>
              )}

            </div>

          ))}

          {loading && (
            <div className="text-sm text-slate-400 animate-pulse">
              Thinking...
            </div>
          )}

          {error && <div className="text-red-400 text-sm">{error}</div>}

          <div ref={messagesEndRef} />

        </div>
      </div>

      <form onSubmit={handleSubmit} className="sticky bottom-0 p-4 bg-slate-950 border-t">

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
            className="bg-blue-600 px-5 rounded-lg text-white hover:bg-blue-500 transition"
          >
            Send
          </button>

        </div>

      </form>

    </div>
  )
}