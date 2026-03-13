export function SourcePanel() {
    return (
      <aside className="w-80 border-l border-slate-800 bg-slate-950 p-4 hidden lg:block">
  
        <h2 className="text-sm font-semibold text-slate-200 mb-3">
          Sources
        </h2>
  
        <p className="text-xs text-slate-400">
          Retrieved document chunks will appear here when you select a citation.
        </p>
  
        <div className="mt-4 rounded-lg border border-slate-800 p-3 text-xs text-slate-400">
          Click a citation in the chat to preview the source text.
        </div>
  
      </aside>
    )
  }