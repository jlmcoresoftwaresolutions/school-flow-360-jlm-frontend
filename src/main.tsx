import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import { I18nextProvider } from "react-i18next"
import { RouterProvider } from "react-router-dom"

import { GlobalLoading, Toast } from "@/components"
import { i18n } from "@/i18n"

import { router } from "./routes"
import GlobalStyle from "./styles/GlobalStyle"

const app = (
  <I18nextProvider i18n={i18n}>
    <GlobalStyle />
    <RouterProvider router={router} />
    <GlobalLoading />
    <Toast />
  </I18nextProvider>
)

// StrictMode is off while running locally (the dev server): its double run of effects and renders
// made local work confusing (every call fired twice). It only ever acts in development, so a
// production build behaves the same either way.
createRoot(document.getElementById("root")!).render(import.meta.env.DEV ? app : <StrictMode>{app}</StrictMode>)
