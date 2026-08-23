import type { Meta, StoryObj } from "@storybook/react-vite"

import { colors, spacing } from "@/foundation"

import { Grid } from "./Grid"

const demoBoxStyle = {
  background: colors.primary[100],
  border: `1px solid ${colors.primary[300]}`,
  color: colors.primary[800],
  padding: spacing[16],
  textAlign: "center" as const,
}

const meta: Meta<typeof Grid.Container> = {
  argTypes: {
    fluid: {
      control: "boolean",
      description: "Spans 100% of the available width instead of capping at a max-width per breakpoint.",
    },
  },
  component: Grid.Container,
  tags: ["autodocs"],
  title: "Atoms/Grid",
}

export default meta

type Story = StoryObj<typeof Grid.Container>

// Two equal-width columns (xs=12 stacked on mobile, md=6 side by side from md up)
export const Default: Story = {
  render: () => (
    <Grid.Container>
      <Grid.Row>
        <Grid.Col md={6} xs={12}>
          <div style={demoBoxStyle}>md={6}</div>
        </Grid.Col>
        <Grid.Col md={6} xs={12}>
          <div style={demoBoxStyle}>md={6}</div>
        </Grid.Col>
      </Grid.Row>
    </Grid.Container>
  ),
}

// Container with fluid enabled, so it spans 100% of the available width instead of capping at a max-width per breakpoint
export const Fluid: Story = {
  render: () => (
    <Grid.Container fluid>
      <Grid.Row>
        <Grid.Col md={4} xs={12}>
          <div style={demoBoxStyle}>md={4}</div>
        </Grid.Col>
        <Grid.Col md={4} xs={12}>
          <div style={demoBoxStyle}>md={4}</div>
        </Grid.Col>
        <Grid.Col md={4} xs={12}>
          <div style={demoBoxStyle}>md={4}</div>
        </Grid.Col>
      </Grid.Row>
    </Grid.Container>
  ),
}

// Three equal-width columns sharing a single row
export const ThreeColumns: Story = {
  render: () => (
    <Grid.Container>
      <Grid.Row>
        <Grid.Col md={4} xs={12}>
          <div style={demoBoxStyle}>xs=12 md=4</div>
        </Grid.Col>
        <Grid.Col md={4} xs={12}>
          <div style={demoBoxStyle}>xs=12 md=4</div>
        </Grid.Col>
        <Grid.Col md={4} xs={12}>
          <div style={demoBoxStyle}>xs=12 md=4</div>
        </Grid.Col>
      </Grid.Row>
    </Grid.Container>
  ),
}

// Row's justify/align props controlling horizontal spacing and vertical alignment of content-sized columns
export const JustifyAndAlign: Story = {
  render: () => (
    <Grid.Container>
      <Grid.Row align="center" justify="between" style={{ minHeight: 120 }}>
        <Grid.Col xs="content">
          <div style={demoBoxStyle}>start</div>
        </Grid.Col>
        <Grid.Col xs="content">
          <div style={demoBoxStyle}>center</div>
        </Grid.Col>
        <Grid.Col xs="content">
          <div style={demoBoxStyle}>end</div>
        </Grid.Col>
      </Grid.Row>
    </Grid.Container>
  ),
}

// Row's gutterWidth overriding the default spacing-token-derived gutter, here removing it entirely
export const CustomGutterWidth: Story = {
  render: () => (
    <Grid.Container>
      <Grid.Row gutterWidth={0}>
        <Grid.Col md={6} xs={12}>
          <div style={demoBoxStyle}>gutterWidth=0</div>
        </Grid.Col>
        <Grid.Col md={6} xs={12}>
          <div style={demoBoxStyle}>gutterWidth=0</div>
        </Grid.Col>
      </Grid.Row>
    </Grid.Container>
  ),
}

// Col's offset pushing a column to the right, here centering a 6-wide column with a 3-wide offset
export const Offset: Story = {
  render: () => (
    <Grid.Container>
      <Grid.Row>
        <Grid.Col md={6} offset={{ md: 3 }} xs={12}>
          <div style={demoBoxStyle}>
            md={6} offset={"{ md: 3 }"}
          </div>
        </Grid.Col>
      </Grid.Row>
    </Grid.Container>
  ),
}
