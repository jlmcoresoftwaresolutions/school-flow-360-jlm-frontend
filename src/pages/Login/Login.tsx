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
  return (
    <LoginWrapper>
      <Grid.Container>
        <Grid.Row align="center" justify="center">
          <Grid.Col xs={12} md={6}>
            <Card
              borderRadius="high"
              translucent="high"
              elevated
              style={{ display: "flex", flexDirection: "column", gap: spacing[20], padding: spacing[40] }}
            >
              <div style={{ alignItems: "center", display: "flex", gap: spacing[12] }}>
                <Image alt="Ícone do SchoolFlow360" borderRadius="medium" size={64} src={schoolFlowIcon} />

                <div style={{ display: "flex", flexDirection: "column" }}>
                  <Text as="p" color="inverse" fontSize="lg" bold>
                    SchoolFlow360º
                  </Text>

                  <Text as="p" color="muted" fontSize="sm">
                    Powered by JLM Core
                  </Text>
                </div>
              </div>

              <Tag
                color="success"
                fontSize="xs"
                fontWeight="superbold"
                variant="soft"
                style={{ textTransform: "uppercase" }}
              >
                SaaS White Label Multi-Tenant
              </Tag>

              <Text as="p" color="inverse" fontSize="7xl" bold>
                Gestão escolar que parece simples, mas opera em 360º.
              </Text>

              <Text as="p" color="muted">
                Uma experiência executiva para diretores, escola, professores e famílias: cada perfil entra em uma
                jornada visual própria, com navegação adaptativa, indicadores claros e interações acolhedoras.
              </Text>

              <div style={{ display: "flex", flexWrap: "wrap", gap: spacing[8] }}>
                <Tag {...commonTagProps} startIcon={<Icon {...commonTagStartIconProps} name="dashboard-outline" />}>
                  Dashboard 360º
                </Tag>

                <Tag {...commonTagProps} startIcon={<Icon {...commonTagStartIconProps} name="label-outline" />}>
                  White Label
                </Tag>

                <Tag {...commonTagProps} startIcon={<Icon {...commonTagStartIconProps} name="users-outline" />}>
                  Alunos
                </Tag>

                <Tag {...commonTagProps} startIcon={<Icon {...commonTagStartIconProps} name="money-outline" />}>
                  Financeiro
                </Tag>

                <Tag {...commonTagProps} startIcon={<Icon {...commonTagStartIconProps} name="star-outline" />}>
                  IA
                </Tag>
              </div>
            </Card>
          </Grid.Col>

          <Grid.Col xs={12} md={6}>
            <Card
              borderRadius="high"
              color="surface"
              elevated
              style={{ display: "flex", flexDirection: "column", gap: spacing[24], padding: spacing[40] }}
            >
              <div style={{ display: "flex", flexDirection: "column", gap: spacing[12] }}>
                <Text as="p" color="brand" fontSize="xs" superbold style={{ textTransform: "uppercase" }}>
                  Entrada Segura
                </Text>

                <Text as="p" fontSize="3xl" bold>
                  Acesse sua jornada SchoolFlow360º
                </Text>

                <Text as="p" color="secondary">
                  Digite seu e-mail e senha, escolha seu perfil e acesse uma experiência preparada para a sua rotina.
                </Text>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: spacing[24] }}>
                <div style={{ display: "flex", flexDirection: "column", gap: spacing[16] }}>
                  <Input placeholder="Digite seu e-mail" title="E-mail" type="email" />

                  <Input placeholder="Digite sua senha" title="Senha" type="password" />
                </div>

                <div
                  style={{ alignItems: "center", display: "flex", gap: spacing[16], justifyContent: "space-between" }}
                >
                  <Button
                    startIcon={<Icon color="inverse" name="lock-outline" size={16} />}
                    style={{
                      background: `linear-gradient(90deg, ${colors.primary[500]} 0%, ${colors.success[500]} 100%)`,
                    }}
                  >
                    Entrar
                  </Button>

                  <Button variant="link">Esqueci minha senha</Button>
                </div>
              </div>
            </Card>
          </Grid.Col>
        </Grid.Row>
      </Grid.Container>
    </LoginWrapper>
  )
}
