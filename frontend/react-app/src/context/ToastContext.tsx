import { createContext, useContext, useState } from "react"

const ToastContext = createContext<any>(null)

export function ToastProvider({ children }: any) {

  const [toast, setToast] = useState<string | null>(null)

  function showToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(null), 2500)
  }

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}

      {toast && (
        <div className="fixed bottom-6 right-6 bg-slate-800 px-4 py-2 text-xs rounded shadow">
          {toast}
        </div>
      )}
    </ToastContext.Provider>
  )
}

export function useToast() {
  return useContext(ToastContext)
}