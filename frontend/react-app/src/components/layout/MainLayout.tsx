import React from "react"
import { Sidebar } from "./Sidebar"
import { SourcePanel } from "./SourcePanel"
import { ChatPage } from "../../pages/ChatPage"
import { IngestionPage } from "../../pages/IngestionPage"
import SettingsPage from "../../pages/SettingsPage"

type Page = "chat" | "documents" | "settings" | "analytics"

export function MainLayout() {

  const [page, setPage] = React.useState<Page>("chat")

  return (
    <div className="flex h-screen w-screen bg-slate-950 text-slate-50 overflow-hidden">

      {/* Sidebar */}
      <Sidebar page={page} setPage={setPage} />

      {/* Main workspace */}
      <div className="flex flex-1 overflow-hidden">

        {/* Center content */}
        <div className="flex flex-1 flex-col border-l border-r border-slate-800">

          {/* Header */}
          <header className="border-b border-slate-800 bg-slate-950 px-6 py-4 flex justify-between items-center">

            <div>
              <h1 className="text-lg font-semibold">Agentic RAG</h1>
              <p className="text-xs text-slate-400">
                Production-grade document QA assistant
              </p>
            </div>

            {/* ✅ SETTINGS BUTTON */}
            <button
              onClick={() => setPage("settings")}
              className="text-sm text-blue-400 hover:text-blue-300"
            >
              Settings
            </button>

          </header>

          {/* Page Content */}
          <main className="flex-1 overflow-hidden p-4">

            {page === "chat" && <ChatPage />}

            {page === "documents" && <IngestionPage />}

            {page === "settings" && <SettingsPage />}

            {page === "analytics" && (
              <div className="text-sm text-slate-400">
                Analytics dashboard coming soon
              </div>
            )}

          </main>

        </div>

        {/* Right panel */}
        {page === "chat" && <SourcePanel />}

      </div>

    </div>
  )
}