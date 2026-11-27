import styled from "styled-components"

import { borderRadiusLevels, colors, media, spacing } from "@/foundation"

// The notice of an enrollment that is part of a prepared lifecycle event, above its tabs: the icon, the
// text and the way to the event, which goes below the text on a narrow screen.
export const LifecycleNoticeBox = styled.div`
  align-items: flex-start;
  background: ${colors.info[50]};
  border: 1px solid ${colors.neutral[300]};
  border-radius: ${borderRadiusLevels.medium};
  display: flex;
  flex-wrap: wrap;
  gap: ${spacing[12]};
  margin-bottom: ${spacing[16]};
  padding: ${spacing[16]};

  > div {
    flex: 1 1 240px;
  }

  @media ${media.md} {
    align-items: center;
    flex-wrap: nowrap;
  }
`
