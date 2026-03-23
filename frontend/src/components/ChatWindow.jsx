import { useEffect, useState, useRef } from "react";
import {
  listSessions,
  createSession,
  loadSessionMessages,
  deleteSession,
  askQuestionSSE,
  getSettings
} from "../lib/api";

/* ---------------- TYPING CURSOR ---------------- */
function Cursor() {
  return <span className="animate-pulse ml-1">|</span>;
}

/* ---------------- MESSAGE ---------------- */
function ChatMessage({ role, content, streaming }) {
  const isUser = role === "user";

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"} px-2`}>
      <div
        className={`
          max-w-2xl px-5 py-3 rounded-2xl text-sm leading-relaxed
          backdrop-blur-md border transition-all duration-200
          ${
            isUser
              ? "bg-blue-600/90 text-white border-blue-500/30"
              : "bg-white/5 text-gray-200 border-white/10"
          }
        `}
      >
        {content}
        {streaming && <Cursor />}
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
  const [loading, setLoading] = useState(false);

  const [settings, setSettings] = useState(null);

  const bottomRef = useRef(null);

  /* ---------------- AUTO SCROLL ---------------- */
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamingText]);

  /* ---------------- SETTINGS ---------------- */
  useEffect(() => {
    getSettings().then(setSettings).catch(console.error);
  }, []);

  /* ---------------- LOAD ---------------- */
  const loadSessions = async () => {
    const data = await listSessions();
    setSessions(data);
    if (data.length > 0) setActiveSession(data[0]);
  };

  const loadMessages = async (id) => {
    try {
      setLoading(true);
      const data = await loadSessionMessages(id);
      setMessages(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSessions();
  }, []);

  useEffect(() => {
    if (activeSession) loadMessages(activeSession.id);
  }, [activeSession]);

  /* ---------------- ACTIONS ---------------- */
  const createChat = async () => {
    const s = await createSession();
    setSessions((prev) => [s, ...prev]);
    setActiveSession(s);
    setMessages([]);
  };

  const deleteChat = async (id) => {
    await deleteSession(id);
    const updated = sessions.filter((s) => s.id !== id);
    setSessions(updated);
    setActiveSession(updated[0] || null);
  };

  const renameChat = async (id) => {
    const title = prompt("Rename chat:");
    if (!title) return;

    await fetch(`/api/sessions/${id}?title=${title}`, {
      method: "PUT",
      credentials: "include",
    });

    loadSessions();
  };

  /* ---------------- SEND ---------------- */
  const sendMessage = async () => {
    if (!input.trim() || !activeSession) return;

    const userText = input;
    setInput("");

    setMessages((prev) => [...prev, { role: "user", content: userText }]);

    let full = "";

    askQuestionSSE(
      {
        query: userText,
        session_id: activeSession.id,
        top_k: settings?.top_k || 5,
      },
      (token) => {
        full += token;

        // smoother streaming (slight delay)
        setTimeout(() => {
          setStreamingText(full);
        }, 10);
      },
      () => {
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: full },
        ]);
        setStreamingText("");
      },
      (err) => console.error(err)
    );
  };

  return (
    <div className="flex h-screen bg-gradient-to-br from-black via-[#0a0a0a] to-[#050505] text-gray-200">

      {/* SIDEBAR */}
      <div className="w-64 flex flex-col border-r border-white/10 bg-black/40 backdrop-blur-xl">

        {/* BRAND */}
        <div className="py-6 flex flex-col items-center border-b border-white/10">
          <div className="text-2xl mb-1">🧠</div>
          <div className="text-lg font-semibold tracking-wide">
            DocuMind <span className="text-blue-400 text-sm">AI</span>
          </div>
        </div>

        {/* NEW CHAT */}
        <div className="p-4">
          <button
            onClick={createChat}
            className="w-full py-2 rounded-lg bg-blue-600 hover:bg-blue-500 transition cursor-pointer text-sm"
          >
            + New Chat
          </button>
        </div>

        {/* SESSIONS */}
        <div className="flex-1 overflow-y-auto px-2 space-y-1">
          {sessions.map((s) => (
            <div
              key={s.id}
              onClick={() => setActiveSession(s)}
              className={`
                group px-3 py-2 rounded-lg cursor-pointer flex justify-between items-center
                ${
                  activeSession?.id === s.id
                    ? "bg-white/10"
                    : "hover:bg-white/5"
                }
              `}
            >
              <span className="truncate text-sm">{s.title}</span>

              <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    renameChat(s.id);
                  }}
                  className="cursor-pointer hover:scale-110"
                >
                  ✏️
                </button>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteChat(s.id);
                  }}
                  className="cursor-pointer hover:scale-110"
                >
                  🗑
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* MAIN */}
      <div className="flex flex-col flex-1">

        {/* HEADER */}
        <div className="h-14 border-b border-white/10 flex items-center justify-center text-sm text-gray-400">
          AI Assistant
        </div>

        {/* CHAT AREA */}
        <div className="flex-1 overflow-y-auto px-6 py-8 space-y-6">

          {/*   EMPTY STATE */}
          {messages.length === 0 && !loading && (
            <div className="text-center text-gray-500 mt-20">
              <div className="text-3xl mb-3">💬</div>
              <p className="text-sm">Start a conversation with your documents</p>
            </div>
          )}

          {/*   LOADING STATE */}
          {loading && (
            <div className="text-center text-gray-400 text-sm">
              Loading messages...
            </div>
          )}

          {messages.map((m, i) => (
            <ChatMessage key={i} role={m.role} content={m.content} />
          ))}

          {streamingText && (
            <ChatMessage role="assistant" content={streamingText} streaming />
          )}

          <div ref={bottomRef} />
        </div>

        {/* INPUT */}
        <div className="p-4 border-t border-white/10 bg-black/40 backdrop-blur-xl flex gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask something..."
            className="flex-1 px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-sm focus:outline-none focus:border-blue-500"
          />

          <button
            onClick={sendMessage}
            className="px-5 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 transition cursor-pointer text-sm"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}

export default ChatWindow;