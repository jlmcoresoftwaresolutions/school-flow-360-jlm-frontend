import { useTranslation } from "react-i18next"

import schoolFlowIcon from "@/assets/images/school-flow-icon.svg"
import { Button, Card, Grid, Icon, type IconProps, Image, Tag, type TagProps, Text } from "@/ds-components/atoms"

import { Input } from "../../ds-components/molecules"
import { colors, spacing } from "../../foundation"
import { LoginWrapper } from "./Login.styles"

const commonTagProps: Omit<TagProps, "children"> = {
  color: "muted",
  fontWeight: "bold",
  padding: "md",
  textColor: colors.neutral[0],
  translucent: "high",
  variant: "soft",
}

const commonTagStartIconProps: Omit<IconProps, "name"> = {
  color: "inverse",
  size: 16,
}

export const Login = () => {
  const { t } = useTranslation()

  return (
    <LoginWrapper>
      <Grid.Container>
        <Grid.Row align="center" justify="center">
          <Grid.Col xs={12} md={7}>
            <Card
              borderRadius="high"
              translucent="high"
              elevated
              style={{ display: "flex", flexDirection: "column", gap: spacing[20], padding: spacing[40] }}
            >
              <div style={{ alignItems: "center", display: "flex", gap: spacing[12] }}>
                <Image alt={t("login.logoAlt")} borderRadius="medium" size={64} src={schoolFlowIcon} />

                <div style={{ display: "flex", flexDirection: "column" }}>
                  {/* The product name is a brand term, not translated content, like "White Label" below. */}
                  <Text as="p" color="inverse" fontSize="lg" bold>
                    SchoolFlow360º
                  </Text>

                  <Text as="p" color="muted" fontSize="sm">
                    {t("common.poweredBy")}
                  </Text>
                </div>
              </div>

              <Text as="p" color="inverse" fontSize="7xl" bold>
                {t("login.heroTitle")}
              </Text>

              <Text as="p" color="muted">
                {t("login.heroSubtitle")}
              </Text>

              <div style={{ display: "flex", flexWrap: "wrap", gap: spacing[8] }}>
                <Tag {...commonTagProps} startIcon={<Icon {...commonTagStartIconProps} name="dashboard-outline" />}>
                  {t("login.tagDashboard")}
                </Tag>

                <Tag {...commonTagProps} startIcon={<Icon {...commonTagStartIconProps} name="label-outline" />}>
                  {t("login.tagWhiteLabel")}
                </Tag>

                <Tag {...commonTagProps} startIcon={<Icon {...commonTagStartIconProps} name="users-outline" />}>
                  {t("login.tagStudents")}
                </Tag>

                <Tag {...commonTagProps} startIcon={<Icon {...commonTagStartIconProps} name="money-outline" />}>
                  {t("login.tagFinance")}
                </Tag>

                <Tag {...commonTagProps} startIcon={<Icon {...commonTagStartIconProps} name="star-outline" />}>
                  {t("login.tagAi")}
                </Tag>
              </div>
            </Card>
          </Grid.Col>

          <Grid.Col xs={12} md={5}>
            <Card
              borderRadius="high"
              color="surface"
              elevated
              style={{ display: "flex", flexDirection: "column", gap: spacing[24], padding: spacing[40] }}
            >
              <Text as="p" fontSize="3xl" bold>
                {t("login.signInTitle")}
              </Text>

              <div style={{ display: "flex", flexDirection: "column", gap: spacing[24] }}>
                <div style={{ display: "flex", flexDirection: "column", gap: spacing[16] }}>
                  <Input placeholder={t("login.emailPlaceholder")} title={t("login.emailLabel")} type="email" />

                  <Input
                    placeholder={t("login.passwordPlaceholder")}
                    title={t("login.passwordLabel")}
                    type="password"
                  />
                </div>

                <div
                  style={{ alignItems: "center", display: "flex", gap: spacing[16], justifyContent: "space-between" }}
                >
                  <Button startIcon={<Icon color="inverse" name="lock-outline" size={16} />}>
                    {t("login.signIn")}
                  </Button>

                  <Button variant="link">{t("login.forgotPassword")}</Button>
                </div>
              </div>
            </Card>
          </Grid.Col>
        </Grid.Row>
      </Grid.Container>
    </LoginWrapper>
  )
}
