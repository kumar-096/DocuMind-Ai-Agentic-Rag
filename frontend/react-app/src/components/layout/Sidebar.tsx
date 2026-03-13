import React from "react"

type Page = "chat" | "documents" | "settings" | "analytics"

type SidebarProps = {
  page: Page
  setPage: (page: Page) => void
}

export function Sidebar({ page, setPage }: SidebarProps) {

  const items = [
    { id: "chat", label: "Chat" },
    { id: "documents", label: "Documents" },
    { id: "settings", label: "Settings" },
    { id: "analytics", label: "Analytics" }
  ]

  return (
    <aside className="w-64 border-r border-slate-800 bg-slate-950 flex flex-col">

      {/* Logo */}
      <div className="px-5 py-5 border-b border-slate-800">
        <h2 className="text-md font-semibold text-white">
          Agentic RAG
        </h2>
        <p className="text-xs text-slate-400">
          AI Knowledge Assistant
        </p>
      </div>

      {/* Navigation */}
      <nav className="flex flex-col gap-1 p-3">

        {items.map((item) => (

          <button
            key={item.id}
            onClick={() => setPage(item.id as Page)}
            className={`text-left px-3 py-2 rounded-md text-sm transition ${
              page === item.id
                ? "bg-slate-800 text-white"
                : "text-slate-400 hover:bg-slate-900"
            }`}
          >
            {item.label}
          </button>

        ))}

      </nav>

      {/* Footer */}
      <div className="mt-auto border-t border-slate-800 p-4 text-xs text-slate-500">
        Built with FastAPI + React
      </div>

    </aside>
  )
}