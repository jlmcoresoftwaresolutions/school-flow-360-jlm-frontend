// Page URLs are always in English (the copy on screen is translated, the address is not). Every
// route path lives in one place, imported directly (@/routes/paths) by whatever needs to navigate,
// so a page doesn't have to import the router itself.
export const paths = {
  forgotPassword: "/forgot-password",
  login: "/login",
  minhaEscola: "/administration/my-school",
}

// Where a signed-in user lands: after the login, and when they open /login while already signed in.
// Minha Escola for now, the only page of the app so far.
export const homePath = paths.minhaEscola

export type PathsType = typeof paths
