import { useTranslation } from "react-i18next"
import { Link } from "react-router-dom"

import { Button, Card, Grid, Text } from "@/ds-components/atoms"
import { StateMessage } from "@/ds-components/molecules"
import { spacing } from "@/foundation"
import { paths } from "@/routes/paths"

import { UnknownSchoolHint, UnknownSchoolWrapper } from "./UnknownSchool.styles"

// Where every page of a school that was deactivated lands (403 ORGANIZATION_INACTIVE, on any call,
// sign-in included): nobody of the school gets in, the Admin neither, until the JLM team reactivates it.
// Not a failure of the server; "try again" is for a school just reactivated (the backend notices within
// about 20 seconds).
export const SchoolInactive = () => {
  const { t } = useTranslation()

  return (
    <UnknownSchoolWrapper>
      <Grid.Container>
        <Grid.Row justify="center">
          <Grid.Col xs={12} sm={10} md={8} lg={6}>
            <Card borderRadius="high" color="surface" elevated style={{ padding: spacing[40] }}>
              <StateMessage
                action={
                  <UnknownSchoolHint>
                    <Text color="secondary" fontSize="sm">
                      {t("schoolInactive.help")}
                    </Text>
                    <Button as={Link} to={paths.login} variant="outlined">
                      {t("schoolInactive.retry")}
                    </Button>
                  </UnknownSchoolHint>
                }
                description={t("schoolInactive.description")}
                icon="lock-outline"
                title={t("schoolInactive.title")}
              />
            </Card>
          </Grid.Col>
        </Grid.Row>
      </Grid.Container>
    </UnknownSchoolWrapper>
  )
}
