// The fallback language and the source of truth for every translation key: en.ts (and any future
// locale) is typed against TranslationResource, so adding a key here without adding it there is a
// compile error instead of a silently untranslated string in production.
export const ptBR = {
  common: {
    poweredBy: "Powered by JLM Core",
  },
  login: {
    emailLabel: "E-mail",
    emailPlaceholder: "Digite seu e-mail",
    forgotPassword: "Esqueci minha senha",
    heroSubtitle:
      "Uma experiência executiva para diretores, escola, professores e famílias: cada perfil entra em uma jornada visual própria, com navegação adaptativa, indicadores claros e interações acolhedoras.",
    heroTitle: "Gestão escolar que parece simples, mas opera em 360º.",
    logoAlt: "Ícone do SchoolFlow360",
    passwordLabel: "Senha",
    passwordPlaceholder: "Digite sua senha",
    signIn: "Entrar",
    signInTitle: "Acesse sua jornada SchoolFlow360º",
    tagAi: "IA",
    tagDashboard: "Dashboard 360º",
    tagFinance: "Financeiro",
    tagStudents: "Alunos",
    tagWhiteLabel: "White Label",
  },
}

export type TranslationResource = typeof ptBR
