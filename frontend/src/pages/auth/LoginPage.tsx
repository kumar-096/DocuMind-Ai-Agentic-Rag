import { useState } from "react"
import { GoogleLogin } from "@react-oauth/google"
const BASE_URL =
  import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000"
export function LoginPage() {

  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")

  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [isSignup, setIsSignup] = useState(false)

  /* ---------------- VALIDATORS ---------------- */

  function isValidEmail(email: string) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
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

  /* ---------------- SUBMIT ---------------- */

  async function handleSubmit(e: React.FormEvent) {

    e.preventDefault()
    setError("")

    // 🔴 EMAIL VALIDATION
    if (!isValidEmail(email)) {
      setError("Invalid email format")
      return
    }

    // 🔴 SIGNUP VALIDATION
    if (isSignup) {

      if (password !== confirmPassword) {
        setError("Passwords do not match")
        return
      }

      const strength = getPasswordStrength(password)

      if (strength < 3) {
        setError("Password too weak (use uppercase, number, symbol, 8+ chars)")
        return
      }
    }

    setLoading(true)

    try {

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
        setLoading(false)
        return
      }

      window.location.href = "/"

    } catch (err) {
      console.error(err)
      setError("Something went wrong")
    }

    setLoading(false)
  }

  /* ---------------- GOOGLE ---------------- */

  async function handleGoogleLogin(token: string | undefined) {

    if (!token) return

    try {
      const res = await fetch(
        `${BASE_URL}/api/auth/google`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ token })
        }
      )

      if (!res.ok) {
        setError("Google login failed")
        return
      }

      window.location.href = "/"

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

          {/* EMAIL */}
          <input
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full p-2 rounded bg-slate-800 text-white"
          />

          {/* PASSWORD */}
          <div className="relative">
            <input
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

          {/* PASSWORD STRENGTH (ONLY SIGNUP) */}
          {isSignup && password && (
            <div className="text-xs text-slate-400">
              Strength: {getStrengthLabel(strength)}
            </div>
          )}

          {/* CONFIRM PASSWORD */}
          {isSignup && (
            <div className="relative">
              <input
                type={showConfirmPassword ? "text" : "password"}
                placeholder="Confirm Password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full p-2 pr-10 rounded bg-slate-800 text-white"
              />

              <span
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-2 cursor-pointer text-slate-400"
              >
                {showConfirmPassword ? "🙈" : "👁"}
              </span>
            </div>
          )}

          <button
            disabled={loading}
            className="w-full bg-blue-600 py-2 rounded text-white"
          >
            {loading
              ? "Processing..."
              : isSignup
              ? "Create Account"
              : "Sign in"}
          </button>

        </form>

        {/* TOGGLE */}
        <button
          onClick={() => setIsSignup(!isSignup)}
          className="text-sm text-blue-400 w-full"
        >
          {isSignup
            ? "Already have an account? Login"
            : "Create a new account"}
        </button>

        <div className="text-center text-slate-400 text-sm">
          OR
        </div>

        <div className="flex justify-center">
          <GoogleLogin
            onSuccess={(res) => handleGoogleLogin(res.credential)}
            onError={() => setError("Google failed")}
          />
        </div>

      </div>

    </div>
  )
}