import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom"

import { LoginPage } from "./pages/auth/LoginPage"
import { MainLayout } from "./components/layout/MainLayout"
import SettingsPage from "./pages/SettingsPage"

import { useAuth } from "./context/AuthContext"
import { SourceProvider } from "./context/SourceContext"


function ProtectedRoute({ children }: { children: JSX.Element }) {

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


function AppRoutes() {

  return (
    <Routes>

      {/* LOGIN */}
      <Route path="/login" element={<LoginPage />} />

      {/* MAIN APP */}
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <MainLayout />
          </ProtectedRoute>
        }
      />

      {/* SETTINGS (NEW) */}
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
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </SourceProvider>
  )
}

export default App