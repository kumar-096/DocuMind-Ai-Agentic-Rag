import React, { useEffect, useState } from "react"
import { useChat } from "../../context/ChatContext"
import { useAuth } from "../../context/AuthContext"
import { listSessions, createSession } from "../../lib/api"
import type { ChatSession } from "../../lib/api"

type Page = "chat" | "documents" | "settings" | "analytics"

type SidebarProps = {
  page: Page
  setPage: (page: Page) => void
}

export function Sidebar({ page, setPage }: SidebarProps) {

  const { messages, setMessages, setSessionId } = useChat()
  const { logout } = useAuth()

  const [sessions, setSessions] = useState<ChatSession[]>([])

  useEffect(() => {

    const token = localStorage.getItem("access_token")
  
    if (!token) return
  
    async function loadSessions() {
  
      try {
  
        const data = await listSessions()
        setSessions(data)
  
      } catch (err) {
  
        console.error(err)
  
      }
  
    }
  
    loadSessions()
  
  }, [])

  async function handleNewChat() {

    try {

      const session = await createSession()

      setSessionId(session.id)
      setMessages([])

      const updated = await listSessions()
      setSessions(updated)

      setPage("chat")

    } catch (err) {

      console.error(err)

    }

  }

  const recent = messages
    .filter((m) => m.role === "user")
    .slice(-5)

  return (

    <aside className="w-64 border-r border-slate-800 bg-slate-950 flex flex-col">

      {/* Header */}
      <div className="px-5 py-5 border-b border-slate-800">

        <h2 className="text-md font-semibold text-white">
          Agentic RAG
        </h2>

        <p className="text-xs text-slate-400">
          AI Knowledge Assistant
        </p>

      </div>

      {/* New Chat */}
      <div className="p-3">

        <button
          onClick={handleNewChat}
          className="w-full rounded-md bg-blue-600 px-3 py-2 text-sm text-white hover:bg-blue-500 cursor-pointer"
        >
          + New Chat
        </button>

      </div>

      {/* Chat Sessions */}
      <div className="px-3">

        <p className="text-xs text-slate-500 mb-2">
          Chat Sessions
        </p>

        {sessions.map((s) => (

          <div
            key={s.id}
            onClick={() => {
              setSessionId(s.id)
              setPage("chat")
            }}
            className="truncate text-xs text-slate-400 px-2 py-1 rounded hover:bg-slate-800 cursor-pointer"
          >
            {s.title}
          </div>

        ))}

      </div>

      {/* Recent Prompts */}
      <div className="px-3 mt-4">

        <p className="text-xs text-slate-500 mb-2">
          Recent prompts
        </p>

        {recent.map((m) => (

          <div
            key={m.id}
            className="truncate text-xs text-slate-400 px-2 py-1 rounded hover:bg-slate-800"
          >
            {m.content}
          </div>

        ))}

      </div>

      {/* Navigation */}
      <nav className="flex flex-col gap-1 p-3 mt-4">

        <button
          onClick={() => setPage("documents")}
          className="text-left px-3 py-2 rounded-md text-sm text-slate-400 hover:bg-slate-900 cursor-pointer"
        >
          Documents
        </button>

        <button
          onClick={() => setPage("settings")}
          className="text-left px-3 py-2 rounded-md text-sm text-slate-400 hover:bg-slate-900 cursor-pointer"
        >
          Settings
        </button>

        <button
          onClick={() => setPage("analytics")}
          className="text-left px-3 py-2 rounded-md text-sm text-slate-400 hover:bg-slate-900 cursor-pointer"
        >
          Analytics
        </button>

      </nav>

      {/* Account */}
      <div className="mt-auto border-t border-slate-800 p-4">

        <button
          onClick={logout}
          className="text-xs text-red-400 hover:text-red-300 cursor-pointer"
        >
          Logout
        </button>

      </div>

    </aside>
  )
}