/* =====================================================
   TYPES
===================================================== */

export interface DocumentMetadata {
  id: number
  filename: string
  content_type: string
  num_chunks: number
  created_at: string
}

export interface ChatRequest {
  query: string
  session_id: number
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

export interface ChatSession {
  id: number
  title: string
  created_at: string
}

export interface StoredMessage {
  id: number
  role: "user" | "assistant"
  content: string
}


/* =====================================================
   BASE URL
===================================================== */

const BASE_URL =
  import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000"


/* =====================================================
   GLOBAL ABORT CONTROLLER (🔥 cancellation support)
===================================================== */

let currentController: AbortController | null = null

export function cancelCurrentRequest() {
  if (currentController) {
    currentController.abort()
    currentController = null
  }
}


/* =====================================================
   FETCH WITH TIMEOUT
===================================================== */

export async function fetchWithTimeout(
  url: string,
  options: RequestInit = {},
  timeout = 30000
): Promise<Response> {

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeout)

  const response = await fetch(url, {
    ...options,
    credentials: "include",
    headers: {
      ...(options.headers || {})
    },
    signal: controller.signal
  })

  clearTimeout(timeoutId)
  return response
}


/* =====================================================
   RETRY HELPER
===================================================== */

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


/* =====================================================
   AUTH
===================================================== */

export async function loginUser(email: string, password: string) {

  const res = await retryRequest(() =>
    fetchWithTimeout(`${BASE_URL}/api/auth/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ email, password })
    })
  )

  if (!res.ok) {
    const msg = await res.text()
    throw new Error(msg || "Login failed")
  }

  return res.json()
}

export async function logoutUser() {

  const res = await fetchWithTimeout(`${BASE_URL}/api/auth/logout`, {
    method: "POST"
  })

  if (!res.ok) {
    throw new Error("Logout failed")
  }
}


/* =====================================================
   DOCUMENT INGESTION
===================================================== */

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
  return data.document
}

export async function listDocuments(): Promise<DocumentMetadata[]> {

  const res = await retryRequest(() =>
    fetchWithTimeout(`${BASE_URL}/api/ingest/documents`)
  )

  if (!res.ok) {
    throw new Error("Failed to load documents")
  }

  return res.json()
}

export async function deleteDocument(id: number) {

  const res = await fetchWithTimeout(`${BASE_URL}/api/ingest/documents/${id}`, {
    method: "DELETE"
  })

  if (!res.ok) {
    throw new Error("Failed to delete document")
  }
}


/* =====================================================
   CHAT (🔥 PRODUCTION STREAMING VERSION)
===================================================== */

export function askQuestionSSE(
  payload: ChatRequest,
  onToken: (token: string) => void,
  onDone: () => void,
  onError: (err: any) => void
) {

  const controller = new AbortController()

  fetch(`${BASE_URL}/api/chat/ask`, {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload),
    signal: controller.signal
  })
    .then(res => {

      if (!res.body) throw new Error("No stream")

      const reader = res.body.getReader()
      const decoder = new TextDecoder()

      let buffer = ""

      function read() {
        reader.read().then(({ done, value }) => {

          if (done) {
            onDone()
            return
          }

          buffer += decoder.decode(value, { stream: true })

          let boundary = buffer.indexOf("\n\n")

          while (boundary !== -1) {

            const chunk = buffer.slice(0, boundary)
            buffer = buffer.slice(boundary + 2)

            if (chunk.startsWith("data: ")) {

              try {
                const json = JSON.parse(chunk.replace("data: ", ""))

                if (json.token) {
                  onToken(json.token)
                }

                if (json.done) {
                  onDone()
                  return
                }

                if (json.error) {
                  onError(json.error)
                  return
                }

              } catch (err) {
                console.error("JSON parse error", err)
              }
            }

            boundary = buffer.indexOf("\n\n")
          }

          read()

        }).catch(onError)
      }

      read()

    })
    .catch(onError)

  return () => controller.abort()
}
/* =====================================================
   CHAT SESSIONS
===================================================== */

export async function createSession(): Promise<ChatSession> {

  const res = await fetchWithTimeout(`${BASE_URL}/api/sessions/`, {
    method: "POST"
  })

  if (!res.ok) throw new Error("Failed to create session")

  return res.json()
}

export async function listSessions(): Promise<ChatSession[]> {

  const res = await fetchWithTimeout(`${BASE_URL}/api/sessions/`)

  if (!res.ok) throw new Error("Failed to load sessions")

  return res.json()
}

export async function loadSessionMessages(
  sessionId: number
): Promise<StoredMessage[]> {

  const res = await fetchWithTimeout(
    `${BASE_URL}/api/sessions/${sessionId}/messages`
  )

  if (!res.ok) throw new Error("Failed to load messages")

  return res.json()
}

export async function deleteSession(id: number) {

  const res = await fetchWithTimeout(`${BASE_URL}/api/sessions/${id}`, {
    method: "DELETE"
  })

  if (!res.ok) throw new Error("Failed to delete session")
}