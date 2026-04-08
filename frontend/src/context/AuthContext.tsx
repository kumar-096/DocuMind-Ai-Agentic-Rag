import { createContext, useContext, useEffect, useState } from "react"
import { fetchWithAuth } from "../lib/api"

const BASE_URL =
  import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000"

type AuthContextType = {
  isAuthenticated: boolean
  loading: boolean
  checkAuth: () => Promise<void>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | null>(null)

export function AuthProvider({
  children
}: {
  children: React.ReactNode
}) {
  const [isAuthenticated, setAuthenticated] = useState(false)
  const [loading, setLoading] = useState(true)

  async function checkAuth() {
    try {
      const res = await fetchWithAuth(
        `${BASE_URL}/api/auth/me`
      )

      if (res.status === 401) {
        setAuthenticated(false)
        return
      }

      if (!res.ok) {
        throw new Error("Auth failed")
      }

      setAuthenticated(true)
    } catch (err) {
      console.error("Auth check error:", err)
      setAuthenticated(false)
    }
  }

  async function logout() {
    const confirmLogout = window.confirm(
      "Are you sure you want to logout?"
    )

    if (!confirmLogout) return

    try {
      await fetch(`${BASE_URL}/api/auth/logout`, {
        method: "POST",
        credentials: "include"
      })
    } catch (err) {
      console.error("Logout failed:", err)
    }

    localStorage.removeItem("active_chat_session")
    setAuthenticated(false)
  }

  useEffect(() => {
    checkAuth().finally(() => {
      setLoading(false)
    })
  }, [])

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated,
        loading,
        checkAuth,
        logout
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)

  if (!ctx) {
    throw new Error("AuthContext missing")
  }

  return ctx
}