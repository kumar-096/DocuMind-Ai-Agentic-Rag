import { createContext, useContext, useEffect, useState } from "react"

type AuthContextType = {
  isAuthenticated: boolean
  loading: boolean
  checkAuth: () => Promise<void>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {

  const [isAuthenticated, setAuthenticated] = useState(false)
  const [loading, setLoading] = useState(true)

  async function checkAuth() {
    try {
      const res = await fetch(
        "http://localhost:8000/api/auth/me",
        {
          credentials: "include"
        }
      )

      if (res.status === 401) {
        // ✅ Expected when not logged in
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

    try {
      await fetch(
        "http://localhost:8000/api/auth/logout",
        {
          method: "POST",
          credentials: "include"
        }
      )
    } catch (err) {
      console.error("Logout failed:", err)
    }

    // 🔥 clear local session artifacts
    localStorage.removeItem("active_chat_session")

    setAuthenticated(false)
  }

  useEffect(() => {
    checkAuth().finally(() => {
      setLoading(false)   // ✅ ALWAYS set after check
    })
  }, [])

  return (
    <AuthContext.Provider
      value={{ isAuthenticated, loading, checkAuth, logout }}
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