import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useState } from "react";

function ChatMessage({ role, content, streaming }: any) {
  const isUser = role === "user";
  const [hover, setHover] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(content);
  };

  return (
    <div
      className={`flex ${isUser ? "justify-end" : "justify-start"} mb-10 px-2`}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      <div
        className={`
          relative max-w-2xl px-6 py-5 rounded-2xl text-sm
          backdrop-blur-md border transition-all duration-200
          ${
            isUser
              ? "bg-blue-600 text-white border-blue-500/30"
              : "bg-[#1e1e1e] text-gray-100 border-white/10"
          }
        `}
      >
        {/*   HOVER ACTIONS (FIXED) */}
        {!isUser && (
          <div
            className={`
              absolute -top-3 right-2 flex gap-2 text-xs 
              bg-black/90 px-2 py-1 rounded-md border border-gray-700
              transition-opacity duration-200
              ${hover ? "opacity-100" : "opacity-0 pointer-events-none"}
            `}
          >
            <button
              onClick={handleCopy}
              className="cursor-pointer hover:text-blue-400"
            >
              Copy
            </button>

            <button className="cursor-pointer hover:text-yellow-400">
              Stop
            </button>

            <button className="cursor-pointer hover:text-green-400">
              Regenerate
            </button>
          </div>
        )}

        {/*   MARKDOWN WITH FORCED STRUCTURE */}
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          components={{
            /* 🔴 FORCE SECTION VISIBILITY */
            h2: ({ children }) => (
              <div className="mt-12 mb-6">
                <h2 className="text-2xl font-bold text-blue-400">
                  {children}
                </h2>
              </div>
            ),

            h3: ({ children }) => (
              <div className="mt-10 mb-5">
                <h3 className="text-xl font-semibold text-blue-300">
                  {children}
                </h3>
              </div>
            ),

            /* 🔴 FORCE PARAGRAPH SPACING */
            p: ({ children }) => (
              <p className="my-5 text-gray-300 leading-relaxed">
                {children}
              </p>
            ),

            /* 🔴 FORCE LIST SPACING */
            ul: ({ children }) => (
              <ul className="list-disc ml-6 my-6 space-y-2">
                {children}
              </ul>
            ),

            ol: ({ children }) => (
              <ol className="list-decimal ml-6 my-6 space-y-2">
                {children}
              </ol>
            ),

            li: ({ children }) => (
              <li className="ml-2">{children}</li>
            ),

            /* 🔴 CODE */
            code({ inline, children }) {
              return inline ? (
                <code className="bg-gray-800 px-1.5 py-0.5 rounded text-green-400 text-sm">
                  {children}
                </code>
              ) : (
                <pre className="bg-black p-4 rounded-lg overflow-x-auto my-6">
                  <code className="text-green-400 text-sm">
                    {children}
                  </code>
                </pre>
              );
            },

            blockquote: ({ children }) => (
              <blockquote className="border-l-4 border-blue-500 pl-4 italic text-gray-400 my-6">
                {children}
              </blockquote>
            ),

            hr: () => <hr className="my-8 border-gray-700" />,
          }}
        >
          {content}
        </ReactMarkdown>

        {/*   STREAM CURSOR */}
        {streaming && <span className="animate-pulse ml-1">|</span>}
      </div>
    </div>
  );
}

export default ChatMessage;