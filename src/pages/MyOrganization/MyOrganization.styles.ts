import styled, { css, keyframes } from "styled-components"

import { borderRadiusLevels, colors, media, motion, opacity, radius, shadows, spacing, typography } from "@/foundation"

// Inside a tab's main card: its sub-cards stacked with a steady gap.
export const TabPanel = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${spacing[24]};
`

// A section inside the main card: bordered instead of elevated, so only the main card casts a shadow.
export const SubCard = styled.section`
  background: ${colors.neutral[0]};
  border: 1px solid ${colors.neutral[200]};
  border-radius: ${borderRadiusLevels.medium};
  min-width: 0;
  padding: ${spacing[24]};
`

// The notice of a save that found the record changed by someone else (ConflictNotice).
export const ConflictNoticeBox = styled.div`
  background: ${colors.warning[50]};
  border: 1px solid ${colors.warning[500]};
  border-radius: ${radius.md};
  display: flex;
  flex-direction: column;
  gap: ${spacing[8]};
  padding: ${spacing[16]};
`

export const ConflictActions = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: ${spacing[8]};
`

// The current version, inside the notice: on the page's surface so it reads like the section itself.
export const ConflictCurrent = styled.section`
  background: ${colors.neutral[0]};
  border: 1px solid ${colors.neutral[200]};
  border-radius: ${radius.md};
  padding: ${spacing[16]};
`

export type AnimatedHeightBoxProps = {
  $isAnimating: boolean
}

// The box whose height follows its content (see useAnimatedHeight), set inline. It reaches a little
// past its content on every side (and the content pads it back), so the shadow and focus ring of a
// field at the edge aren't cut while it clips during the animation.
export const AnimatedHeightBox = styled.div<AnimatedHeightBoxProps>`
  margin: -${spacing[4]};
  overflow: ${(props) => (props.$isAnimating ? "hidden" : "visible")};
  transition: height ${motion.duration.slow} ${motion.easing.inOut};

  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }
`

export const AnimatedHeightContent = styled.div`
  padding: ${spacing[4]};
`

// Fades in while rising slightly into place: the reading or the form taking over a section.
const swapIn = keyframes`
  from {
    opacity: ${opacity.hidden};
    transform: translateY(${spacing[4]});
  }

  to {
    opacity: ${opacity.visible};
    transform: translateY(0);
  }
`

export type SwappedContentProps = {
  $animate: boolean
}

// What a section shows in one mode; it plays the fade-in each time the mode changes (it is keyed by
// it), but not on the page's first render.
export const SwappedContent = styled.div<SwappedContentProps>`
  ${(props) =>
    props.$animate &&
    css`
      animation: ${swapIn} ${motion.duration.normal} ${motion.easing.out};
    `}

  @media (prefers-reduced-motion: reduce) {
    animation: none;
  }
`

export const SectionHeader = styled.div`
  align-items: flex-start;
  display: flex;
  flex-wrap: wrap;
  gap: ${spacing[12]};
  justify-content: space-between;
  margin-bottom: ${spacing[20]};
`

export const SectionHeading = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${spacing[4]};
`

export const FieldGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${spacing[16]};
`

export const FormActions = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: ${spacing[12]};
  justify-content: flex-end;
  margin-top: ${spacing[24]};
