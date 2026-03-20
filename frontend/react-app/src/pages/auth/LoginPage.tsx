import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { useAuth } from "../../context/AuthContext"
import { GoogleLogin } from "@react-oauth/google"

export function LoginPage() {

  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)

  const navigate = useNavigate()
  const { checkAuth } = useAuth()
  const [error, setError] = useState("")
  /* ---------------- EMAIL LOGIN ---------------- */

  async function handleLogin(e: React.FormEvent) {

    e.preventDefault()
    setLoading(true)

    try {

      const res = await fetch(
        "http://localhost:8000/api/auth/login",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          credentials: "include",
          body: JSON.stringify({ email, password })
        }
      )

      if (!res.ok) {
        setError("Invalid email or password")
        setLoading(false)
        return
      }

      // 🔥 allow cookie to be set before checking auth
      await new Promise((r) => setTimeout(r, 300))

      await checkAuth()
      navigate("/")

    } catch (err) {
      console.error(err)
      alert("Login failed")
    }

    setLoading(false)
  }

  /* ---------------- GOOGLE LOGIN ---------------- */

  async function handleGoogleLogin(token: string | undefined) {

    console.log("🔥 GOOGLE TOKEN:", token)
  
    if (!token) {
      alert("Google login failed")
      return
    }
  
    try {
      const res = await fetch(
        "http://localhost:8000/api/auth/google",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          credentials: "include",
          body: JSON.stringify({ token })
        }
      )
      console.log("GOOGLE LOGIN RESPONSE:", res.status)
      if (!res.ok) {
        const text = await res.text()
        console.error("Backend error:", text)
        setError("Google authentication failed")
        return
      }
  
      // 🔥 force browser to reload so cookies apply
      window.location.href = "/"
  
    } catch (err) {
      console.error(err)
      setError("Google login error")
    }
  }

  return (

    <div className="h-screen flex items-center justify-center bg-slate-950">

      <div className="w-[420px] bg-slate-900 p-8 rounded-xl space-y-6">

        <h1 className="text-xl font-semibold text-white">
          Sign in
        </h1>
        {error && (
          <div className="text-red-500 text-sm text-center">
            {error}
          </div>
        )}

        {/* EMAIL LOGIN */}
        <form onSubmit={handleLogin} className="space-y-4">

          <input
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full p-2 rounded bg-slate-800 text-white"
          />

          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full p-2 rounded bg-slate-800 text-white"
          />

          <button
            disabled={loading}
            className="w-full bg-blue-600 py-2 rounded text-white"
          >
            {loading ? "Signing in..." : "Sign in"}
          </button>

        </form>

        {/* DIVIDER */}
        <div className="text-center text-slate-400 text-sm">
          OR
        </div>

        {/* GOOGLE LOGIN */}
        <div className="flex justify-center">

        <GoogleLogin
          onSuccess={(credentialResponse) => {
            handleGoogleLogin(credentialResponse.credential)
          }}
          onError={() => {
            console.log("Google Login Failed")
          }}
          useOneTap={false}
          auto_select={false}   // 🔥 ADD THIS
        />

        </div>

      </div>

    </div>
  )
}