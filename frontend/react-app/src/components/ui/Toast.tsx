import { useEffect } from "react"

export function Toast({ message, type, onClose }: any) {

  useEffect(() => {
    const t = setTimeout(onClose, 2500)
    return () => clearTimeout(t)
  }, [])

  return (
    <div className="fixed bottom-6 right-6 bg-slate-800 text-white px-4 py-2 rounded shadow-lg text-xs">
      {message}
    </div>
  )
}