`

// Two cards side by side from md up, stacked below it; each keeps its own height.
export const CardGrid = styled.div`
  align-items: start;
  display: grid;
  gap: ${spacing[24]};
  grid-template-columns: 1fr;

  @media ${media.md} {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
`

// The organization in use, at the top of the overview.
export const OrganizationSummaryLayout = styled.div`
  align-items: center;
  display: flex;
  flex-wrap: wrap;
  gap: ${spacing[24]};
`

export const OrganizationSummaryText = styled.div`
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: ${spacing[8]};
  min-width: 0;
`

export const InlineGroup = styled.div`
  align-items: center;
  display: flex;
  flex-wrap: wrap;
  gap: ${spacing[8]};
`

// A logo keeps its own proportions inside a fixed box, whatever its shape.
export const LogoBox = styled.div`
  align-items: center;
  background: ${colors.neutral[50]};
  border: 1px solid ${colors.neutral[200]};
  border-radius: ${radius.lg};
  display: flex;
  flex-shrink: 0;
  height: ${spacing[80]};
  justify-content: center;
  overflow: hidden;
  padding: ${spacing[8]};
  width: ${spacing[192]};
`

// The published logo and favicon, side by side at the start of the overview's header.
export const BrandImages = styled.div`
  display: flex;
  flex-shrink: 0;
  gap: ${spacing[12]};
`

// The favicon's frame: the logo's look, square.
export const FaviconBox = styled.div`
  align-items: center;
  background: ${colors.neutral[50]};
  border: 1px solid ${colors.neutral[200]};
  border-radius: ${radius.lg};
  display: flex;
  flex-shrink: 0;
  height: ${spacing[80]};
  justify-content: center;
  width: ${spacing[80]};
`

// A favicon is drawn for 16-32 px; 48 px shows it clearly without blowing up a small one.
export const FaviconImage = styled.img`
  height: ${spacing[48]};
  object-fit: contain;
  width: ${spacing[48]};
`

export const LogoImage = styled.img`
  max-height: 100%;
  max-width: 100%;
  object-fit: contain;
`

export const ColorValue = styled.span`
  align-items: center;
  display: inline-flex;
  gap: ${spacing[8]};
`

export type ColorSwatchProps = {
  $color: string
}

export const ColorSwatch = styled.span<ColorSwatchProps>`
  background: ${(props) => props.$color};
  border: 1px solid ${colors.neutral[200]};
  border-radius: ${radius.sm};
  display: inline-block;
  height: ${spacing[20]};
  width: ${spacing[20]};
`

// The units summary: a short list, each unit on its own row.
export const UnitsSummaryList = styled.ul`
  display: flex;
  flex-direction: column;
  list-style: none;
  margin: 0;
  padding: 0;
`

export const UnitsSummaryItem = styled.li`
  align-items: center;
  border-top: 1px solid ${colors.neutral[200]};
  display: flex;
  gap: ${spacing[12]};
  justify-content: space-between;
  padding: ${spacing[12]} 0;

  &:first-child {
    border-top: none;
  }
`

export const UnitsSummaryCounts = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: ${spacing[24]};
  margin-bottom: ${spacing[16]};
`

export const CountBlock = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${spacing[4]};
`

export const CountValue = styled.span`
  color: ${colors.neutral[900]};
  font-family: ${typography.fontFamily.sans};
  font-size: ${typography.fontSize["2xl"]}px;
  font-weight: ${typography.fontWeight.bold};
  line-height: ${typography.lineHeight["2xl"]};
`

// The identity editor beside its preview, from lg up.
export const BrandingLayout = styled.div`
  align-items: start;
  display: grid;
  gap: ${spacing[24]};
  grid-template-columns: 1fr;

  @media ${media.lg} {
    grid-template-columns: minmax(0, 3fr) minmax(0, 2fr);
  }
`

export const PreviewFrame = styled.div`
  border: 1px solid ${colors.neutral[200]};
  border-radius: ${radius.lg};
  box-shadow: ${shadows.sm};
  overflow: hidden;
`

// A browser tab, showing the favicon beside the display name.
export const PreviewBrowserBar = styled.div`
  align-items: flex-end;
  background: ${colors.neutral[100]};
  display: flex;
  padding: ${spacing[8]} ${spacing[12]} 0;
`

export const PreviewBrowserTab = styled.div`
  align-items: center;
  background: ${colors.neutral[0]};
  border-radius: ${radius.md} ${radius.md} 0 0;
  display: flex;
  gap: ${spacing[8]};
  max-width: 100%;
  padding: ${spacing[8]} ${spacing[12]};
`

export const PreviewFavicon = styled.img`
  flex-shrink: 0;
  height: ${spacing[16]};
  object-fit: contain;
  width: ${spacing[16]};
`

export type PreviewHeaderProps = {
  $background: string
}

export const PreviewHeader = styled.div<PreviewHeaderProps>`
  align-items: center;
  background: ${(props) => props.$background};
  display: flex;
  gap: ${spacing[12]};
  min-height: ${spacing[64]};
  padding: ${spacing[12]} ${spacing[16]};
`

export const PreviewLogo = styled.img`
  flex-shrink: 0;
  max-height: ${spacing[40]};
  max-width: ${spacing[128]};
  object-fit: contain;
`

export const PreviewBody = styled.div`
  background: ${colors.neutral[0]};
  display: flex;
  flex-direction: column;
  gap: ${spacing[12]};
  padding: ${spacing[16]};
`

export type PreviewAccentProps = {
  $color: string
}

export const PreviewAccent = styled.span<PreviewAccentProps>`
  background: ${(props) => props.$color};
  border-radius: ${radius.full};
  display: block;
  height: ${spacing[4]};
  width: ${spacing[48]};
`

export type PreviewButtonProps = {
  $color: string
}

export const PreviewButton = styled.span<PreviewButtonProps>`
  align-self: flex-start;
  background: ${(props) => props.$color};
  border-radius: ${radius.md};
  color: ${colors.neutral[0]};
  font-family: ${typography.fontFamily.sans};
  font-size: ${typography.fontSize.sm}px;
  font-weight: ${typography.fontWeight.semibold};
  padding: ${spacing[8]} ${spacing[16]};
`

export const FilePreview = styled.div`
  align-items: center;
  display: flex;
  gap: ${spacing[12]};
`

export const FileThumb = styled.img`
  background: ${colors.neutral[50]};
  border: 1px solid ${colors.neutral[200]};
  border-radius: ${radius.md};
  height: ${spacing[48]};
  object-fit: contain;
  padding: ${spacing[4]};
  width: ${spacing[96]};
`
