import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import App from "./App"
import "./index.css"
import { ChatProvider } from "./context/ChatContext"
import { AuthProvider } from "./context/AuthContext"
import { GoogleOAuthProvider } from "@react-oauth/google"

createRoot(document.getElementById("root")!).render(
<GoogleOAuthProvider clientId="355481089170-bnb4bk2226q0euq3nmndajj7dqsdj12v.apps.googleusercontent.com">
  <AuthProvider>
    <ChatProvider>
      <App />
    </ChatProvider>
  </AuthProvider>
</GoogleOAuthProvider>
)