import { useTranslation } from "react-i18next"
import { Link } from "react-router-dom"

import { Button, Card, Grid, Text } from "@/ds-components/atoms"
import { StateMessage } from "@/ds-components/molecules"
import { spacing } from "@/foundation"
import { paths } from "@/routes/paths"

import { UnknownSchoolHint, UnknownSchoolWrapper } from "./UnknownSchool.styles"

// Where an address naming a school the backend doesn't have lands (404 TENANT_NOT_FOUND): unlike the
// unknown address, it has the shape of a school's, so the page shows it to be checked. Not a failure
// of the server, which did answer; "try again" is for a school whose address was only just set up.
export const SchoolNotFound = () => {
  const { t } = useTranslation()

  const address = window.location.host

  return (
    <UnknownSchoolWrapper>
      <Grid.Container>
        <Grid.Row justify="center">
          <Grid.Col xs={12} sm={10} md={8} lg={6}>
            <Card borderRadius="high" color="surface" elevated style={{ padding: spacing[40] }}>
              <StateMessage
                action={
                  <UnknownSchoolHint>
                    <Text fontSize="sm" semibold style={{ overflowWrap: "anywhere" }}>
                      {address}
                    </Text>
                    <Text color="secondary" fontSize="sm">
                      {t("schoolNotFound.help")}
                    </Text>
                    <Button as={Link} to={paths.login} variant="outlined">
                      {t("schoolNotFound.retry")}
                    </Button>
                  </UnknownSchoolHint>
                }
                description={t("schoolNotFound.description")}
                icon="school-outline"
                title={t("schoolNotFound.title")}
              />
            </Card>
          </Grid.Col>
        </Grid.Row>
      </Grid.Container>
    </UnknownSchoolWrapper>
  )
}
