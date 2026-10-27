// Every route path in one place, imported directly (@/routes/paths) by whatever needs to navigate,
// so a page doesn't have to import the router itself.
export const paths = {
  forgotPassword: "/recuperar-senha",
  login: "/login",
  minhaEscola: "/administracao/minha-escola",
}

// Where a signed-in user lands: after the login, and when they open /login while already signed in.
// Minha Escola for now, the only page of the app so far.
export const homePath = paths.minhaEscola

export type PathsType = typeof paths
