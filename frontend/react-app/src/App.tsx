import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom"

import { LoginPage } from "./pages/auth/LoginPage"
import { MainLayout } from "./components/layout/MainLayout"

import { AuthProvider, useAuth } from "./context/AuthContext"
import { SourceProvider } from "./context/SourceContext"
import { ChatProvider } from "./context/ChatContext"


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

      <Route path="/login" element={<LoginPage />} />

      <Route
        path="/"
        element={
          <ProtectedRoute>
            <MainLayout />
          </ProtectedRoute>
        }
      />

    </Routes>
  )
}

function App() {

  return (

    <AuthProvider>
      <ChatProvider>
        <SourceProvider>

          <BrowserRouter>
            <AppRoutes />
          </BrowserRouter>

        </SourceProvider>
      </ChatProvider>
    </AuthProvider>

  )
}

export default App