import { useEffect, useState } from "react";

/* ---------------- MESSAGE ---------------- */

function ChatMessage({ role, content }) {
  const isUser = role === "user";

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"} mb-3`}>
      <div
        className={`max-w-2xl p-4 rounded-2xl ${
          isUser ? "bg-blue-600 text-white" : "bg-[#1e1e1e] text-gray-100"
        }`}
      >
        {content}
      </div>
    </div>
  );
}

/* ---------------- MAIN ---------------- */

function ChatWindow() {
  const [sessions, setSessions] = useState([]);
  const [activeSession, setActiveSession] = useState(null);
  const [messages, setMessages] = useState([]);

  const [input, setInput] = useState("");
  const [streamingText, setStreamingText] = useState("");

  // ---------------- LOAD SESSIONS ----------------
  const loadSessions = async () => {
    const res = await fetch("/api/sessions/", {
      credentials: "include",
    });

    const data = await res.json();
    setSessions(data);

    if (data.length > 0) {
      setActiveSession(data[0]);
    }
  };

  // ---------------- LOAD MESSAGES ----------------
  const loadMessages = async (sessionId) => {
    const res = await fetch(`/api/sessions/${sessionId}/messages`, {
      credentials: "include",
    });

    const data = await res.json();
    setMessages(data);
  };

  useEffect(() => {
    loadSessions();
  }, []);

  useEffect(() => {
    if (activeSession) {
      loadMessages(activeSession.id);
    }
  }, [activeSession]);

  // ---------------- CREATE CHAT ----------------
  const createChat = async () => {
    const res = await fetch("/api/sessions/", {
      method: "POST",
      credentials: "include",
    });

    const newSession = await res.json();

    setSessions((prev) => [newSession, ...prev]);
    setActiveSession(newSession);
    setMessages([]);
  };

  // ---------------- DELETE CHAT ----------------
  const deleteChat = async (id) => {
    await fetch(`/api/sessions/${id}`, {
      method: "DELETE",
      credentials: "include",
    });

    const updated = sessions.filter((s) => s.id !== id);
    setSessions(updated);

    if (updated.length > 0) {
      setActiveSession(updated[0]);
    } else {
      setMessages([]);
    }
  };

  // ---------------- RENAME CHAT ----------------
  const renameChat = async (id) => {
    const title = prompt("Enter new title:");
    if (!title) return;

    await fetch(`/api/sessions/${id}?title=${title}`, {
      method: "PUT",
      credentials: "include",
    });

    loadSessions();
  };

  // ---------------- SEND MESSAGE ----------------
  const sendMessage = async () => {
    if (!input.trim() || !activeSession) return;

    const userMessage = input;

    setMessages((prev) => [
      ...prev,
      { role: "user", content: userMessage },
    ]);

    setInput("");

    const res = await fetch("/api/chat/ask", {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        query: userMessage,
        session_id: activeSession.id,
      }),
    });

    const reader = res.body.getReader();
    const decoder = new TextDecoder();

    let buffer = "";
    let fullText = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });

      let parts = buffer.split("\n\n");
      buffer = parts.pop();

      for (let part of parts) {
        if (part.startsWith("data: ")) {
          const data = JSON.parse(part.replace("data: ", ""));

          if (data.token) {
            fullText += data.token;

            if (fullText.length % 25 === 0) {
              setStreamingText(fullText);
            }
          }

          if (data.done) {
            setMessages((prev) => [
              ...prev,
              { role: "assistant", content: fullText },
            ]);

            setStreamingText("");
            fullText = "";
          }
        }
      }
    }
  };

  return (
    <div className="flex h-screen bg-black">

      {/* SIDEBAR */}
      <div className="w-64 bg-[#111] p-4 border-r border-gray-800">
        <button
          onClick={createChat}
          className="w-full mb-4 bg-blue-600 p-2 rounded"
        >
          + New Chat
        </button>

        {sessions.map((s) => (
          <div
            key={s.id}
            className={`p-2 mb-2 rounded cursor-pointer ${
              activeSession?.id === s.id ? "bg-[#222]" : ""
            }`}
            onClick={() => setActiveSession(s)}
          >
            <div className="flex justify-between items-center">
              <span>{s.title}</span>

              <div className="flex gap-2 text-xs">
                <button onClick={() => renameChat(s.id)}>✏️</button>
                <button onClick={() => deleteChat(s.id)}>🗑</button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* MAIN */}
      <div className="flex flex-col flex-1">

        {/* CHAT */}
        <div className="flex-1 overflow-y-auto p-6">
          {messages.map((msg, i) => (
            <ChatMessage key={i} role={msg.role} content={msg.content} />
          ))}

          {streamingText && (
            <ChatMessage role="assistant" content={streamingText} />
          )}
        </div>

        {/* INPUT */}
        <div className="p-4 border-t border-gray-800 flex gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            className="flex-1 p-3 rounded bg-[#1e1e1e] text-white"
          />

          <button
            onClick={sendMessage}
            className="bg-blue-600 px-4 py-2 rounded"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}

export default ChatWindow;