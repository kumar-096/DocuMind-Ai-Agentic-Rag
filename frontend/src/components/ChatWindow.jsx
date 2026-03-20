import { useEffect, useState } from "react";
import {
  listSessions,
  createSession,
  loadSessionMessages,
  deleteSession,
  askQuestionSSE,
  getSettings
} from "../lib/api";

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
  const [settings, setSettings] = useState(null);

  /* ---------------- LOAD SETTINGS ---------------- */
  useEffect(() => {
    getSettings().then(setSettings).catch(console.error);
  }, []);

  /* ---------------- LOAD SESSIONS ---------------- */
  const loadSessions = async () => {
    try {
      const data = await listSessions();
      setSessions(data);

      if (data.length > 0) {
        setActiveSession(data[0]);
      }
    } catch (err) {
      console.error("Session load error:", err);
    }
  };

  /* ---------------- LOAD MESSAGES ---------------- */
  const loadMessages = async (sessionId) => {
    try {
      const data = await loadSessionMessages(sessionId);
      setMessages(data);
    } catch (err) {
      console.error("Message load error:", err);
    }
  };

  useEffect(() => {
    loadSessions();
  }, []);

  useEffect(() => {
    if (activeSession) {
      loadMessages(activeSession.id);
    }
  }, [activeSession]);

  /* ---------------- CREATE CHAT ---------------- */
  const createChat = async () => {
    try {
      const newSession = await createSession();
      setSessions((prev) => [newSession, ...prev]);
      setActiveSession(newSession);
      setMessages([]);
    } catch (err) {
      console.error(err);
    }
  };

  /* ---------------- DELETE CHAT ---------------- */
  const deleteChat = async (id) => {
    try {
      await deleteSession(id);

      const updated = sessions.filter((s) => s.id !== id);
      setSessions(updated);

      if (updated.length > 0) {
        setActiveSession(updated[0]);
      } else {
        setMessages([]);
      }
    } catch (err) {
      console.error(err);
    }
  };

  /* ---------------- RENAME CHAT ---------------- */
  const renameChat = async (id) => {
    const title = prompt("Enter new title:");
    if (!title) return;

    try {
      await fetch(`/api/sessions/${id}?title=${title}`, {
        method: "PUT",
        credentials: "include",
      });

      loadSessions();
    } catch (err) {
      console.error(err);
    }
  };

  /* ---------------- SEND MESSAGE ---------------- */
  const sendMessage = async () => {
    if (!input.trim() || !activeSession) return;

    const userMessage = input;

    setMessages((prev) => [
      ...prev,
      { role: "user", content: userMessage },
    ]);

    setInput("");

    let fullText = "";

    askQuestionSSE(
      {
        query: userMessage,
        session_id: activeSession.id,
        top_k: settings?.top_k || 5
      },
      (token) => {
        fullText += token;

        setStreamingText(fullText);
      },
      () => {
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: fullText },
        ]);

        setStreamingText("");
      },
      (err) => {
        console.error("Streaming error:", err);
      }
    );
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
        <div className="flex-1 overflow-y-auto p-6 scrollbar-thin scrollbar-thumb-gray-700">
          {messages.map((msg, i) => (
            <ChatMessage key={i} role={msg.role} content={msg.content} />
          ))}

          {streamingText && (
            <ChatMessage role="assistant" content={streamingText} />
          )}
        </div>

        {/* INPUT */}
        <div className="sticky bottom-0 p-4 border-t border-gray-800 flex gap-2 bg-black">
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