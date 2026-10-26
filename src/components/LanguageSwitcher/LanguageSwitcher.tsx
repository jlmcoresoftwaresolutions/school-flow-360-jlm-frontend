import type { CSSProperties } from "react"
import { useTranslation } from "react-i18next"

import { ActionMenu } from "@/ds-components/molecules"
import { supportedLanguages } from "@/i18n"

// Each language named in itself (an endonym), not translated: someone who can't read the current
// language still recognizes their own in the list.
const languageNames: Record<string, string> = {
  en: "English",
  "pt-BR": "Português (Brasil)",
}

export type LanguageSwitcherProps = {
  label: string
  align?: "end" | "start"
  className?: string
  style?: CSSProperties
}

// A language icon that opens the list of supported languages, the active one checked. Picking one
// switches i18next's language, which the browser detector then remembers (see i18n.ts). Only the
// trigger's accessible name is copy, and it comes in through `label`.
export const LanguageSwitcher = (props: LanguageSwitcherProps) => {
  const { align, className, label, style } = props

  const { i18n } = useTranslation()

  const items = supportedLanguages.map((language) => ({
    checked: language === i18n.resolvedLanguage,
    key: language,
    label: languageNames[language] ?? language,
    onClick: () => void i18n.changeLanguage(language),
  }))

  return (
    <ActionMenu
      align={align}
      className={className}
      items={items}
      style={style}
      triggerIcon="language"
      triggerLabel={label}
    />
  )
}
