import { useTranslation } from "react-i18next"

import { Card, Grid, Text } from "@/ds-components/atoms"
import { StateMessage } from "@/ds-components/molecules"
import { spacing } from "@/foundation"
import { getTenantDomain } from "@/utils/tenant"

import { UnknownSchoolHint, UnknownSchoolWrapper } from "./UnknownSchool.styles"

// Where an address that serves no school lands (the platform's domain itself, a reserved name, the
// Render address in production): every school is reached through its own address, so this page says
// the one opened isn't a school's and shows the shape of one, without guessing which school was meant.
export const UnknownSchool = () => {
  const { t } = useTranslation()

  const domain = getTenantDomain()

  return (
    <UnknownSchoolWrapper>
      <Grid.Container>
        <Grid.Row justify="center">
          <Grid.Col xs={12} sm={10} md={8} lg={6}>
            <Card borderRadius="high" color="surface" elevated style={{ padding: spacing[40] }}>
              <StateMessage
                action={
                  <UnknownSchoolHint>
                    {domain && (
                      <Text fontSize="sm" semibold style={{ whiteSpace: "nowrap" }}>
                        {`${t("unknownSchool.exampleName")}.${domain}`}
                      </Text>
                    )}
                    <Text color="secondary" fontSize="sm">
                      {t("unknownSchool.help")}
                    </Text>
                  </UnknownSchoolHint>
                }
                description={domain ? t("unknownSchool.description") : t("unknownSchool.descriptionWithoutDomain")}
                icon="school-outline"
                title={t("unknownSchool.title")}
              />
            </Card>
          </Grid.Col>
        </Grid.Row>
      </Grid.Container>
    </UnknownSchoolWrapper>
  )
}
