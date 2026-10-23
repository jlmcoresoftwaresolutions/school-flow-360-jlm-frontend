import type { TranslationResource } from "./ptBR"

// Typed against TranslationResource (ptBR's own shape) instead of inferring its own type: a missing
// or extra key here is then a compile error, not a silent gap discovered at runtime.
export const en: TranslationResource = {
  common: {
    poweredBy: "Powered by JLM Core",
  },
  login: {
    emailLabel: "Email",
    emailPlaceholder: "Enter your email",
    forgotPassword: "Forgot my password",
    heroSubtitle:
      "An executive experience for principals, school staff, teachers and families: every profile gets its own visual journey, with adaptive navigation, clear indicators and welcoming interactions.",
    heroTitle: "School management that feels simple, yet runs in 360º.",
    logoAlt: "SchoolFlow360 icon",
    passwordLabel: "Password",
    passwordPlaceholder: "Enter your password",
    signIn: "Sign in",
    signInTitle: "Access your SchoolFlow360º journey",
    tagAi: "AI",
    tagDashboard: "360º Dashboard",
    tagFinance: "Finance",
    tagStudents: "Students",
    tagWhiteLabel: "White Label",
  },
}
