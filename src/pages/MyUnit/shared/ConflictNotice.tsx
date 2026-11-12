import type { ReactNode } from "react"
import { useState } from "react"
import { useTranslation } from "react-i18next"

import type { ButtonProps } from "@/ds-components/atoms"
import { Button, Text } from "@/ds-components/atoms"

import { ConflictActions, ConflictCurrent, ConflictNoticeBox } from "../MyUnit.styles"

export type ConflictNoticeProps = {
  // The record as it is now, shown on demand for the user to compare with what they typed.
  current: ReactNode
  onDiscard: () => void
  // The buttons' size: "small" inside a section's sub-card, the default in a modal.
  buttonSize?: ButtonProps["size"]
}

// Shown in a form whose save found the record changed by someone else in the meantime. What the user
// typed stays in the form; this tells them so, lets them look at the current version and decide: save
// their changes over it (the form's own Save, now with the current version) or discard theirs. Nothing
// is saved again on its own.
export const ConflictNotice = (props: ConflictNoticeProps) => {
  const { buttonSize = "medium", current, onDiscard } = props

  const { t } = useTranslation()

  const [isShowingCurrent, setIsShowingCurrent] = useState(false)

  return (
    <ConflictNoticeBox role="alert">
      <Text fontSize="sm" semibold>
        {t("myUnit.conflict.title")}
      </Text>
      <Text color="secondary" fontSize="sm">
        {t("myUnit.conflict.message")}
      </Text>

      <ConflictActions>
        <Button
          onClick={() => setIsShowingCurrent((shown) => !shown)}
          size={buttonSize}
          type="button"
          variant="outlined"
        >
          {isShowingCurrent ? t("myUnit.conflict.hideCurrent") : t("myUnit.conflict.showCurrent")}
        </Button>
        <Button onClick={onDiscard} size={buttonSize} type="button" variant="outlined">
          {t("myUnit.conflict.discard")}
        </Button>
      </ConflictActions>

      {isShowingCurrent && <ConflictCurrent aria-label={t("myUnit.conflict.currentLabel")}>{current}</ConflictCurrent>}
    </ConflictNoticeBox>
  )
}
