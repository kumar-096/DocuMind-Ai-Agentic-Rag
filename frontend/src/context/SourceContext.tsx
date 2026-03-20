import { createContext, useContext, useState } from "react"
import type { ReactNode } from "react"
type Source = {
  filename: string
  page?: number
  chunk?: number
  text?: string
}

type SourceContextType = {
  source: Source | null
  setSource: React.Dispatch<React.SetStateAction<Source | null>>
}

const SourceContext = createContext<SourceContextType | null>(null)

export function SourceProvider({ children }: { children: ReactNode }) {

  const [source, setSource] = useState<Source | null>(null)

  return (
    <SourceContext.Provider value={{ source, setSource }}>
      {children}
    </SourceContext.Provider>
  )
}

export function useSource() {

  const context = useContext(SourceContext)

  if (!context) {
    throw new Error("useSource must be used inside SourceProvider")
  }

  return context
}