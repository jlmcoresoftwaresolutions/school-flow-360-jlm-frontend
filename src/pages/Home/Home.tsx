import { useTranslation } from "react-i18next"
import { Link } from "react-router-dom"

import { Button, Card, Icon, Text } from "@/ds-components/atoms"
import { PageHeader } from "@/ds-components/molecules"
import { spacing } from "@/foundation"
import { useSignedInUser } from "@/hooks"
import { pageRoles } from "@/routes/access"
import { paths } from "@/routes/paths"
import { canOpenPage } from "@/utils/access"

import { homeFeatures, homePillars } from "./Home.features"
import {
  FeatureAction,
  FeatureBody,
  FeatureGrid,
  FeatureItem,
  HomeContent,
  IconBadge,
  Pillar,
  PillarList,
  Section,
} from "./Home.styles"

// The home page: a short presentation of what SchoolFlow360º is, and a card for each main area the
// person may open, with a button to its page. The areas follow the same access rule as the menu, so
// nobody is offered a page that would answer "access denied".
export const Home = () => {
  const { t } = useTranslation()
  const user = useSignedInUser()

  const firstName = user?.fullName?.trim().split(/\s+/)[0]
  const features = homeFeatures.filter((feature) => canOpenPage(user, pageRoles[feature.page]))

  return (
    <>
      <PageHeader description={t("home.description")} icon="home-outline" title={t("shell.nav.home")} />

      <HomeContent>
        <Card elevated style={{ display: "flex", flexDirection: "column", gap: spacing[20], padding: spacing[32] }}>
          <div style={{ display: "flex", flexDirection: "column", gap: spacing[8] }}>
            <Text as="h2" fontSize="xl" bold>
              {firstName ? t("home.greeting", { name: firstName }) : t("home.greetingNoName")}
            </Text>
            {/* The product name is a brand term, not translated content. */}
            <Text color="secondary">{t("home.intro", { product: "SchoolFlow360º" })}</Text>
          </div>

          <PillarList aria-label={t("home.pillarsLabel")}>
            {homePillars.map((pillar) => (
              <Pillar key={pillar.key}>
                <IconBadge aria-hidden="true">
                  <Icon color="inherit" name={pillar.icon} size={20} />
                </IconBadge>
                <div style={{ display: "flex", flexDirection: "column", gap: spacing[4] }}>
                  <Text as="h3" fontSize="md" bold>
                    {t(`home.pillars.${pillar.key}.title`)}
                  </Text>
                  <Text color="secondary" fontSize="sm">
                    {t(`home.pillars.${pillar.key}.description`)}
                  </Text>
                </div>
              </Pillar>
            ))}
          </PillarList>
        </Card>

        {features.length > 0 && (
          <Section aria-labelledby="home-features-title">
            <div style={{ display: "flex", flexDirection: "column", gap: spacing[4] }}>
              <Text as="h2" fontSize="xl" id="home-features-title" bold>
                {t("home.featuresTitle")}
              </Text>
              <Text color="secondary">{t("home.featuresDescription")}</Text>
            </div>

            <FeatureGrid>
              {features.map((feature) => {
                const title = t(`home.features.${feature.key}.title`)

                return (
                  <FeatureItem key={feature.key}>
                    <Card
                      elevated
                      style={{
                        display: "flex",
                        flex: 1,
                        flexDirection: "column",
                        gap: spacing[16],
                        padding: spacing[24],
                      }}
                    >
                      <IconBadge aria-hidden="true">
                        <Icon color="inherit" name={feature.icon} size={20} />
                      </IconBadge>
                      <FeatureBody>
                        <Text as="h3" fontSize="lg" bold>
                          {title}
                        </Text>
                        <Text color="secondary" fontSize="sm">
                          {t(`home.features.${feature.key}.description`)}
                        </Text>
                        <FeatureAction>
                          <Button
                            aria-label={t("home.openFeature", { name: title })}
                            as={Link}
                            size="small"
                            to={paths[feature.page]}
                            variant="outlined"
                          >
                            {t("home.open")}
                          </Button>
                        </FeatureAction>
                      </FeatureBody>
                    </Card>
                  </FeatureItem>
                )
              })}
            </FeatureGrid>
          </Section>
        )}
      </HomeContent>
    </>
  )
}
