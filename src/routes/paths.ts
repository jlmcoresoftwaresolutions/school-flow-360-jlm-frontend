// Page URLs are always in English (the copy on screen is translated, the address is not). Every
// route path lives in one place, imported directly (@/routes/paths) by whatever needs to navigate,
// so a page doesn't have to import the router itself. A page reached from the menu is keyed by its
// menu entry (shell.nav), so the AppShell finds its path by that key.
export const paths = {
  academicReports: "/reports/academic",
  activeSessions: "/access-logs/active-sessions",
  audit: "/access-logs/audit",
  billing: "/finance/billing",
  classDiary: "/academic/class-diary",
  classes: "/academic/classes",
  contactSupport: "/help/contact-support",
  contracts: "/finance/contracts",
  exports: "/reports/exports",
  financialReports: "/reports/financial",
  forgotPassword: "/forgot-password",
  helpCenter: "/help/help-center",
  home: "/home",
  integrations: "/settings/integrations",
  invites: "/users/invites",
  login: "/login",
  messages: "/communication/messages",
  minhaUnidade: "/administration/my-unit",
  notices: "/communication/notices",
  notifications: "/communication/notifications",
  preferences: "/settings/preferences",
  profilesAndPermissions: "/users/profiles-and-permissions",
  recentAccess: "/access-logs/recent-access",
  reconciliation: "/finance/reconciliation",
  reportCards: "/academic/report-cards",
  // Opened from the reset e-mail, as /reset-password?token=...&tenant=... (the backend builds the link).
  resetPassword: "/reset-password",
  security: "/settings/security",
  // No page: its loader ends the session and goes to the login. Being a navigation, it goes through
  // the unsaved-changes warning like any other way out of a page.
  signOut: "/sign-out",
  subjects: "/academic/subjects",
  tuition: "/finance/tuition",
  userList: "/users/list",
}

// Where a signed-in user lands: after the login, and when they open /login while already signed in.
export const homePath = paths.home

export type PathsType = typeof paths
