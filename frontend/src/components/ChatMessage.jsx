import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import { useState } from "react"
import { Copy, Check, RotateCcw, Square } from "lucide-react"

function ChatMessage({ role, content, streaming }: any) {
  const isUser = role === "user"
  const [copied, setCopied] = useState(false)

  const handleCopy = async (text = content) => {
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 1200)
  }

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"} mb-8`}>
      <div
        className={`group relative max-w-3xl rounded-3xl border px-6 py-5 shadow-xl transition-all
          ${
            isUser
              ? "bg-blue-600 text-white border-blue-500/30"
              : "bg-[#111827] text-slate-100 border-white/10"
          }`}
      >
        {!isUser && (
          <div className="absolute top-3 right-3 flex gap-2 opacity-0 group-hover:opacity-100 transition">
            <button
              onClick={() => handleCopy()}
              className="rounded-lg bg-black/40 p-2 hover:bg-black/60"
            >
              {copied ? <Check size={16} /> : <Copy size={16} />}
            </button>

            <button className="rounded-lg bg-black/40 p-2 hover:bg-black/60">
              <Square size={16} />
            </button>

            <button className="rounded-lg bg-black/40 p-2 hover:bg-black/60">
              <RotateCcw size={16} />
            </button>
          </div>
        )}

        <div className="ai-prose">
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
              h2: ({ children }) => (
                <div className="mt-10 mb-5 rounded-2xl border border-blue-500/20 bg-blue-500/5 px-4 py-3">
                  <h2 className="text-xl font-bold text-blue-300 tracking-wide">
                    {children}
                  </h2>
                </div>
              ),

              h3: ({ children }) => (
                <h3 className="mt-8 mb-4 text-lg font-semibold text-cyan-300">
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
                <li className="leading-7 text-slate-300">{children}</li>
              ),

              code({ inline, children }: any) {
                return inline ? (
                  <code className="rounded-md bg-slate-900 px-2 py-1 text-emerald-400">
                    {children}
                  </code>
                ) : (
                  <div className="group/code relative my-6">
                    <pre className="overflow-x-auto rounded-2xl bg-black px-4 py-4">
                      <code className="text-emerald-400">{children}</code>
                    </pre>

                    <button
                      onClick={() => handleCopy(String(children))}
                      className="absolute top-3 right-3 rounded-lg bg-slate-800 p-2 opacity-0 transition group-hover/code:opacity-100"
                    >
                      {copied ? <Check size={14} /> : <Copy size={14} />}
                    </button>
                  </div>
                )
              },

              blockquote: ({ children }) => (
                <blockquote className="my-6 border-l-4 border-cyan-400 pl-4 italic text-slate-400">
                  {children}
                </blockquote>
              ),
            }}
          >
            {content}
          </ReactMarkdown>
        </div>

        {streaming && (
          <span className="ml-1 animate-pulse text-blue-400">▋</span>
        )}
      </div>
    </div>
  )
}

export default ChatMessage