import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode
} from "react"
import { fetchWithAuth } from "../lib/api"

const BASE_URL =
  import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000"

type AuthContextType = {
  isAuthenticated: boolean
  loading: boolean
  checkAuth: () => Promise<boolean>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(
  undefined
)

type AuthProviderProps = {
  children: ReactNode
}

export function AuthProvider({
  children
}: AuthProviderProps) {
  const [isAuthenticated, setAuthenticated] = useState(false)
  const [loading, setLoading] = useState(true)

  async function checkAuth(): Promise<boolean> {
    setLoading(true)

    try {
      const res = await fetchWithAuth(
        `${BASE_URL}/api/auth/me`
      )

      if (!res.ok) {
        setAuthenticated(false)
        return false
      }

      setAuthenticated(true)
      return true
    } catch (err) {
      console.error("Auth check error:", err)
      setAuthenticated(false)
      return false
    } finally {
      setLoading(false)
    }
  }

  async function logout(): Promise<void> {
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
    } finally {
      localStorage.removeItem("active_chat_session")
      setAuthenticated(false)
    }
  }

  useEffect(() => {
    checkAuth()
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

export function useAuth(): AuthContextType {
  const ctx = useContext(AuthContext)

  if (ctx === undefined) {
    throw new Error(
      "useAuth must be used inside AuthProvider"
    )
  }

  return ctx
}