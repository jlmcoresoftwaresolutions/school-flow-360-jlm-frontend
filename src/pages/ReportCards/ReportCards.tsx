import { useTranslation } from "react-i18next"

import { PageHeader } from "@/ds-components/molecules"

// Only the header for now: the page's content (and its own description) comes later.
export const ReportCards = () => {
  const { t } = useTranslation()

  return (
    <PageHeader
      description={t("common.placeholderDescription")}
      icon="grading-outline"
      title={t("shell.nav.reportCards")}
    />
  )
}
