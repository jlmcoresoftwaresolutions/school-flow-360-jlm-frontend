import { useTranslation } from "react-i18next"

import { Button } from "@/ds-components/atoms"
import { StateMessage } from "@/ds-components/molecules"

import type { PeopleListError as PeopleListErrorKind } from "./usePeopleList"

export type PeopleListErrorProps = {
  error: PeopleListErrorKind
  errorDescription: string
  errorTitle: string
  forbiddenDescription: string
  forbiddenTitle: string
  onRetry: () => void
}

// Why a people list couldn't be read, each case its own way: a refusal says who has access, too many
// searches asks to wait (the backend allows 30 a minute per person), and a failure offers to try again.
export const PeopleListError = (props: PeopleListErrorProps) => {
  const { error, errorDescription, errorTitle, forbiddenDescription, forbiddenTitle, onRetry } = props

  const { t } = useTranslation()

  if (error === "forbidden") {
    return <StateMessage description={forbiddenDescription} icon="lock-outline" title={forbiddenTitle} />
  }

  const retry = <Button onClick={onRetry}>{t("common.tryAgain")}</Button>

  if (error === "rateLimited") {
    return (
      <StateMessage
        action={retry}
        description={t("people.rateLimitedDescription")}
        icon="history"
        title={t("people.rateLimitedTitle")}
      />
    )
  }

  return <StateMessage action={retry} description={errorDescription} title={errorTitle} variant="error" />
}
