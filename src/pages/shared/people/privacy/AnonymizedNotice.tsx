import { useTranslation } from "react-i18next"

import { Icon, Text } from "@/ds-components/atoms"

import { AnonymizedNoticeBox } from "../people.styles"

// Says, on a profile, that the person was anonymized (LGPD): what is left is kept only for the links
// and the history, and the profile offers nothing that would change it.
export const AnonymizedNotice = () => {
  const { t } = useTranslation()

  return (
    <AnonymizedNoticeBox>
      <Icon color="secondary" name="shield-outline" size={20} />
      <div>
        <Text as="p" fontSize="sm" semibold>
          {t("people.anonymizedNoticeTitle")}
        </Text>
        <Text as="p" color="secondary" fontSize="sm">
          {t("people.anonymizedNoticeDescription")}
        </Text>
      </div>
    </AnonymizedNoticeBox>
  )
}
