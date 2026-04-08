import { useState } from "react"
import { GoogleLogin } from "@react-oauth/google"
import { useNavigate } from "react-router-dom"
import { useAuth } from "../../context/AuthContext"

const BASE_URL =
  import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000"

export function LoginPage() {
  const navigate = useNavigate()
  const { checkAuth } = useAuth()

  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")

  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [isSignup, setIsSignup] = useState(false)

  function isValidEmail(email: string) {
    return /^[A-Za-z0-9._%+-]+@gmail\.com$/i.test(email)
  }

  function getPasswordStrength(password: string) {
    let score = 0
    if (password.length >= 8) score++
    if (/[A-Z]/.test(password)) score++
    if (/[0-9]/.test(password)) score++
    if (/[^A-Za-z0-9]/.test(password)) score++
    return score
  }

  function getStrengthLabel(score: number) {
    if (score <= 1) return "Weak"
    if (score === 2) return "Medium"
    if (score === 3) return "Strong"
    return "Very Strong"
  }

  async function completeAuthFlow() {
    const ok = await checkAuth()

    if (ok) {
      navigate("/", { replace: true })
    } else {
      setError("Authentication state failed to sync")
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError("")
    setLoading(true)

    try {
      if (!isValidEmail(email)) {
        setError("Invalid Gmail format")
        return
      }

      if (isSignup) {
        if (password !== confirmPassword) {
          setError("Passwords do not match")
          return
        }

        const strength = getPasswordStrength(password)
        if (strength < 3) {
          setError(
            "Password too weak (uppercase, number, symbol, 8+ chars)"
          )
          return
        }
      }

      const endpoint = isSignup
        ? `${BASE_URL}/api/auth/signup`
        : `${BASE_URL}/api/auth/login`

      const res = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        credentials: "include",
        body: JSON.stringify({ email, password })
      })

      if (!res.ok) {
        const text = await res.text()
        setError(text || "Authentication failed")
        return
      }

      await completeAuthFlow()
    } catch (err) {
      console.error(err)
      setError("Something went wrong")
    } finally {
      setLoading(false)
    }
  }

  async function handleGoogleLogin(token: string | undefined) {
    if (!token) return

    try {
      const res = await fetch(
        `${BASE_URL}/api/auth/google`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          credentials: "include",
          body: JSON.stringify({ token })
        }
      )

      if (!res.ok) {
        setError("Google login failed")
        return
      }

      await completeAuthFlow()
    } catch (err) {
      console.error(err)
      setError("Google error")
    }
  }

  const strength = getPasswordStrength(password)

  return (
    <div className="h-screen flex items-center justify-center bg-slate-950">
      <div className="w-[420px] bg-slate-900 p-8 rounded-xl space-y-6">
        <h1 className="text-xl font-semibold text-white">
          {isSignup ? "Create Account" : "Sign in"}
        </h1>

        {error && (
          <div className="text-red-500 text-sm text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            autoComplete="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full p-2 rounded bg-slate-800 text-white"
          />

          <div className="relative">
            <input
              autoComplete={
                isSignup ? "new-password" : "current-password"
              }
              type={showPassword ? "text" : "password"}
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full p-2 pr-10 rounded bg-slate-800 text-white"
            />

            <span
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-2 cursor-pointer text-slate-400"
            >
              {showPassword ? "🙈" : "👁"}
            </span>
          </div>

          {isSignup && password && (
            <div className="text-xs text-slate-400">
              Strength: {getStrengthLabel(strength)}
            </div>
          )}

          {isSignup && (
            <div className="relative">
              <input
                autoComplete="new-password"
                type={showConfirmPassword ? "text" : "password"}
                placeholder="Confirm Password"
                value={confirmPassword}
                onChange={(e) =>
                  setConfirmPassword(e.target.value)
                }
                className="w-full p-2 pr-10 rounded bg-slate-800 text-white"
              />

              <span
                onClick={() =>
                  setShowConfirmPassword(!showConfirmPassword)
                }
                className="absolute right-3 top-2 cursor-pointer text-slate-400"
              >
                {showConfirmPassword ? "🙈" : "👁"}
              </span>
            </div>
          )}

          <button
            disabled={loading}
            className="w-full bg-blue-600 py-2 rounded text-white cursor-pointer"
          >
            {loading
              ? "Processing..."
              : isSignup
              ? "Create Account"
              : "Sign in"}
          </button>
        </form>

        <button
          onClick={() => setIsSignup(!isSignup)}
          className="text-sm text-blue-400 w-full cursor-pointer"
        >
          {isSignup
            ? "Already have an account? Login"
            : "Create a new account"}
        </button>

        <div className="text-center text-slate-400 text-sm">
          OR
        </div>

        <div className="flex justify-center cursor-pointer">
          <GoogleLogin
            onSuccess={(res) => handleGoogleLogin(res.credential)}
            onError={() => setError("Google failed")}
          />
        </div>
      </div>
    </div>
  )
}