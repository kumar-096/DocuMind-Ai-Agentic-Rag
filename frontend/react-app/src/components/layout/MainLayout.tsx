import React from "react"
import { Sidebar } from "./Sidebar"
import { ChatPage } from "../../pages/ChatPage"
import { IngestionPage } from "../../pages/IngestionPage"
import { SourcePanel } from "./SourcePanel"

const Page = {
  CHAT: "chat",
  DOCUMENTS: "documents",
  SETTINGS: "settings",
  ANALYTICS: "analytics"
}

export function MainLayout() {
  const [page, setPage] = React.useState(Page.CHAT)

  return (
    <div className="flex h-screen w-screen bg-slate-950 text-slate-100">

      {/* Sidebar */}
      <Sidebar page={page} setPage={setPage} />

      {/* Main Workspace */}
      <div className="flex flex-1 overflow-hidden">

        {/* Chat / Content */}
        <div className="flex flex-1 flex-col border-l border-slate-800 border-r border-slate-800">

          {/* Header */}
          <header className="border-b border-slate-800 px-6 py-4">
            <h1 className="text-lg font-semibold">Agentic RAG</h1>
            <p className="text-xs text-slate-400">
              Production-grade document QA assistant
            </p>
          </header>

          {/* Page */}
          <main className="flex-1 overflow-hidden p-4">

            {page === Page.CHAT && <ChatPage />}

            {page === Page.DOCUMENTS && <IngestionPage />}

            {page === Page.SETTINGS && (
              <div className="text-sm text-slate-400">
                Settings panel coming soon
              </div>
            )}

            {page === Page.ANALYTICS && (
              <div className="text-sm text-slate-400">
                Analytics dashboard coming soon
              </div>
            )}

          </main>

        </div>

        {/* Source Panel */}
        {page === Page.CHAT && <SourcePanel />}

      </div>
    </div>
  )
}