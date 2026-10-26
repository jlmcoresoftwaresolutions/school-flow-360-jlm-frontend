import i18next from "i18next"
import LanguageDetector from "i18next-browser-languagedetector"
import { initReactI18next } from "react-i18next"

import { en } from "./locales/en"
import type { TranslationResource } from "./locales/ptBR"
import { ptBR } from "./locales/ptBR"

// Augments i18next's own types with this app's actual resource shape, so `t("login.emailLabel")`
// is autocompleted and a typo'd or removed key fails `tsc`, the same safety net the rest of the
// project leans on instead of runtime validation (see httpClient.ts's own `declare module` for the
// same pattern applied to axios).
declare module "i18next" {
  interface CustomTypeOptions {
    defaultNS: "translation"
    resources: {
      translation: TranslationResource
    }
  }
}

export const supportedLanguages = ["pt-BR", "en"]

// LanguageDetector picks the viewer's language (persisted choice in localStorage, then the browser's
// own language) and initReactI18next wires the useTranslation hook up to it. Resources are bundled
// directly instead of loaded from a backend - the catalog is small enough that a network round trip
// to fetch it isn't worth it. useSuspense is off since nothing else in the project renders through
// Suspense yet: a component can render once before init() settles (useTranslation then returns the
// raw key) and again right after, so an assertion on translated text in a test should prefer
// `findByText` over `getByText` for that same reason - see i18n.test.tsx.
i18next
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    detection: { caches: ["localStorage"] },
    fallbackLng: "pt-BR",
    interpolation: { escapeValue: false },
    react: { useSuspense: false },
    resources: {
      "pt-BR": { translation: ptBR },
      en: { translation: en },
    },
    // Deliberately NOT paired with `nonExplicitSupportedLngs: true`: that option is meant to accept
    // a detected code like "en-US" for a supported "en", but with a region-qualified code already in
    // this very list ("pt-BR") it instead strips the region before comparing, so "pt-BR" itself stops
    // matching "pt-BR" and every lookup under it silently falls through to the raw key. `load: "all"`
    // (i18next's own default) already builds the "en-US" -> "en" fallback without that option.
    supportedLngs: supportedLanguages,
  })

// Keeps <html lang> on the active language, so screen readers pick the right voice and pronunciation
// (index.html starts it at pt-BR, the fallback, for the moment before this runs).
const syncDocumentLanguage = (language: string) => {
  document.documentElement.lang = language
}

if (i18next.resolvedLanguage) syncDocumentLanguage(i18next.resolvedLanguage)
i18next.on("languageChanged", syncDocumentLanguage)

export const i18n = i18next
