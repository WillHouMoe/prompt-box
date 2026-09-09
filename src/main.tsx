import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import App from "./App"
import { ToastProvider } from "@/hooks/useToast"
import { PromptStoreProvider } from "@/store/promptStore"
import "./index.css"

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ToastProvider>
      <PromptStoreProvider>
        <App />
      </PromptStoreProvider>
    </ToastProvider>
  </StrictMode>,
)
