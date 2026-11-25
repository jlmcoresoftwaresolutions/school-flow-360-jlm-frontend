import styled from "styled-components"

import { colors, media, radius, spacing } from "@/foundation"

export const HomeContent = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${spacing[32]};
`

// The introduction's three ideas: stacked on a phone, side by side from md up.
export const PillarList = styled.ul`
  display: grid;
  gap: ${spacing[16]};
  grid-template-columns: minmax(0, 1fr);
  list-style: none;

  @media ${media.md} {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
`

export const Pillar = styled.li`
  align-items: flex-start;
  border: 1px solid ${colors.neutral[200]};
  border-radius: ${radius.lg};
  display: flex;
  gap: ${spacing[12]};
  padding: ${spacing[16]};
`

// An icon in a soft circle of the school's color, its glyph in the 700 that keeps contrast on the 50.
export const IconBadge = styled.span`
  align-items: center;
  background-color: ${colors.primary[50]};
  border-radius: ${radius.full};
  color: ${colors.primary[700]};
  display: inline-flex;
  flex-shrink: 0;
  height: ${spacing[40]};
  justify-content: center;
  width: ${spacing[40]};
`

export const Section = styled.section`
  display: flex;
  flex-direction: column;
  gap: ${spacing[16]};
`

// The feature cards fill the row, as many as fit at a readable width.
export const FeatureGrid = styled.ul`
  display: grid;
  gap: ${spacing[16]};
  grid-template-columns: repeat(auto-fill, minmax(${spacing[256]}, 1fr));
  list-style: none;
`

export const FeatureItem = styled.li`
  display: flex;
`

export const FeatureBody = styled.div`
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: ${spacing[8]};
`

// The button sits at the bottom of every card, whatever the length of its text.
export const FeatureAction = styled.div`
  display: flex;
  margin-top: auto;
  padding-top: ${spacing[8]};
`
