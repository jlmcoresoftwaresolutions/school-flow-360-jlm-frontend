import { useTranslation } from "react-i18next"

import { PageHeader } from "@/ds-components/molecules"

// Only the header for now: the page's content comes in its own phase of the academic structure (P04).
export const AcademicCalendar = () => {
  const { t } = useTranslation()

  return (
    <PageHeader
      description={t("academic.descriptions.academicCalendar")}
      icon="event-note-outline"
      title={t("shell.nav.academicCalendar")}
    />
  )
}
