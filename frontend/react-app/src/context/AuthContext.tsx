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

      if (res.ok) {
        setAuthenticated(true)
      } else {
        setAuthenticated(false)
      }

    } catch {
      setAuthenticated(false)
    }

    setLoading(false)
  }

  async function logout() {

    await fetch(
      "http://localhost:8000/api/auth/logout",
      {
        method: "POST",
        credentials: "include"
      }
    )

    setAuthenticated(false)
  }

  useEffect(() => {
    checkAuth()
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