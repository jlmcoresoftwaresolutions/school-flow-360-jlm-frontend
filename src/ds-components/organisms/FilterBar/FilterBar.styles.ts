import styled from "styled-components"

import { spacing } from "@/foundation"

// Everything wraps: on a narrow screen the search takes a full row, the filters stack below it and
// the actions drop to their own row, instead of the bar overflowing sideways.
export const StyledFilterBar = styled.div`
  align-items: flex-end;
  display: flex;
  flex-wrap: wrap;
  gap: ${spacing[12]};
`

export const StyledFilterBarFilters = styled.div`
  align-items: flex-end;
  display: flex;
  flex: 1 1 auto;
  flex-wrap: wrap;
  gap: ${spacing[12]};
  min-width: 0;
`

export const StyledFilterBarSearch = styled.div`
  flex: 1 1 ${spacing[256]};
  max-width: calc(${spacing[256]} * 2);
  min-width: 0;
`

// Each filter keeps a usable width but may grow, so a row of selects shares the space evenly.
export const StyledFilterBarFilter = styled.div`
  flex: 1 1 ${spacing[176]};
  max-width: ${spacing[256]};
  min-width: 0;
`

export const StyledFilterBarActions = styled.div`
  align-items: center;
  display: flex;
  flex-shrink: 0;
  flex-wrap: wrap;
  gap: ${spacing[8]};
  margin-left: auto;
`
