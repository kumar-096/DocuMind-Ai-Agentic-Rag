import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { useAuth } from "../../context/AuthContext"

export function LoginPage() {

  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)

  const navigate = useNavigate()
  const { checkAuth } = useAuth()

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
        alert("Invalid credentials")
        setLoading(false)
        return
      }

      await checkAuth()

      navigate("/")

    } catch (err) {

      console.error(err)
      alert("Login failed")

    }

    setLoading(false)

  }

  return (

    <div className="h-screen flex items-center justify-center bg-slate-950">

      <form
        onSubmit={handleLogin}
        className="w-[420px] bg-slate-900 p-8 rounded-xl space-y-4"
      >

        <h1 className="text-xl font-semibold text-white">
          Sign in
        </h1>

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

    </div>

  )
}