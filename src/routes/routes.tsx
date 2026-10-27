import { createBrowserRouter, Navigate, redirect } from "react-router-dom"

import { GlobalLoading } from "@/components"
import { hasSession } from "@/utils/session"

import { homePath, paths } from "./paths"

// Every page (and the AppShell layout) is loaded on demand through `lazy`, so each one becomes its own
// chunk: opening /login doesn't download Minha Escola's date/color pickers, and vice versa. They are
// imported from their own folders rather than the @/pages barrel, which would pull every page into
// whichever chunk imported it. hydrateFallbackElement covers the first load, while the matched
// route's loader runs and its chunk is still on its way; later navigations keep the current page up
// until the next is in.
//
// Access is decided by the loaders, before anything renders: the AppShell routes (every page behind
// the login) send a visitor without a session to /login, and /login sends a signed-in user home.
// Any other path also lands on /login, which then forwards a signed-in user home.
// The pages for signing in (login, password recovery) are pointless with a session already open.
const redirectSignedInUserHome = async () => ((await hasSession()) ? redirect(homePath) : null)

export const router = createBrowserRouter([
  { element: <Navigate to={paths.login} replace />, path: "/" },
  {
    hydrateFallbackElement: <GlobalLoading visible />,
    lazy: async () => {
      const { Login } = await import("@/pages/Login")
      return { Component: Login }
    },
    loader: redirectSignedInUserHome,
    path: paths.login,
  },
  {
    hydrateFallbackElement: <GlobalLoading visible />,
    lazy: async () => {
      const { ForgotPassword } = await import("@/pages/ForgotPassword")
      return { Component: ForgotPassword }
    },
    loader: redirectSignedInUserHome,
    path: paths.forgotPassword,
  },
  {
    children: [
      {
        lazy: async () => {
          const { MinhaEscola } = await import("@/pages/MinhaEscola")
          return { Component: MinhaEscola }
        },
        path: paths.minhaEscola,
      },
    ],
    hydrateFallbackElement: <GlobalLoading visible />,
    lazy: async () => {
      const { AppShell } = await import("@/ds-components/templates/AppShell")
      return { Component: AppShell }
    },
    loader: async () => ((await hasSession()) ? null : redirect(paths.login)),
  },
  { element: <Navigate to={paths.login} replace />, path: "*" },
])
