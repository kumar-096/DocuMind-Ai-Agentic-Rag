import "./App.css"
import { MainLayout } from "./components/layout/MainLayout"
import { SourceProvider } from "./context/SourceContext"

function App() {

  return (
    <SourceProvider>

      <MainLayout />

    </SourceProvider>
  )

}

export default App