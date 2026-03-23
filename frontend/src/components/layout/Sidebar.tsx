import { useEffect, useState } from "react"
import { useChat } from "../../context/ChatContext"
import { useAuth } from "../../context/AuthContext"
import type { ChatSession } from "../../lib/api"
import { ConfirmModal } from "../ui/ConfirmModal"
import { fetchWithAuth } from "../../lib/api"

const BASE_URL =
  import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000"

type Page = "chat" | "documents" | "settings"

type SidebarProps = {
  page: Page
  setPage: (page: Page) => void
}

export function Sidebar({ page, setPage }: SidebarProps) {

  const { messages, setMessages, setSessionId } = useChat()
  const { logout } = useAuth()

  const [sessions, setSessions] = useState<ChatSession[]>([])
  const [showLogoutModal, setShowLogoutModal] = useState(false)

  const [search, setSearch] = useState("")
  const [menuOpen, setMenuOpen] = useState<number | null>(null)
  const [renameId, setRenameId] = useState<number | null>(null)
  const [renameValue, setRenameValue] = useState("")
  const [deleteId, setDeleteId] = useState<number | null>(null)

  const [showArchived, setShowArchived] = useState(false)

  /* ---------------- LOAD SESSIONS ---------------- */
  async function loadSessions(searchQuery = "") {
    try {
      const res = await fetchWithAuth(
        `${BASE_URL}/api/sessions/?search=${searchQuery}&include_archived=${showArchived}`
      )

      if (!res.ok) {
        const text = await res.text()
        console.error("Backend error:", text)
        return
      }

      const data = await res.json()
      setSessions(data)

    } catch (err) {
      console.error("Fetch failed:", err)
    }
  }

  /* ---------------- DEBOUNCE SEARCH ---------------- */
  useEffect(() => {
    const delay = setTimeout(() => {
      loadSessions(search)
    }, 300)

    return () => clearTimeout(delay)
  }, [search, showArchived])

  /* ---------------- INITIAL LOAD ---------------- */
  useEffect(() => {
    loadSessions()
  }, [])

  /* ---------------- CREATE SESSION ---------------- */
  async function handleNewChat() {
    try {
      const res = await fetchWithAuth(`${BASE_URL}/api/sessions/`, {
        method: "POST"
      })

      if (!res.ok) throw new Error("Create session failed")

      const session = await res.json()

      setSessionId(session.id)
      setMessages([])

      await loadSessions()
      setPage("chat")

    } catch (err) {
      console.error(err)
    }
  }

  /* ---------------- PIN ---------------- */
  async function togglePin(id: number) {
    try {
      await fetchWithAuth(`${BASE_URL}/api/sessions/${id}/pin`, {
        method: "PUT"
      })
      loadSessions(search)
    } catch (err) {
      console.error(err)
    }
  }

  /* ---------------- DELETE ---------------- */
  async function handleDelete() {
    if (!deleteId) return

    try {
      await fetchWithAuth(`${BASE_URL}/api/sessions/${deleteId}`, {
        method: "DELETE"
      })
      setDeleteId(null)
      loadSessions(search)
    } catch (err) {
      console.error(err)
    }
  }

  /* ---------------- RENAME ---------------- */
  async function handleRename() {
    if (!renameId || !renameValue.trim()) return

    try {
      await fetchWithAuth(`${BASE_URL}/api/sessions/${renameId}/rename`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ title: renameValue })
      })

      setRenameId(null)
      setRenameValue("")
      loadSessions(search)

    } catch (err) {
      console.error(err)
    }
  }

  /* ---------------- ARCHIVE ---------------- */
  async function handleArchive(id: number) {
    try {
      await fetchWithAuth(`${BASE_URL}/api/sessions/${id}/archive`, {
        method: "PUT"
      })
      loadSessions(search)
    } catch (err) {
      console.error(err)
    }
  }

  const recent = messages
    .filter((m) => m.role === "user")
    .slice(-5)

  return (

    <aside className="w-64 border-r border-slate-800 bg-slate-950 flex flex-col">

      {/* MODALS */}
      <ConfirmModal
        open={showLogoutModal}
        title="Logout"
        message="Are you sure you want to logout?"
        onConfirm={logout}
        onCancel={() => setShowLogoutModal(false)}
      />

      <ConfirmModal
        open={!!deleteId}
        title="Delete Chat"
        message="This cannot be undone"
        onConfirm={handleDelete}
        onCancel={() => setDeleteId(null)}
      />

      <ConfirmModal
        open={!!renameId}
        title="Rename Chat"
        message={
          <input
            value={renameValue}
            onChange={(e) => setRenameValue(e.target.value)}
            className="w-full mt-2 p-2 bg-slate-800 rounded text-sm text-white outline-none"
          />
        }
        onConfirm={handleRename}
        onCancel={() => setRenameId(null)}
      />

      {/* HEADER */}
      <div className="mb-6 flex items-center justify-center gap-2 text-white text-lg font-semibold tracking-wide">
        <span className="text-xl">🧠</span>
        <span>DocuMind</span>
        <span className="text-blue-400 text-sm">AI</span>
      </div>

      {/* SEARCH */}
      <div className="p-3">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search chats..."
          className="w-full bg-slate-900 px-2 py-2 text-xs rounded outline-none text-white"
        />
      </div>

      {/* ARCHIVE TOGGLE */}
      <div className="px-3 pb-2">
        <button
          onClick={() => setShowArchived(!showArchived)}
          className="text-xs text-slate-400 hover:text-white transition cursor-pointer"
        >
          {showArchived ? "← Back to Chats" : "View Archived"}
        </button>
      </div>

      {/* NEW CHAT */}
      <div className="px-3 pb-2">
        <button
          onClick={handleNewChat}
          className="w-full bg-blue-600 py-2 rounded text-sm hover:bg-blue-500 transition cursor-pointer"
        >
          + New Chat
        </button>
      </div>

      {/* SESSIONS */}
      <div className="px-3 overflow-y-auto space-y-1">

        {sessions.map((s: any) => (

          <div
            key={s.id}
            className="group relative flex items-center justify-between px-2 py-1 rounded hover:bg-slate-800 transition cursor-pointer"
          >

            <div
              onClick={() => {
                setSessionId(s.id)
                setPage("chat")
              }}
              className="truncate text-xs text-slate-300 flex-1 cursor-pointer"
            >
              {s.title}
            </div>

            {/* PIN */}
            <button
              onClick={() => togglePin(s.id)}
              className="text-yellow-400 text-xs mr-1 cursor-pointer"
            >
              {s.is_pinned ? "★" : "☆"}
            </button>

            {/* MENU */}
            <div
              onClick={() => setMenuOpen(menuOpen === s.id ? null : s.id)}
              className="opacity-0 group-hover:opacity-100 cursor-pointer"
            >
              ⋮
            </div>

            {/* DROPDOWN */}
            {menuOpen === s.id && (
              <div className="absolute right-0 top-6 bg-slate-900 border border-slate-700 rounded w-28 z-50 shadow">

                <button
                  onClick={() => {
                    setRenameId(s.id)
                    setMenuOpen(null)
                  }}
                  className="block w-full text-left px-3 py-2 text-xs hover:bg-slate-800 cursor-pointer"
                >
                  Rename
                </button>

                {!showArchived && (
                  <button
                    onClick={() => {
                      handleArchive(s.id)
                      setMenuOpen(null)
                    }}
                    className="block w-full text-left px-3 py-2 text-xs hover:bg-slate-800 cursor-pointer"
                  >
                    Archive
                  </button>
                )}

                <button
                  onClick={() => {
                    setDeleteId(s.id)
                    setMenuOpen(null)
                  }}
                  className="block w-full text-left px-3 py-2 text-xs text-red-400 hover:bg-slate-800 cursor-pointer"
                >
                  Delete
                </button>

              </div>
            )}

          </div>

        ))}

      </div>

      {/* RECENT */}
      <div className="px-3 mt-4">
        <p className="text-xs text-slate-500 mb-2">Recent</p>
        {recent.map((m) => (
          <div key={m.id} className="text-xs text-slate-400 truncate">
            {m.content}
          </div>
        ))}
      </div>

      {/* NAV */}
      <nav className="flex flex-col gap-1 p-3 mt-4">

        <button
          onClick={() => setPage("documents")}
          className="text-left px-3 py-2 rounded-md text-sm text-slate-400 hover:bg-slate-900 hover:text-white transition cursor-pointer"
        >
          Documents
        </button>

        <button
          onClick={() => setPage("settings")}
          className="text-left px-3 py-2 rounded-md text-sm text-slate-400 hover:bg-slate-900 hover:text-white transition cursor-pointer"
        >
          Settings
        </button>

      </nav>

      {/* LOGOUT */}
      <div className="mt-auto">

        <div className="border-t border-slate-700"></div>

        <div className="p-4">
          <button
            onClick={() => setShowLogoutModal(true)}
            className="w-full text-left text-sm text-slate-300 hover:text-red-400 transition cursor-pointer"
          >
            Logout
          </button>
        </div>

      </div>

    </aside>
  )
}