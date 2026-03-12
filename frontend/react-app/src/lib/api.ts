export interface DocumentMetadata {
  id: number
  filename: string
  content_type: string
  num_chunks: number
  created_at: string
}

export interface ChatRequest {
  query: string
  top_k?: number
  document_ids?: number[]
}

export interface Citation {
  document_id: number
  filename: string
  page?: number
  chunk_index?: number
}

export interface RetrievedChunk {
  document_id: number
  chunk_index: number
  text: string
  score: number
  filename: string
  page?: number
}

export interface ChatResponse {
  answer: string
  citations: Citation[]
  retrieved_chunks: RetrievedChunk[]
}

const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000'

export async function uploadDocument(file: File): Promise<DocumentMetadata> {
  const formData = new FormData()
  formData.append('file', file)

  const res = await fetch(`${BASE_URL}/api/ingest/upload`, {
    method: 'POST',
    body: formData,
  })

  if (!res.ok) {
    const msg = await res.text()
    throw new Error(msg || 'Failed to upload document')
  }

  const data = (await res.json()) as { document: DocumentMetadata }
  return data.document
}

export async function listDocuments(): Promise<DocumentMetadata[]> {
  const res = await fetch(`${BASE_URL}/api/ingest/documents`)
  if (!res.ok) {
    const msg = await res.text()
    throw new Error(msg || 'Failed to load documents')
  }
  return (await res.json()) as DocumentMetadata[]
}

export async function askQuestion(payload: ChatRequest): Promise<ChatResponse> {
  const res = await fetch(`${BASE_URL}/api/chat/ask`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  })

  if (!res.ok) {
    const msg = await res.text()
    throw new Error(msg || 'Failed to get answer')
  }

  return (await res.json()) as ChatResponse
}

