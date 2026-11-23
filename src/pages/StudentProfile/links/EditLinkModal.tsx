import { useId, useState } from "react"
import { useTranslation } from "react-i18next"

import { toast, useUnsavedChanges } from "@/components"
import { Button, Text } from "@/ds-components/atoms"
import { Modal } from "@/ds-components/organisms"
import type { CatalogItem, StudentGuardianLink } from "@/models"
import { getStudentGuardianLink, updateStudentGuardianLink } from "@/services/studentGuardianLinks"
import { toIsoDate } from "@/utils/dates"
import { isShallowEqual } from "@/utils/objects"

import { LinkResponsibilities } from "../../shared/people/LinkCells"
import { FormFields } from "../../shared/userAccess/userAccess.styles"
import { LinkFields } from "./LinkFields"
import { type LinkFormValues, toLinkFormValues } from "./linkForm"
import { useLinkErrors } from "./useLinkErrors"

export type EditLinkModalProps = {
  guardianName: string
  link: StudentGuardianLink
  relationshipTypes: CatalogItem[]
  onClose: () => void
  // The link was saved, or it has to be read again (ended or out of reach meanwhile).
  onChanged: () => void
}

const sameDay = (a: Date | null, b: Date | null) => (a ? toIsoDate(a) : "") === (b ? toIsoDate(b) : "")

// Changes an active link: the relationship, the three responsibilities and the start date, saved with
// the link's version. If someone else changed it meanwhile, it is read again and shown, and the form
// keeps what was typed, so saving again goes over it knowingly. An ended link can't be changed: a new one
// is created instead.
export const EditLinkModal = (props: EditLinkModalProps) => {
  const { guardianName, link, onChanged, onClose, relationshipTypes } = props

  const { t } = useTranslation()
  const toFailure = useLinkErrors()

  const formId = useId()

  const [original] = useState(() => toLinkFormValues(link))
  const [values, setValues] = useState<LinkFormValues>(original)
  const [version, setVersion] = useState(link.version)
  const [newer, setNewer] = useState<StudentGuardianLink | null>(null)
  const [relationshipError, setRelationshipError] = useState("")
  const [failure, setFailure] = useState("")
  const [isSaving, setIsSaving] = useState(false)

  const isChanged =
    !isShallowEqual({ ...values, startDate: null }, { ...original, startDate: null }) ||
    !sameDay(values.startDate, original.startDate)

  useUnsavedChanges(isChanged && !isSaving)

  const readAgain = async () => {
    try {
      const current = await getStudentGuardianLink(link.id, { showLoading: false })
      if (current.status === "ENDED") {
        toast.error(t("guardianLinks.errors.linkEnded"))
        onChanged()
        return
      }
      setVersion(current.version)
      setNewer(current)
    } catch {
      // Reading it again failed too: the message already says what happened.
    }
  }

  const save = async () => {
    setFailure("")
    if (!values.relationshipCode) {
      setRelationshipError(t("guardianLinks.form.relationshipRequired"))
      return
    }

    setIsSaving(true)
    try {
      await updateStudentGuardianLink(link.id, {
        contactAuthorized: values.contactAuthorized,
        financialResponsible: values.financialResponsible,
        pedagogicalResponsible: values.pedagogicalResponsible,
        relationshipCode: values.relationshipCode,
        startDate: values.startDate ? toIsoDate(values.startDate) : undefined,
        version,
      })
      toast.success(t("guardianLinks.edit.done", { name: guardianName }))
      onChanged()
    } catch (error) {
      const result = toFailure(error)
      setIsSaving(false)
      if (result.kind === "field") {
        setRelationshipError(result.message)
      } else if (result.kind === "conflict") {
        setFailure(result.message)
        await readAgain()
      } else if (result.kind === "form") {
        setFailure(result.message)
      } else {
        toast.error(result.message)
        onChanged()
      }
    }
  }

  return (
    <Modal
      closeLabel={t("common.close")}
      closeOnBackdropClick={false}
      footer={
        <>
          <Button disabled={isSaving} onClick={onClose} variant="outlined">
            {t("common.cancel")}
          </Button>
          <Button disabled={!isChanged || isSaving} form={formId} type="submit">
            {t("common.save")}
          </Button>
        </>
      }
      onClose={onClose}
      size="md"
      title={t("guardianLinks.edit.title", { name: guardianName })}
      open
    >
      <form
        id={formId}
        onSubmit={(event) => {
          event.preventDefault()
          void save()
        }}
        noValidate
      >
        <FormFields>
          <Text color="secondary" fontSize="sm">
            {t("guardianLinks.edit.description")}
          </Text>

          {failure && (
            <Text color="danger" fontSize="sm" role="alert">
              {failure}
            </Text>
          )}

          {newer && (
            <FormFields aria-label={t("guardianLinks.edit.newerTitle")} role="note">
              <Text fontSize="sm" semibold>
                {t("guardianLinks.edit.newerTitle")}
              </Text>
              <Text fontSize="sm">
                {t("guardianLinks.edit.newerRelationship", { relationship: newer.relationshipLabel })}
              </Text>
              <LinkResponsibilities link={newer} />
            </FormFields>
          )}

          <LinkFields
            onChange={(next) => {
              setValues(next)
              if (next.relationshipCode) setRelationshipError("")
            }}
            relationshipError={relationshipError}
            relationshipTypes={relationshipTypes}
            value={values}
            withStartDate
          />
        </FormFields>
      </form>
    </Modal>
  )
}
