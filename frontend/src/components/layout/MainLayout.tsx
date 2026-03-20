import React from "react"
import { Sidebar } from "./Sidebar"
import { ChatPage } from "../../pages/ChatPage"
import { IngestionPage } from "../../pages/IngestionPage"
import SettingsPage from "../../pages/SettingsPage"

type Page = "chat" | "documents" | "settings"

export function MainLayout() {

  const [page, setPage] = React.useState<Page>("chat")

  return (
    <div className="flex h-screen w-screen bg-slate-950 text-slate-50 overflow-hidden">

      <Sidebar page={page} setPage={setPage} />

      <div className="flex flex-1 overflow-hidden">

        <div className="flex flex-1 flex-col border-l border-slate-800">

          {/* HEADER */}
          <header className="border-b border-slate-800 px-6 py-4 flex justify-between items-center">

            <div>
              <h1 className="text-lg font-semibold">DocuMind AI</h1>
              <p className="text-xs text-slate-400">
                AI document assistant
              </p>
            </div>

            <button
              onClick={() => setPage("settings")}
              className="text-sm text-blue-400 hover:text-blue-300 transition"
            >
              Settings
            </button>

          </header>

          {/* MAIN */}
          <main className="flex-1 overflow-hidden p-4">

            {page === "chat" && <ChatPage />}
            {page === "documents" && <IngestionPage />}
            {page === "settings" && <SettingsPage />}

          </main>

        </div>

      </div>

    </div>
  )
}