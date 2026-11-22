import { useTranslation } from "react-i18next"

import type { BadgeProps } from "@/ds-components/atoms"
import type { PersonStatus } from "@/models"

type BadgeTone = NonNullable<BadgeProps["tone"]>

const personStatusTones: Record<PersonStatus, BadgeTone> = { ACTIVE: "success", DRAFT: "warning", INACTIVE: "neutral" }

// The words and tones the people screens (students and guardians) share.
export const usePeopleLabels = () => {
  const { t } = useTranslation()

  return {
    personStatusLabel: (status: PersonStatus) => t(`people.statuses.${status}`),
    personStatusTone: (status: PersonStatus) => personStatusTones[status],
  }
}
