import { useTranslation } from "react-i18next"

import { Badge } from "@/ds-components/atoms"

// The "Anonimizado" tag of a person in a list or a profile.
export const AnonymizedBadge = () => {
  const { t } = useTranslation()

  return <Badge tone="neutral">{t("people.anonymizedTag")}</Badge>
}
