import { useTranslation } from "react-i18next"

import { PageHeader } from "@/ds-components/molecules"

// Only the header for now: the page's content comes in its own phase of the academic structure (P04).
export const Rooms = () => {
  const { t } = useTranslation()

  return (
    <PageHeader description={t("academic.descriptions.rooms")} icon="location-outline" title={t("shell.nav.rooms")} />
  )
}
