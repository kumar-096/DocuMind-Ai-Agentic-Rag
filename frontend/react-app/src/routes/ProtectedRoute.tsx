import { Navigate } from "react-router-dom"
import { useAuth } from "../context/AuthContext"

export function ProtectedRoute({
  children
}: {
  children: JSX.Element
}) {

  const { isAuthenticated, loading } = useAuth()

  // 🔵 Step 1: wait for auth resolution
  if (loading) {
    return (
      <div style={{ textAlign: "center", marginTop: "100px" }}>
        Loading...
      </div>
    )
  }

  // 🔴 Step 2: block unauthenticated users
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  // 🟢 Step 3: allow access
  return children
}