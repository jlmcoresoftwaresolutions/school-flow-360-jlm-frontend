import type { LoaderFunctionArgs } from "react-router-dom"
import { createBrowserRouter, Navigate, redirect } from "react-router-dom"

import { GlobalLoading } from "@/components"
import { buildLoginUrl, getSafeRedirectPath, loginRedirectParam } from "@/utils/authRedirect"
import { clearSession, getSessionState, getSessionToken, hasSession } from "@/utils/session"

import { homePath, paths } from "./paths"

// Every page (and the AppShell layout) is loaded on demand through `lazy`, so each one becomes its own
// chunk: opening /login doesn't download Minha Unidade's date/color pickers, and vice versa. They are
// imported from their own folders rather than the @/pages barrel, which would pull every page into
// whichever chunk imported it. hydrateFallbackElement covers the first load, while the matched
// route's loader runs and its chunk is still on its way; later navigations keep the current page up
// until the next is in.
//
// Access is decided by the loaders, before anything renders: the AppShell routes (every page behind
// the login) send a visitor without a session to /login (and back after signing in), and /login
// sends a signed-in user home. Any other path also lands on /login, which then forwards a signed-in
// user home.
// The pages for signing in (login, password recovery) are pointless with a session already open.
const redirectSignedInUserHome = async () => ((await hasSession()) ? redirect(homePath) : null)

// The login does the same, but honors the page the user was sent from (?redirect=), if it is one of
// this app's own paths.
const redirectSignedInUserBack = async (args: LoaderFunctionArgs) => {
  if (!(await hasSession())) return null

  const redirectPath = getSafeRedirectPath(new URL(args.request.url).searchParams.get(loginRedirectParam))

  return redirect(redirectPath ?? homePath)
}

// Every page behind the login: without a valid session the user goes to the login, carrying the page
// they asked for (to come back to it after signing in) and whether their session had just expired.
// Coming back still goes through this same check, so a page they can no longer open stays closed.
const requireSession = async (args: LoaderFunctionArgs) => {
  const { status } = await getSessionState()
  if (status === "active") return null

  const { pathname, search } = new URL(args.request.url)

  return redirect(buildLoginUrl(paths.login, { from: `${pathname}${search}`, sessionExpired: status === "expired" }))
}

// Tells the backend the session ended, without anyone waiting for it: the user is already on the
// login, and a failure there changes nothing for them. The service is imported here, on demand, so the
// HTTP client stays out of the app's first chunk.
const notifyBackendOfSignOut = async (token: string) => {
  try {
    const { logout } = await import("@/services/auth")
    await logout(token, { showLoading: false })
  } catch {
    // Best effort: the session is already gone from this browser.
  }
}

// Signing out ends the session here and goes straight to the login; the backend is told afterwards.
const signOut = async () => {
  const token = await getSessionToken()

  clearSession()
  if (token) void notifyBackendOfSignOut(token)

  return redirect(paths.login)
}

