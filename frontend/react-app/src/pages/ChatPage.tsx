import type { FormEvent } from "react"
import { useEffect, useRef, useState } from "react"
import {
  askQuestion,
  listDocuments,
  deleteDocument,
  type ChatResponse,
  type DocumentMetadata
} from "../lib/api"

import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import { motion } from "framer-motion"
import { useSource } from "../context/SourceContext"

type MessageRole = "user" | "assistant"

interface Message {
  id: number
  role: MessageRole
  content: string
  response?: ChatResponse
}

export function ChatPage() {

  const { setSource } = useSource()

  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [documents, setDocuments] = useState<DocumentMetadata[]>([])
  const [selectedDocs, setSelectedDocs] = useState<number[]>([])

  const messagesEndRef = useRef<HTMLDivElement | null>(null)

  /* ---------------- Load chat history ---------------- */

  useEffect(() => {
    const saved = localStorage.getItem("rag-chat-history")
    if (saved) {
      setMessages(JSON.parse(saved))
    }
  }, [])

  useEffect(() => {
    localStorage.setItem("rag-chat-history", JSON.stringify(messages))
  }, [messages])

  /* ---------------- Load documents ---------------- */

  useEffect(() => {
    loadDocuments()
  }, [])

  async function loadDocuments() {

    try {

      const docs = await listDocuments()

      setDocuments(docs)

    } catch (err) {

      console.error(err)

    }

  }

  /* ---------------- Auto scroll ---------------- */

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages, loading])

  /* ---------------- Streaming animation ---------------- */

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

  /* ---------------- Edit message ---------------- */

  function editMessage(message: Message) {

    setInput(message.content)

    setMessages(prev =>
      prev.filter(m => m.id <= message.id)
    )

  }

  /* ---------------- Toggle document ---------------- */

  function toggleDoc(id: number) {

    setSelectedDocs(prev =>
      prev.includes(id)
        ? prev.filter(d => d !== id)
        : [...prev, id]
    )

  }

  /* ---------------- Delete document ---------------- */

  async function handleDelete(id: number) {

    try {

      await deleteDocument(id)

      setDocuments(prev =>
        prev.filter(d => d.id !== id)
      )

      setSelectedDocs(prev =>
        prev.filter(d => d !== id)
      )

    } catch (err) {

      console.error(err)

    }

  }

  /* ---------------- Submit question ---------------- */

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

    setMessages(prev => [...prev, userMessage])

    setInput("")
    setLoading(true)

    try {

      const response = await askQuestion({
        query: trimmed,
        top_k: 5,
        document_ids: selectedDocs
      })

      const id = Date.now() + 1

      const assistantMessage: Message = {
        id,
        role: "assistant",
        content: "",
        response
      }

      setMessages(prev => [...prev, assistantMessage])

      await streamAnswer(id, response.answer)

    } catch (err) {

      console.error(err)

      setError(err instanceof Error ? err.message : "Something went wrong")

    } finally {

      setLoading(false)

    }

  }

  /* ---------------- Enter submit ---------------- */

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {

    if (e.key === "Enter" && !e.shiftKey) {

      e.preventDefault()

      const form = e.currentTarget.form
      form?.requestSubmit()

    }

  }

  return (

    <div className="flex h-full overflow-hidden">

      {/* ---------- Sidebar ---------- */}

      <div className="w-64 border-r border-slate-800 p-4 overflow-y-auto">

        <div className="text-sm font-semibold mb-3">
          Documents
        </div>

        <div className="space-y-2">

          {documents.map(doc => (

            <div
              key={doc.id}
              className="flex items-center justify-between text-xs"
            >

              <label className="flex items-center gap-2">

                <input
                  type="checkbox"
                  checked={selectedDocs.includes(doc.id)}
                  onChange={() => toggleDoc(doc.id)}
                />

                {doc.filename}

              </label>

              <button
                onClick={() => handleDelete(doc.id)}
                className="text-red-400"
              >
                Delete
              </button>

            </div>

          ))}

        </div>

      </div>

      {/* ---------- Chat ---------- */}

      <div className="flex flex-1 flex-col">

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
                    className="text-xs text-blue-400"
                  >
                    Edit
                  </button>

                )}

                {/* ---------- Sources ---------- */}

                {m.role === "assistant" && m.response && (

                  <div className="text-xs text-slate-400">

                    <div className="font-semibold text-slate-300">
                      Sources
                    </div>

                    <div className="flex flex-wrap gap-2">

                      {m.response.citations.map((c, idx) => (

                        <span
                          key={`${c.document_id}-${c.chunk_index}-${idx}`}
                          onClick={() =>
                            setSource({
                              filename: c.filename,
                              page: c.page,
                              chunk: c.chunk_index
                            })
                          }
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

            {loading && (

              <div className="text-sm text-slate-400 animate-pulse">
                Thinking...
              </div>

            )}

            <div ref={messagesEndRef} />

          </div>

        </div>

        {/* ---------- Input ---------- */}

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
              className="rounded-lg bg-blue-600 px-5 text-sm text-white"
            >
              Send
            </button>

          </div>

        </form>

      </div>

    </div>

  )

}