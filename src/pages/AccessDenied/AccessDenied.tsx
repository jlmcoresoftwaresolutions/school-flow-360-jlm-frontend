import { useTranslation } from "react-i18next"
import { Link } from "react-router-dom"

import { Button, Card } from "@/ds-components/atoms"
import { PageHeader, StateMessage } from "@/ds-components/molecules"
import { spacing } from "@/foundation"
import { homePath } from "@/routes/paths"

// Where a signed-in user lands after opening a page their roles don't open (JLM-181): it says the
// page isn't available to them, distinct from a technical failure, without telling anything about the
// page asked for (not its name, not whether it exists), and offers a safe way back. The menu already
// hides those pages; this covers a typed or old link. The backend refuses every call anyway.
export const AccessDenied = () => {
  const { t } = useTranslation()

  return (
    <>
      <PageHeader icon="lock-outline" title={t("accessDenied.title")} />

      <Card elevated style={{ padding: spacing[32] }}>
        <StateMessage
          action={
            <Button as={Link} to={homePath}>
              {t("accessDenied.goHome")}
            </Button>
          }
          description={t("accessDenied.description")}
          icon="lock-outline"
          title={t("accessDenied.heading")}
        />
      </Card>
    </>
  )
}