export const router = createBrowserRouter([
  { element: <Navigate to={paths.login} replace />, path: "/" },
  {
    hydrateFallbackElement: <GlobalLoading visible />,
    lazy: async () => {
      const { Login } = await import("@/pages/Login")
      return { Component: Login }
    },
    loader: redirectSignedInUserBack,
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
  // No redirect here: a reset link stays usable even in a browser where someone is signed in.
  {
    hydrateFallbackElement: <GlobalLoading visible />,
    lazy: async () => {
      const { ResetPassword } = await import("@/pages/ResetPassword")
      return { Component: ResetPassword }
    },
    path: paths.resetPassword,
  },
  {
    children: [
      {
        lazy: async () => {
          const { MinhaUnidade } = await import("@/pages/MinhaUnidade")
          return { Component: MinhaUnidade }
        },
        path: paths.minhaUnidade,
      },
      {
        lazy: async () => {
          const { Home } = await import("@/pages/Home")
          return { Component: Home }
        },
        path: paths.home,
      },
      {
        lazy: async () => {
          const { Classes } = await import("@/pages/Classes")
          return { Component: Classes }
        },
        path: paths.classes,
      },
      {
        lazy: async () => {
          const { Subjects } = await import("@/pages/Subjects")
          return { Component: Subjects }
        },
        path: paths.subjects,
      },
      {
        lazy: async () => {
          const { ClassDiary } = await import("@/pages/ClassDiary")
          return { Component: ClassDiary }
        },
        path: paths.classDiary,
      },
      {
        lazy: async () => {
          const { ReportCards } = await import("@/pages/ReportCards")
          return { Component: ReportCards }
        },
        path: paths.reportCards,
      },
      {
        lazy: async () => {
          const { Tuition } = await import("@/pages/Tuition")
          return { Component: Tuition }
        },
        path: paths.tuition,
      },
      {
        lazy: async () => {
          const { Billing } = await import("@/pages/Billing")
          return { Component: Billing }
        },
        path: paths.billing,
      },
      {
        lazy: async () => {
          const { Contracts } = await import("@/pages/Contracts")
          return { Component: Contracts }
        },
        path: paths.contracts,
      },
      {
        lazy: async () => {
          const { Reconciliation } = await import("@/pages/Reconciliation")
          return { Component: Reconciliation }
        },
        path: paths.reconciliation,
      },
      {
        lazy: async () => {
          const { Notices } = await import("@/pages/Notices")
          return { Component: Notices }
        },
        path: paths.notices,
      },
      {
        lazy: async () => {
          const { Messages } = await import("@/pages/Messages")
          return { Component: Messages }
        },
        path: paths.messages,
      },
      {
        lazy: async () => {
          const { Notifications } = await import("@/pages/Notifications")
          return { Component: Notifications }
        },
        path: paths.notifications,
      },
      {
        lazy: async () => {
          const { AcademicReports } = await import("@/pages/AcademicReports")
          return { Component: AcademicReports }
        },
        path: paths.academicReports,
      },
      {
        lazy: async () => {
          const { FinancialReports } = await import("@/pages/FinancialReports")
          return { Component: FinancialReports }
        },
        path: paths.financialReports,
      },
      {
        lazy: async () => {
          const { Exports } = await import("@/pages/Exports")
          return { Component: Exports }
        },
        path: paths.exports,
      },
      {
        lazy: async () => {
          const { UserList } = await import("@/pages/UserList")
          return { Component: UserList }
        },
        path: paths.userList,
      },
      {
        lazy: async () => {
          const { ProfilesAndPermissions } = await import("@/pages/ProfilesAndPermissions")
          return { Component: ProfilesAndPermissions }
        },
        path: paths.profilesAndPermissions,
      },
      {
        lazy: async () => {
          const { Invites } = await import("@/pages/Invites")
          return { Component: Invites }
        },
        path: paths.invites,
      },
      {
        lazy: async () => {
          const { Preferences } = await import("@/pages/Preferences")
          return { Component: Preferences }
        },
        path: paths.preferences,
      },
      {
        lazy: async () => {
          const { Integrations } = await import("@/pages/Integrations")
          return { Component: Integrations }
        },
        path: paths.integrations,
      },
      {
        lazy: async () => {
          const { Security } = await import("@/pages/Security")
          return { Component: Security }
        },
        path: paths.security,
      },
      {
        lazy: async () => {
          const { RecentAccess } = await import("@/pages/RecentAccess")
          return { Component: RecentAccess }
        },
        path: paths.recentAccess,
      },
      {
        lazy: async () => {
          const { Audit } = await import("@/pages/Audit")
          return { Component: Audit }
        },
        path: paths.audit,
      },
      {
        lazy: async () => {
          const { ActiveSessions } = await import("@/pages/ActiveSessions")
          return { Component: ActiveSessions }
        },
        path: paths.activeSessions,
      },
      {
        lazy: async () => {
          const { HelpCenter } = await import("@/pages/HelpCenter")
          return { Component: HelpCenter }
        },
        path: paths.helpCenter,
      },
      {
        lazy: async () => {
          const { ContactSupport } = await import("@/pages/ContactSupport")
          return { Component: ContactSupport }
        },
        path: paths.contactSupport,
      },
    ],
    hydrateFallbackElement: <GlobalLoading visible />,
    lazy: async () => {
      const { AppShell } = await import("@/ds-components/templates/AppShell")
      return { Component: AppShell }
    },
    loader: requireSession,
  },
  { loader: signOut, path: paths.signOut },
  { element: <Navigate to={paths.login} replace />, path: "*" },
])
