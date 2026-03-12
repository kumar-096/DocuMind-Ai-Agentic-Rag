import { useEffect, useState } from 'react'
import type { DocumentMetadata } from '../lib/api'
import { listDocuments, uploadDocument } from '../lib/api'

export function IngestionPage() {
  const [documents, setDocuments] = useState<DocumentMetadata[]>([])
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function refreshDocuments() {
    try {
      const docs = await listDocuments()
      setDocuments(docs)
    } catch (err) {
      console.error(err)
      setError(err instanceof Error ? err.message : 'Failed to load documents')
    }
  }

  useEffect(() => {
    void refreshDocuments()
  }, [])

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setError(null)
    setUploading(true)
    try {
      await uploadDocument(file)
      await refreshDocuments()
    } catch (err) {
      console.error(err)
      setError(err instanceof Error ? err.message : 'Upload failed')
    } finally {
      setUploading(false)
      e.target.value = ''
    }
  }

  return (
    <div className="flex h-full flex-col gap-4">
      <div className="rounded-lg border border-dashed border-slate-700 bg-slate-900/40 p-6 text-center">
        <p className="mb-3 text-sm text-slate-300">
          Upload PDF, TXT, or DOCX files to make them searchable.
        </p>
        <label className="inline-flex cursor-pointer items-center justify-center rounded-md bg-slate-800 px-4 py-2 text-sm font-medium text-slate-100 hover:bg-slate-700">
          <input
            type="file"
            accept=".pdf,.txt,.docx"
            className="hidden"
            onChange={handleFileChange}
            disabled={uploading}
          />
          {uploading ? 'Uploading…' : 'Choose file'}
        </label>
        {error && <p className="mt-2 text-xs text-red-400">{error}</p>}
      </div>

      <div className="flex-1 overflow-y-auto rounded-lg border border-slate-800 bg-slate-900/40 p-4">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-100">Indexed documents</h2>
          <button
            type="button"
            onClick={() => void refreshDocuments()}
            className="rounded-md border border-slate-700 px-2 py-1 text-xs text-slate-200 hover:bg-slate-800"
          >
            Refresh
          </button>
        </div>
        {documents.length === 0 ? (
          <p className="text-xs text-slate-400">
            No documents ingested yet. Upload a file to get started.
          </p>
        ) : (
          <table className="w-full border-collapse text-left text-xs text-slate-200">
            <thead className="border-b border-slate-700 text-slate-400">
              <tr>
                <th className="py-2 pr-2">Name</th>
                <th className="py-2 pr-2">Type</th>
                <th className="py-2 pr-2 text-right">Chunks</th>
                <th className="py-2 pr-2">Created</th>
              </tr>
            </thead>
            <tbody>
              {documents.map((d) => (
                <tr key={d.id} className="border-b border-slate-800 last:border-b-0">
                  <td className="py-2 pr-2">{d.filename}</td>
                  <td className="py-2 pr-2 text-slate-400">{d.content_type}</td>
                  <td className="py-2 pr-2 text-right">{d.num_chunks}</td>
                  <td className="py-2 pr-2 text-slate-400">
                    {new Date(d.created_at).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

