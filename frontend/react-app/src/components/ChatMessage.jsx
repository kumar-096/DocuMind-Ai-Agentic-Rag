import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

function ChatMessage({ content }) {
  return (
    <div className="bg-[#1e1e1e] text-gray-100 p-5 rounded-2xl shadow-md leading-relaxed">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: ({ children }) => (
            <h1 className="text-2xl font-bold mt-6 mb-3 border-b border-gray-700 pb-2">
              {children}
            </h1>
          ),
          h2: ({ children }) => (
            <h2 className="text-xl font-semibold mt-5 mb-2 text-blue-400">
              {children}
            </h2>
          ),
          h3: ({ children }) => (
            <h3 className="text-lg font-semibold mt-4 mb-2 text-blue-300">
              {children}
            </h3>
          ),
          p: ({ children }) => (
            <p className="my-2 text-gray-300">{children}</p>
          ),
          ul: ({ children }) => (
            <ul className="list-disc ml-6 my-3 space-y-1">
              {children}
            </ul>
          ),
          ol: ({ children }) => (
            <ol className="list-decimal ml-6 my-3 space-y-1">
              {children}
            </ol>
          ),
          li: ({ children }) => (
            <li className="ml-2">{children}</li>
          ),
          code({ inline, children }) {
            return inline ? (
              <code className="bg-gray-800 px-1.5 py-0.5 rounded text-sm text-green-400">
                {children}
              </code>
            ) : (
              <pre className="bg-black p-4 rounded-lg overflow-x-auto my-3">
                <code className="text-green-400 text-sm">{children}</code>
              </pre>
            );
          },
          blockquote: ({ children }) => (
            <blockquote className="border-l-4 border-blue-500 pl-4 italic text-gray-400 my-3">
              {children}
            </blockquote>
          ),
          hr: () => <hr className="my-6 border-gray-700" />,
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}

export default ChatMessage;