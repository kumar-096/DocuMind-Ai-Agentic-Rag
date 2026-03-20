import { useSource } from "../../context/SourceContext"

export function SourcePanel() {

  const { source } = useSource()

  if (!source) {
    return (
      <aside className="hidden lg:flex w-80 border-l border-slate-800 p-4 text-xs text-slate-400">
        Click a citation to preview source
      </aside>
    )
  }

  return (
    <aside className="hidden lg:flex w-80 flex-col border-l border-slate-800 bg-slate-950">

      <div className="border-b border-slate-800 px-4 py-3">
        <h2 className="text-sm font-semibold text-slate-200">
          {source.filename}
        </h2>
        {source.page && (
          <p className="text-xs text-slate-500">Page {source.page}</p>
        )}
      </div>

      <div className="p-4 text-sm text-slate-300 overflow-y-auto">

        <div className="bg-slate-900 p-3 rounded border border-slate-700 whitespace-pre-wrap">
          {source.text || "Preview not available"}
        </div>

      </div>

    </aside>
  )
}