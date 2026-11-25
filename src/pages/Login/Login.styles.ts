import styled from "styled-components"

import { borderRadiusLevels, colors, media, radius, shadows, spacing, translucency } from "@/foundation"

export const LoginWrapper = styled.div`
  align-items: center;
  display: flex;
  justify-content: center;
  min-height: 100vh;
  padding: ${spacing[24]};

  @media not all and ${media.md} {
    padding: ${spacing[16]};
  }
`

// One card in two panels: the school's on the left, the form on the right. On a narrow screen the
// school's panel becomes a compact header above the form, so the form shows without scrolling.
export const LoginCard = styled.div`
  border-radius: ${borderRadiusLevels.high};
  box-shadow: ${shadows.xl};
  display: grid;
  grid-template-columns: 1fr;
  max-width: 960px;
  overflow: hidden;
  width: 100%;

  @media ${media.md} {
    grid-template-columns: 5fr 6fr;
  }
`

// The school's panel: translucent over the animated background, which already takes the school's hues.
export const SchoolPanel = styled.section`
  backdrop-filter: ${translucency.high.backdropFilter};
  background: ${translucency.high.background};
  color: ${colors.neutral[0]};
  display: flex;
  flex-direction: column;
  gap: ${spacing[24]};
  padding: ${spacing[24]};

  @media ${media.md} {
    gap: ${spacing[32]};
    justify-content: space-between;
    padding: ${spacing[40]};
  }
`

export const SchoolPanelBody = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${spacing[16]};

  @media ${media.md} {
    gap: ${spacing[24]};
  }
`

// The logo sits on a white plate: a school's logo is drawn for a light background, and the panel is dark.
export const LogoPlate = styled.div`
  align-items: center;
  align-self: flex-start;
  background: ${colors.neutral[0]};
  border-radius: ${radius.xl};
  box-shadow: ${shadows.md};
  display: inline-flex;
  max-width: 100%;
  padding: ${spacing[12]} ${spacing[16]};
`

// A logo may be up to 4:1 (the backend's rule): it keeps its proportion inside a fixed height.
export const SchoolLogo = styled.img`
  display: block;
  height: ${spacing[48]};
  max-width: 100%;
  object-fit: contain;
  width: auto;

  @media ${media.md} {
    height: ${spacing[64]};
  }
`

export const ProductIcon = styled.img`
  display: block;
  height: ${spacing[48]};
  width: ${spacing[48]};

  @media ${media.md} {
    height: ${spacing[64]};
    width: ${spacing[64]};
  }
`

export const PoweredBy = styled.div`
  align-items: center;
  color: ${colors.neutral[300]};
  display: flex;
  gap: ${spacing[8]};

  img {
    border-radius: ${radius.sm};
    height: ${spacing[20]};
    width: ${spacing[20]};
  }
`

export const FormPanel = styled.div`
  background: ${colors.neutral[0]};
  display: flex;
  flex-direction: column;
  gap: ${spacing[24]};
  padding: ${spacing[24]};

  @media ${media.md} {
    justify-content: center;
    padding: ${spacing[40]} ${spacing[48]};
  }
`

// The open sessions to choose from when the limit is reached: one row each, its description beside the
// button that ends it. On a narrow screen the button goes under the text.
export const SessionList = styled.ul`
  display: flex;
  flex-direction: column;
  gap: ${spacing[12]};
  list-style: none;
  margin: 0;
  padding: 0;
`

export const SessionRow = styled.li`
  align-items: center;
  border: 1px solid ${colors.neutral[200]};
  border-radius: ${radius.md};
  display: flex;
  flex-wrap: wrap;
  gap: ${spacing[12]};
  justify-content: space-between;
  padding: ${spacing[12]} ${spacing[16]};
`

export const SessionDetails = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${spacing[4]};
`
