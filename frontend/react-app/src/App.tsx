import React from 'react'
import './App.css'
import { ChatPage } from './pages/ChatPage'
import { IngestionPage } from './pages/IngestionPage'

type Tab = 'chat' | 'ingest'

function App() {
  const [tab, setTab] = React.useState<Tab>('chat')

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50">
      <header className="border-b border-slate-800 bg-slate-950/80 px-6 py-4">
        <div className="mx-auto flex max-w-5xl items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold">Agentic RAG</h1>
            <p className="text-xs text-slate-400">
              Production-style document QA with citations
            </p>
          </div>
          <nav className="flex gap-2 text-sm">
            <button
              type="button"
              onClick={() => setTab('chat')}
              className={`rounded-md px-3 py-1.5 ${
                tab === 'chat'
                  ? 'bg-slate-100 text-slate-900'
                  : 'bg-transparent text-slate-300 hover:bg-slate-800'
              }`}
            >
              Chat
            </button>
            <button
              type="button"
              onClick={() => setTab('ingest')}
              className={`rounded-md px-3 py-1.5 ${
                tab === 'ingest'
                  ? 'bg-slate-100 text-slate-900'
                  : 'bg-transparent text-slate-300 hover:bg-slate-800'
              }`}
            >
              Ingestion
            </button>
          </nav>
        </div>
      </header>
      <main className="mx-auto flex max-w-5xl flex-1 flex-col px-4 py-6">
        {tab === 'chat' ? <ChatPage /> : <IngestionPage />}
      </main>
    </div>
  )
}

export default App
