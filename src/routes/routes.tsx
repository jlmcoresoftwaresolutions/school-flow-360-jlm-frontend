import { createBrowserRouter, Navigate } from "react-router-dom"

import { GlobalLoading } from "@/components"

// Every page (and the AppShell layout) is loaded on demand through `lazy`, so each one becomes its own
// chunk: opening /login doesn't download Minha Escola's date/color pickers, and vice versa. They are
// imported from their own folders rather than the @/pages barrel, which would pull every page into
// whichever chunk imported it. hydrateFallbackElement covers the first load, while the matched
// route's chunk is still on its way; later navigations keep the current page up until the next is in.
export const router = createBrowserRouter([
  { element: <Navigate to="/login" replace />, path: "/" },
  {
    hydrateFallbackElement: <GlobalLoading visible />,
    lazy: async () => {
      const { Login } = await import("@/pages/Login")
      return { Component: Login }
    },
    path: "/login",
  },
  {
    children: [
      {
        lazy: async () => {
          const { MinhaEscola } = await import("@/pages/MinhaEscola")
          return { Component: MinhaEscola }
        },
        path: "/administracao/minha-escola",
      },
    ],
    hydrateFallbackElement: <GlobalLoading visible />,
    lazy: async () => {
      const { AppShell } = await import("@/ds-components/templates/AppShell")
      return { Component: AppShell }
    },
  },
])
