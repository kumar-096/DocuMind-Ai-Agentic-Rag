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
   GLOBAL ABORT CONTROLLER (FIXED)
===================================================== */

let currentController: AbortController | null = null

export function cancelCurrentRequest() {
  if (currentController) {
    currentController.abort()
    currentController = null
  }
}

/* =====================================================
   FETCH WITH TIMEOUT (IMPROVED)
===================================================== */

export async function fetchWithTimeout(
  url: string,
  options: RequestInit = {},
  timeout = 30000
): Promise<Response> {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeout)

  const isFormData = options.body instanceof FormData

  const response = await fetch(url, {
    ...options,
    credentials: "include",
    headers: {
      ...(isFormData ? {} : { "Content-Type": "application/json" }),
      ...(options.headers || {})
    },
    signal: controller.signal
  })

  clearTimeout(timeoutId)
  return response
}

/* =====================================================
   RETRY HELPER (SAFE)
===================================================== */

async function retryRequest(
  fn: () => Promise<Response>,
  retries = 2
): Promise<Response> {

  try {
    const res = await fn()

    // retry only server errors
    if (!res.ok && res.status >= 500 && retries > 0) {
      await new Promise(r => setTimeout(r, 500))
      return retryRequest(fn, retries - 1)
    }

    return res

  } catch (error) {
    if (retries <= 0) throw error
    await new Promise(r => setTimeout(r, 500))
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

export async function uploadDocument(file: File): Promise<DocumentMetadata> {

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
   CHAT (SSE FIXED PROPERLY)
===================================================== */

function getCSRFToken() {
  const match = document.cookie.match(/csrf_token=([^;]+)/)
  return match ? match[1] : ""
}

export function askQuestionSSE(
  payload: ChatRequest,
  onToken: (token: string) => void,
  onDone: () => void,
  onError: (err: any) => void
) { 
  console.log("🌐 askQuestionSSE called", payload)
  currentController = new AbortController()
  let completed = false   //  prevent duplicate onDone

  fetch(`${BASE_URL}/api/chat/ask`, {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      "X-CSRF-Token": getCSRFToken()
    },
    body: JSON.stringify(payload),
    signal: currentController.signal
  })
    .then(async res => {
      if (!res.ok) {
        const text = await res.text()
        throw new Error(text || "Request failed")
      }

      if (!res.body) throw new Error("No stream")

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ""

      function finish() {
        if (!completed) {
          completed = true
          onDone()
        }
      }

      function read() {
        reader.read().then(({ done, value }) => {
          if (done) {
            finish()
            return
          }

          buffer += decoder.decode(value, { stream: true })

          let boundary = buffer.indexOf("\n\n")

          while (boundary !== -1) {
            const chunk = buffer.slice(0, boundary)
            buffer = buffer.slice(boundary + 2)

            if (chunk.startsWith("data: ")) {
              try {
                const parsed = JSON.parse(chunk.replace("data: ", ""))

                if (parsed.token) onToken(parsed.token)

                if (parsed.error) {
                  onError(parsed.error)
                  finish()
                  return
                }

                if (parsed.done) {
                  finish()
                  return
                }

              } catch (err) {
                console.error("SSE parse error:", err)
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

  return () => {
    if (currentController) {
      currentController.abort()
      currentController = null
    }
  }
}

/* =====================================================
   CHAT SESSIONS
===================================================== */

export async function createSession(): Promise<ChatSession> {
  const res = await fetchWithAuth(`${BASE_URL}/api/sessions/`, {
    method: "POST"
  })

  if (!res.ok) throw new Error("Failed to create session")

  return res.json()
}

export async function listSessions(): Promise<ChatSession[]> {
  const res = await fetchWithAuth(`${BASE_URL}/api/sessions/`)

  if (!res.ok) throw new Error("Failed to load sessions")

  return res.json()
}

export async function loadSessionMessages(
  sessionId: number
): Promise<StoredMessage[]> {
  const res = await fetchWithAuth(
    `${BASE_URL}/api/sessions/${sessionId}/messages`
  )

  if (res.status === 404) {
    throw new Error("SESSION_NOT_FOUND")
  }

  if (!res.ok) {
    throw new Error("Failed to load messages")
  }

  return res.json()
}

export async function deleteSession(id: number) {
  const res = await fetchWithAuth(
    `${BASE_URL}/api/sessions/${id}`,
    {
      method: "DELETE"
    }
  )

  if (!res.ok) throw new Error("Failed to delete session")
}
/* =====================================================
   AUTH FETCH FIX
===================================================== */

export async function fetchWithAuth(url: string, options: RequestInit = {}) {

  let res = await fetch(url, {
    ...options,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      "X-CSRF-Token": getCSRFToken(),
      ...(options.headers || {})
    }
  })

  if (res.status === 401) {

    const refreshRes = await fetch(
      `${BASE_URL}/api/auth/refresh`,
      { method: "POST", credentials: "include" }
    )

    if (!refreshRes.ok) {
      return res
    }

    res = await fetch(url, {
      ...options,
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        "X-CSRF-Token": getCSRFToken(),
        ...(options.headers || {})
      }
    })
  }

  return res
}

/* =====================================================
   SETTINGS
===================================================== */

export async function getSettings() {
  const res = await fetchWithAuth(`${BASE_URL}/api/settings/`)
  if (!res.ok) throw new Error("Failed to fetch settings")
  return res.json()
}

export async function updateSettings(data: any) {

  const csrf = document.cookie
    .split("; ")
    .find(row => row.startsWith("csrf_token="))
    ?.split("=")[1]

  const res = await fetchWithAuth(`${BASE_URL}/api/settings/`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      "X-CSRF-Token": csrf || ""
    },
    body: JSON.stringify(data)
  })

  if (!res.ok) throw new Error("Failed to update settings")

  return res.json()
}