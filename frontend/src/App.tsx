import {
  BrowserRouter,
  Routes,
  Route,
  Navigate
} from "react-router-dom"

import { LoginPage } from "./pages/auth/LoginPage"
import { MainLayout } from "./components/layout/MainLayout"
import SettingsPage from "./pages/SettingsPage"

import { useAuth } from "./context/AuthContext"
import { SourceProvider } from "./context/SourceContext"
import { ToastProvider } from "./context/ToastContext"

function ProtectedRoute({
  children
}: {
  children: JSX.Element
}) {
  const { isAuthenticated, loading } = useAuth()

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-slate-950 text-white">
        Loading...
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  return children
}

function PublicRoute({
  children
}: {
  children: React.ReactNode
}) {
  const { loading, isAuthenticated } = useAuth()

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-slate-950 text-white">
        Loading...
      </div>
    )
  }

  if (isAuthenticated) {
    return <Navigate to="/" replace />
  }

  return <>{children}</>
}

function AppRoutes() {
  return (
    <Routes>
      <Route
        path="/login"
        element={
          <PublicRoute>
            <LoginPage />
          </PublicRoute>
        }
      />

      <Route
        path="/"
        element={
          <ProtectedRoute>
            <MainLayout />
          </ProtectedRoute>
        }
      />

      <Route
        path="/settings"
        element={
          <ProtectedRoute>
            <SettingsPage />
          </ProtectedRoute>
        }
      />
    </Routes>
  )
}

function App() {
  return (
    <SourceProvider>
      <ToastProvider>
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </ToastProvider>
    </SourceProvider>
  )
}

export default App