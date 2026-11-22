import { useTranslation } from "react-i18next"

import { Text } from "@/ds-components/atoms"
import { spacing } from "@/foundation"

import { PersonCell } from "./userAccess.styles"

export type PersonSummaryProps = {
  email: string | null
  fullName: string | null
  // Shown in place of the e-mail for a person who signs in only with the nickname.
  nickname?: string
}

// A person in a table row: the name (or that none was given) over the e-mail (or, without one, the
// nickname), cut with an ellipsis when long, the whole of it in a tooltip, so a long address doesn't
// break mid-word.
export const PersonSummary = (props: PersonSummaryProps) => {
  const { email, fullName, nickname } = props

  const { t } = useTranslation()

  const contact = email || nickname || ""

  return (
    <PersonCell>
      <Text fontSize="sm" semibold>
        {fullName || t("userAccess.noName")}
      </Text>
      <Text
        color="secondary"
        fontSize="sm"
        tooltip={contact}
        style={{
          display: "block",
          maxWidth: spacing[224],
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}
      >
        {contact}
      </Text>
    </PersonCell>
  )
}
