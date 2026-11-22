import type { LoaderFunctionArgs, ShouldRevalidateFunctionArgs } from "react-router-dom"
import { createBrowserRouter, Navigate, redirect } from "react-router-dom"

import { GlobalLoading } from "@/components"
import type { UserContext } from "@/models"
import { canOpenPage } from "@/utils/access"
import { buildLoginUrl, buildPasswordChangeUrl, getSafeRedirectPath, loginRedirectParam } from "@/utils/authRedirect"
import { clearSession, getSessionState, getSessionToken, hasSession, updateSessionContext } from "@/utils/session"

import { getPageKey, pageRoles } from "./access"
import { homePath, paths, shellRouteId } from "./paths"

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

// Renews a session whose access token expired, for the loader. False when the backend refused it; an
// unreachable backend doesn't end the session (the page's own calls try again). The HTTP client is
// imported on demand, as in signOut below.
const renewForLoader = async (): Promise<boolean> => {
  try {
    const { renewSession } = await import("@/services/httpClient")
    return (await renewSession()) !== null
  } catch {
    return true
  }
}

// Who signed in is read again from /api/me once per visit, since roles can change after the login. A
// session that already knows it goes on at once and the fresher reading is stored for the next page;
// one that doesn't (signed in before the login returned it) waits for it.
let contextReading: Promise<UserContext | null> | null = null

const readContext = async (): Promise<UserContext | null> => {
  try {
    const { getMe } = await import("@/services/me")
    const context = await getMe({ showLoading: false })
    await updateSessionContext(context)
    return context
  } catch {
    contextReading = null
    return null
  }
}

const getContext = async (stored: UserContext | null | undefined): Promise<UserContext | null> => {
  contextReading ??= readContext()

  return stored ?? (await contextReading)
}

// Every page behind the login. Without a session the user goes to the login, carrying the page they
// asked for (to come back to it after signing in); a session whose access token expired is renewed,
// and one that can't be goes to the login saying it expired. A page the user's roles don't open (see
// pageRoles) sends them to the access-denied page. Coming back from the login goes through this same check, so a page they
// can no longer open stays closed. Someone who signed in with a temporary password goes to create their
// own first, and comes back here after. The loader's data is who signed in, which the AppShell shows.
const requireSession = async (args: LoaderFunctionArgs): Promise<Response | UserContext | null> => {
  const { pathname, search } = new URL(args.request.url)
  const toLogin = (sessionExpired: boolean) =>
    redirect(buildLoginUrl(paths.login, { from: `${pathname}${search}`, sessionExpired }))

  const state = await getSessionState()
  if (state.status === "none") return toLogin(false)

  if (state.status === "stale" && !(await renewForLoader())) {
    clearSession()
    return toLogin(true)
  }

  const context = await getContext(state.session.context)
  if (context?.mustChangePassword) return redirect(buildPasswordChangeUrl(paths.changePassword, `${pathname}${search}`))

  const pageKey = getPageKey(pathname)

  // A page the roles don't open says so on its own page, without telling anything about the one asked for.
  if (pageKey && !canOpenPage(context, pageRoles[pageKey])) return redirect(paths.accessDenied)

  return context
}

// The password change a temporary password forces. Without a session it goes to the login (which
// brings the person back here); a session that doesn't need the change goes on to the page it was
// headed for, or home. Whether it is needed is read from /api/me every time, never from the stored
// reading, which may be older than the backend's own answer (its 403 PASSWORD_CHANGE_REQUIRED sends
// here too): trusting it could bounce the person between this page and the refused one. When /api/me
// can't be read, the page still opens: the backend decides.
const requirePendingPasswordChange = async (args: LoaderFunctionArgs): Promise<Response | null> => {
  const { pathname, search, searchParams } = new URL(args.request.url)
  const toLogin = (sessionExpired: boolean) =>
    redirect(buildLoginUrl(paths.login, { from: `${pathname}${search}`, sessionExpired }))

  const state = await getSessionState()
  if (state.status === "none") return toLogin(false)

  if (state.status === "stale" && !(await renewForLoader())) {
    clearSession()
    return toLogin(true)
  }

  try {
    const { getMe } = await import("@/services/me")
    const context = await getMe({ showLoading: false })
    await updateSessionContext(context)
    if (context.mustChangePassword) return null
  } catch {
    return null
  }

  return redirect(getSafeRedirectPath(searchParams.get(loginRedirectParam)) ?? homePath)
}

// The AppShell's loader runs again on every change of page (not only when the layout first mounts),
// so each page goes through the session and role checks.
const revalidateOnNewPage = (args: ShouldRevalidateFunctionArgs) =>
  args.currentUrl.pathname !== args.nextUrl.pathname || args.defaultShouldRevalidate

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
  // The next person to sign in in this tab has their own roles read again.
  contextReading = null
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
  // Outside the AppShell: until the temporary password is changed, the backend answers nothing else.
  {
    hydrateFallbackElement: <GlobalLoading visible />,
    lazy: async () => {
      const { ChangePassword } = await import("@/pages/ChangePassword")
      return { Component: ChangePassword }
    },
    loader: requirePendingPasswordChange,
    path: paths.changePassword,
  },
  // No redirect either: an invitation link works whoever is signed in in this browser.
  {
    hydrateFallbackElement: <GlobalLoading visible />,
    lazy: async () => {
      const { AcceptInvitation } = await import("@/pages/AcceptInvitation")
      return { Component: AcceptInvitation }
    },
    path: paths.acceptInvitation,
  },
  {
    children: [
      {
        lazy: async () => {
          const { MyUnit } = await import("@/pages/MyUnit")
          return { Component: MyUnit }
        },
        path: paths.myUnit,
      },
      {
        lazy: async () => {
          const { PeopleSearch } = await import("@/pages/PeopleSearch")
          return { Component: PeopleSearch }
        },
        path: paths.peopleSearch,
      },
      {
        lazy: async () => {
          const { Students } = await import("@/pages/Students")
          return { Component: Students }
        },
        path: paths.students,
      },
      {
        lazy: async () => {
          const { Guardians } = await import("@/pages/Guardians")
          return { Component: Guardians }
        },
        path: paths.guardians,
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
          const { AccessDenied } = await import("@/pages/AccessDenied")
          return { Component: AccessDenied }
        },
        path: paths.accessDenied,
      },
      {
        lazy: async () => {
          const { MyProfile } = await import("@/pages/MyProfile")
          return { Component: MyProfile }
        },
        path: paths.myProfile,
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
    id: shellRouteId,
    lazy: async () => {
      const { AppShell } = await import("@/ds-components/templates/AppShell")
      return { Component: AppShell }
    },
    loader: requireSession,
    shouldRevalidate: revalidateOnNewPage,
  },
  { loader: signOut, path: paths.signOut },
  { element: <Navigate to={paths.login} replace />, path: "*" },
])
