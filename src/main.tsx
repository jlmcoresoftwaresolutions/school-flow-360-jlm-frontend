import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import { RouterProvider } from "react-router-dom"
import { ToastContainer } from "react-toastify"

import { GlobalLoading } from "@/components"

import { router } from "./routes"
import GlobalStyle from "./styles/GlobalStyle"

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <GlobalStyle />
    <RouterProvider router={router} />
    <GlobalLoading />
    <ToastContainer />
  </StrictMode>,
)
