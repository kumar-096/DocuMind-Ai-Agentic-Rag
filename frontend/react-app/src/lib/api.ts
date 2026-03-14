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

const BASE_URL =
  import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000"


/* ---------- Fetch with timeout ---------- */

export async function fetchWithTimeout(
  url: string,
  options: RequestInit = {},
  timeout = 30000
) {

  const controller = new AbortController()

  const timeoutId = setTimeout(() => controller.abort(), timeout)

  const response = await fetch(url, {
    ...options,
    signal: controller.signal
  })

  clearTimeout(timeoutId)

  return response
}


/* ---------- Retry helper ---------- */

async function retryRequest(
  fn: () => Promise<Response>,
  retries = 2
): Promise<Response> {

  try {
    return await fn()
  } catch (error) {

    if (retries <= 0) throw error

    await new Promise((r) => setTimeout(r, 500))

    return retryRequest(fn, retries - 1)
  }
}


/* ---------- Upload document ---------- */

export async function uploadDocument(
  file: File
): Promise<DocumentMetadata> {

  const formData = new FormData()
  formData.append("file", file)

  const res = await retryRequest(() =>
    fetchWithTimeout(`${BASE_URL}/api/ingest/upload`, {
      method: "POST",
      body: formData
    })
  )

  if (!res.ok) {
    const msg = await res.text()
    throw new Error(msg || "Failed to upload document")
  }

  const data = await res.json()

  return data.document as DocumentMetadata
}


/* ---------- List documents ---------- */

export async function listDocuments(): Promise<DocumentMetadata[]> {

  const res = await retryRequest(() =>
    fetchWithTimeout(`${BASE_URL}/api/ingest/documents`)
  )

  if (!res.ok) {
    const msg = await res.text()
    throw new Error(msg || "Failed to load documents")
  }

  return await res.json()
}


/* ---------- Delete document ---------- */

/* ---------- Delete document ---------- */

export async function deleteDocument(id: number) {

  const res = await retryRequest(() =>
    fetchWithTimeout(`${BASE_URL}/api/ingest/documents/${id}`, {
      method: "DELETE"
    })
  )

  if (!res.ok) {
    const msg = await res.text()
    throw new Error(msg || "Failed to delete document")
  }

}


/* ---------- Ask question ---------- */

export async function askQuestion(
  payload: ChatRequest
): Promise<ChatResponse> {

  const res = await retryRequest(() =>
    fetchWithTimeout(`${BASE_URL}/api/chat/ask`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    })
  )

  if (!res.ok) {
    const msg = await res.text()
    throw new Error(msg || "Failed to get answer")
  }

  const data = await res.json()

  return data as ChatResponse
}