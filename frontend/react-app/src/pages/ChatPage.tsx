import { FormEvent, useState } from 'react'
import type { ChatResponse } from '../lib/api'
import { askQuestion } from '../lib/api'

type MessageRole = 'user' | 'assistant'

interface Message {
  id: number
  role: MessageRole
  content: string
  response?: ChatResponse
}

export function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    const trimmed = input.trim()
    if (!trimmed || loading) return
    setError(null)

    const userMessage: Message = {
      id: Date.now(),
      role: 'user',
      content: trimmed,
    }
    setMessages((prev) => [...prev, userMessage])
    setInput('')
    setLoading(true)

    try {
      const response = await askQuestion({ query: trimmed, top_k: 5 })
      const assistantMessage: Message = {
        id: Date.now() + 1,
        role: 'assistant',
        content: response.answer,
        response,
      }
      setMessages((prev) => [...prev, assistantMessage])
    } catch (err) {
      console.error(err)
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex h-full flex-col gap-4">
      <div className="flex-1 overflow-y-auto rounded-lg border border-slate-800 bg-slate-900/40 p-4">
        {messages.length === 0 && (
          <p className="text-sm text-slate-400">
            Ask a question about your uploaded documents to get started.
          </p>
        )}
        <div className="space-y-4">
          {messages.map((m) => (
            <div key={m.id} className="space-y-2">
              <div
                className={`flex ${
                  m.role === 'user' ? 'justify-end' : 'justify-start'
                }`}
              >
                <div
                  className={`max-w-[80%] rounded-xl px-4 py-2 text-sm ${
                    m.role === 'user'
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-800 text-slate-50'
                  }`}
                >
                  {m.content}
                </div>
              </div>
              {m.role === 'assistant' && m.response && (
                <div className="ml-2 text-xs text-slate-400">
                  <div className="font-semibold text-slate-300">Sources</div>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {m.response.citations.map((c, idx) => (
                      <span
                        key={`${c.document_id}-${c.chunk_index}-${idx}`}
                        className="rounded-full bg-slate-800 px-2 py-1 text-[11px]"
                      >
                        {c.filename}
                        {typeof c.page === 'number' && ` p.${c.page}`}
                        {typeof c.chunk_index === 'number' &&
                          ` · chunk ${c.chunk_index}`}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-2">
        {error && <p className="text-xs text-red-400">{error}</p>}
        <div className="flex gap-2">
          <textarea
            className="min-h-[60px] flex-1 resize-none rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-50 shadow-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            placeholder="Ask a question about your documents..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
          />
          <button
            type="submit"
            disabled={loading}
            className="h-[60px] rounded-lg bg-blue-600 px-4 text-sm font-medium text-white shadow hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? 'Thinking...' : 'Send'}
          </button>
        </div>
      </form>
    </div>
  )
}

