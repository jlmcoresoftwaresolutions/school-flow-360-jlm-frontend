import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import { I18nextProvider } from "react-i18next"
import { RouterProvider } from "react-router-dom"

import { GlobalLoading, Toast } from "@/components"
import { i18n } from "@/i18n"

import { router } from "./routes"
import GlobalStyle from "./styles/GlobalStyle"

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <I18nextProvider i18n={i18n}>
      <GlobalStyle />
      <RouterProvider router={router} />
      <GlobalLoading />
      <Toast />
    </I18nextProvider>
  </StrictMode>,
)
