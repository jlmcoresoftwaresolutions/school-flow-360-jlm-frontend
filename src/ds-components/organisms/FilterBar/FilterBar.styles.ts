import styled, { css } from "styled-components"

import { Collapsible } from "@/ds-components/molecules/Collapsible"
import { motion, opacity, spacing } from "@/foundation"

// The most filters on a row; more of them wrap onto the next one.
const maxFilterColumns = 4

// Three rows, top to bottom: the title, the filters and the search with the actions. A row is only
// rendered when it has something in it. Each row wraps on a narrow screen instead of overflowing sideways.
// There is no flex gap between the rows: the filters slide shut to zero height, and a gap would still be
// counted around them, so each row carries its own spacing instead - the filters their padding, and the
// last row a top margin that is the only space left between the title and it once the filters are shut.
export const StyledFilterBar = styled(Collapsible)`
  display: flex;
  flex-direction: column;
`

// The title on the left and the button that expands or hides the filters on the right.
export const StyledFilterBarHeader = styled.div`
  align-items: center;
  display: flex;
  gap: ${spacing[12]};
  justify-content: space-between;
`

// The filters share a grid of at most four equal columns, each filter filling its own column. A column
// is never narrower than a usable filter, so a narrow screen has fewer columns, down to one. Empty
// columns stay (auto-fill), so two filters take two quarters of the row instead of stretching over it.
export const StyledFilterBarFilters = styled.div`
  align-items: end;
  display: grid;
  gap: ${spacing[12]};
  grid-template-columns: repeat(
    auto-fill,
    minmax(max(${spacing[176]}, calc((100% - ${maxFilterColumns - 1} * ${spacing[12]}) / ${maxFilterColumns})), 1fr)
  );
  min-width: 0;
  padding: ${spacing[12]} 0;
`

export const StyledFilterBarFilter = styled.div`
  min-width: 0;
`

// The search on the left and the clear button and actions on the right, wrapping when they don't fit.
export const StyledFilterBarBottom = styled.div`
  align-items: center;
  display: flex;
  flex-wrap: wrap;
  gap: ${spacing[12]};
  justify-content: space-between;
  margin-top: ${spacing[12]};
`

export const StyledFilterBarSearch = styled.div`
  flex: 1 1 ${spacing[256]};
  max-width: calc(${spacing[256]} * 2);
  min-width: 0;
`

// The clear button and the actions. No gap here: the space between the clear button and the actions is
// inside the clear button's sliding area, so nothing is left behind while it is hidden.
export const StyledFilterBarActions = styled.div`
  align-items: center;
  display: flex;
  margin-left: auto;
`

export type StyledFilterBarClearProps = {
  $visible: boolean
}

// The clear button slides in and out sideways, fading, by animating one grid column between 0fr and 1fr,
// which needs no measuring. Hidden, it is also visibility: hidden (applied once the slide is over), so it
// leaves the tab order. Reduced motion keeps a near-zero duration, so the transition still ends.
export const StyledFilterBarClear = styled.div<StyledFilterBarClearProps>`
  ${(props) => {
    const { $visible } = props

    return css`
      display: grid;
      grid-template-columns: ${$visible ? "1fr" : "0fr"};
      opacity: ${$visible ? opacity.visible : opacity.hidden};
      transition:
        grid-template-columns ${motion.duration.normal} ${motion.easing.ease},
        opacity ${motion.duration.normal} ${motion.easing.ease},
        visibility 0s linear ${$visible ? "0s" : motion.duration.normal};
      visibility: ${$visible ? "visible" : "hidden"};

      @media (prefers-reduced-motion: reduce) {
        transition-duration: 0.01ms;
        transition-delay: 0s;
      }
    `
  }}
`

export type StyledFilterBarClearInnerProps = {
  $clip: boolean
  $spaced: boolean
}

// Clipped only while the button is narrower than itself (sliding, or hidden), so its focus ring is never
// cut off once it is fully in. It carries the space before the actions, which slides along with it.
export const StyledFilterBarClearInner = styled.div<StyledFilterBarClearInnerProps>`
  ${(props) => {
    const { $clip, $spaced } = props

    return css`
      min-width: 0;
      overflow: ${$clip ? "hidden" : "visible"};
      padding-right: ${$spaced ? spacing[8] : 0};
      white-space: nowrap;
    `
  }}
`

export const StyledFilterBarActionButtons = styled.div`
  align-items: center;
  display: flex;
  flex-wrap: wrap;
  gap: ${spacing[8]};
`
