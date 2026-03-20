import { useEffect, useState } from 'react'
import type { DocumentMetadata } from '../lib/api'
import { listDocuments, uploadDocument, deleteDocument } from '../lib/api'
import { ConfirmModal } from '../components/ui/ConfirmModal'

export function IngestionPage() {

  const [documents, setDocuments] = useState<DocumentMetadata[]>([])
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedDoc, setSelectedDoc] = useState<number | null>(null)

  async function refreshDocuments() {
    try {
      const docs = await listDocuments()
      setDocuments(docs)
    } catch (err) {
      console.error(err)
      setError('Failed to load documents')
    }
  }

  useEffect(() => {
    refreshDocuments()
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
      setError('Upload failed')
    } finally {
      setUploading(false)
      e.target.value = ''
    }
  }

  async function handleDelete() {
    if (!selectedDoc) return
    try {
      await deleteDocument(selectedDoc)
      setSelectedDoc(null)
      refreshDocuments()
    } catch (err) {
      console.error(err)
      setError('Delete failed')
    }
  }

  return (
    <div className="flex h-full flex-col gap-4">

      {/* DELETE CONFIRM */}
      <ConfirmModal
        open={!!selectedDoc}
        title="Delete Document"
        message="This action cannot be undone."
        onConfirm={handleDelete}
        onCancel={() => setSelectedDoc(null)}
      />

      {/* Upload */}
      <div className="rounded-lg border border-dashed border-slate-700 bg-slate-900/40 p-6 text-center">

        <p className="mb-3 text-sm text-slate-300">
          Upload PDF, TXT, or DOCX files to make them searchable.
        </p>

        <label className="inline-flex cursor-pointer items-center justify-center rounded-md bg-slate-800 px-4 py-2 text-sm font-medium text-slate-100 hover:bg-slate-700 transition">

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

      {/* Documents */}
      <div className="flex-1 overflow-y-auto rounded-lg border border-slate-800 bg-slate-900/40 p-4">

        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-100">
            Indexed documents
          </h2>

          <button
            onClick={refreshDocuments}
            className="text-xs text-slate-300 hover:text-white transition cursor-pointer"
          >
            Refresh
          </button>
        </div>

        {documents.length === 0 ? (

          <p className="text-xs text-slate-400">
            No documents uploaded yet.
          </p>

        ) : (

          <table className="w-full text-xs text-slate-200">

            <thead className="text-slate-400 border-b border-slate-700">
              <tr>
                <th className="py-2 text-left">Name</th>
                <th>Type</th>
                <th>Chunks</th>
                <th>Created</th>
                <th></th>
              </tr>
            </thead>

            <tbody>

              {documents.map((d) => (

                <tr key={d.id} className="border-b border-slate-800">

                  <td className="py-2">{d.filename}</td>
                  <td className="text-slate-400">{d.content_type}</td>
                  <td>{d.num_chunks}</td>
                  <td className="text-slate-400">
                    {new Date(d.created_at).toLocaleString()}
                  </td>

                  <td>
                    <button
                      onClick={() => setSelectedDoc(d.id)}
                      className="text-red-400 hover:text-red-300 cursor-pointer"
                    >
                      Delete
                    </button>
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