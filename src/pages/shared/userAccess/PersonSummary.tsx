import { useTranslation } from "react-i18next"

import { Text } from "@/ds-components/atoms"
import { spacing } from "@/foundation"

import { PersonCell } from "./userAccess.styles"

export type PersonSummaryProps = {
  email: string
  fullName: string | null
}

// A person in a table row: the name (or that none was given) over the e-mail, which is cut with an
// ellipsis when long, the whole of it in a tooltip, so a long address doesn't break mid-word.
export const PersonSummary = (props: PersonSummaryProps) => {
  const { email, fullName } = props

  const { t } = useTranslation()

  return (
    <PersonCell>
      <Text fontSize="sm" semibold>
        {fullName || t("userAccess.noName")}
      </Text>
      <Text
        color="secondary"
        fontSize="sm"
        tooltip={email}
        style={{
          display: "block",
          maxWidth: spacing[224],
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}
      >
        {email}
      </Text>
    </PersonCell>
  )
}
