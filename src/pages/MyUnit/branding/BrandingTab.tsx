import type { ChangeEvent } from "react"
import { useState } from "react"
import { Controller, useForm, useWatch } from "react-hook-form"
import { useTranslation } from "react-i18next"

import { useUnsavedChanges } from "@/components"
import { Button, Text } from "@/ds-components/atoms"
import { ColorPicker, FileUpload } from "@/ds-components/molecules"
import type { OrganizationBranding, OrganizationBrandingUpdate } from "@/models"
import { formatFileSize } from "@/utils/formats"

import { faviconRules, logoRules } from "../MyUnit.constants"
import { BrandingLayout, FieldGroup, FilePreview, FileThumb, FormActions, InlineGroup } from "../MyUnit.styles"
import { SectionCard } from "../shared/SectionCard"
import { TabCard } from "../shared/TabCard"
import type { FileProblem, FileRules } from "./brandingFiles"
import { getFileProblem, readAsDataUrl } from "./brandingFiles"
import { BrandingPreview } from "./BrandingPreview"

type BrandingValues = Pick<OrganizationBranding, "primaryColor" | "secondaryColor">

// A file picked but not saved yet, with its data URL for the preview.
type ChosenFile = {
  file: File
  url: string
}

type FileField = "favicon" | "logo"

export type BrandingTabProps = {
  branding: OrganizationBranding
  // The organization's display name, shown in the preview (it is edited in the overview).
  displayName: string
  onSave: (update: OrganizationBrandingUpdate) => Promise<boolean>
}

const toValues = (branding: OrganizationBranding): BrandingValues => ({
  primaryColor: branding.primaryColor,
  secondaryColor: branding.secondaryColor,
})

// The organization's visual identity (there is none per unit in the MVP): the form beside a live
// preview of what it would look like, with the organization's display name (edited in the overview). Unlike the overview's sections it is always editable, since the
// preview is the point; "Salvar alterações" publishes it, "Descartar" goes back to the current one, and
// nothing changes for anyone before saving. An invalid file is refused on the spot and never saved.
// There is no "remove logo" (DP-P1-07 is open): a new file replaces the current one.
export const BrandingTab = (props: BrandingTabProps) => {
  const { branding, displayName, onSave } = props

  const { t, i18n } = useTranslation()
  const form = useForm<BrandingValues>({ defaultValues: toValues(branding) })
  const draft = useWatch({ control: form.control })

  const [chosenFiles, setChosenFiles] = useState<Partial<Record<FileField, ChosenFile>>>({})
  const [fileProblems, setFileProblems] = useState<Partial<Record<FileField, FileProblem>>>({})
  // Bumped to remount the file inputs, clearing the names they show, after saving or discarding.
  const [fileInputsKey, setFileInputsKey] = useState(0)

  const { isDirty, isSubmitting } = form.formState
  const hasChanges = isDirty || chosenFiles.logo !== undefined || chosenFiles.favicon !== undefined

  useUnsavedChanges(hasChanges)

  const clearFiles = () => {
    setChosenFiles({})
    setFileProblems({})
    setFileInputsKey((current) => current + 1)
  }

  const handleFileChange = (field: FileField, rules: FileRules) => async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]

    if (!file) {
      setChosenFiles((current) => ({ ...current, [field]: undefined }))
      setFileProblems((current) => ({ ...current, [field]: undefined }))
      return
    }

    const problem = getFileProblem(file, rules)
    setFileProblems((current) => ({ ...current, [field]: problem ?? undefined }))

    if (problem) {
      setChosenFiles((current) => ({ ...current, [field]: undefined }))
      return
    }

    const url = await readAsDataUrl(file)
    setChosenFiles((current) => ({ ...current, [field]: { file, url } }))
  }

  const handleDiscard = () => {
    form.reset(toValues(branding))
    clearFiles()
  }

  const handleSubmit = form.handleSubmit(async (values) => {
    const saved = await onSave({ ...values, favicon: chosenFiles.favicon?.file, logo: chosenFiles.logo?.file })

    if (!saved) return

    form.reset(values)
    clearFiles()
  })

  const fileProblemMessage = (problem: FileProblem | undefined, rules: FileRules) => {
    if (problem === "wrongType") return t("myUnit.branding.fileWrongType")
    if (problem === "tooLarge") {
      return t("myUnit.branding.fileTooLarge", { max: formatFileSize(rules.maxBytes, i18n.language) })
    }

    return undefined
  }

  const renderFilePreview = (field: FileField, currentUrl: string | undefined) => {
    const chosen = chosenFiles[field]
    const url = chosen?.url ?? currentUrl

    if (!url) {
      return (
        <Text color="secondary" fontSize="xs">
          {t("myUnit.branding.noFile")}
        </Text>
      )
    }

    return (
      <FilePreview>
        <FileThumb alt="" src={url} />
        <Text color="secondary" fontSize="xs">
          {chosen
            ? t("myUnit.branding.newFile", {
                name: chosen.file.name,
                size: formatFileSize(chosen.file.size, i18n.language),
              })
            : t("myUnit.branding.currentFile")}
        </Text>
      </FilePreview>
    )
  }

  return (
    <TabCard>
      <BrandingLayout>
        <SectionCard description={t("myUnit.branding.description")} title={t("myUnit.branding.title")}>
          <form aria-label={t("myUnit.branding.title")} onSubmit={handleSubmit} noValidate>
            <FieldGroup>
              <FieldGroup key={`logo-${fileInputsKey}`}>
                <FileUpload
                  accept={logoRules.extensions.join(",")}
                  error={fileProblemMessage(fileProblems.logo, logoRules)}
                  helperText={t("myUnit.branding.logoHelper")}
                  onChange={(event) => void handleFileChange("logo", logoRules)(event)}
                  placeholder={t("myUnit.branding.filePlaceholder")}
                  title={t("myUnit.branding.logo")}
                />
                {renderFilePreview("logo", branding.logoUrl)}
              </FieldGroup>

              <FieldGroup key={`favicon-${fileInputsKey}`}>
                <FileUpload
                  accept={faviconRules.extensions.join(",")}
                  error={fileProblemMessage(fileProblems.favicon, faviconRules)}
                  helperText={t("myUnit.branding.faviconHelper")}
                  onChange={(event) => void handleFileChange("favicon", faviconRules)(event)}
                  placeholder={t("myUnit.branding.filePlaceholder")}
                  title={t("myUnit.branding.favicon")}
                />
                {renderFilePreview("favicon", branding.faviconUrl)}
              </FieldGroup>

              <InlineGroup>
                <Controller
                  control={form.control}
                  name="primaryColor"
                  render={(controller) => (
                    <ColorPicker
                      onChange={controller.field.onChange}
                      openLabel={t("myUnit.branding.openColorPicker")}
                      title={t("myUnit.branding.primaryColor")}
                      value={controller.field.value}
                    />
                  )}
                />
                <Controller
                  control={form.control}
                  name="secondaryColor"
                  render={(controller) => (
                    <ColorPicker
                      onChange={controller.field.onChange}
                      openLabel={t("myUnit.branding.openColorPicker")}
                      title={t("myUnit.branding.secondaryColor")}
                      value={controller.field.value}
                    />
                  )}
                />
              </InlineGroup>
            </FieldGroup>

            <FormActions>
              <Button
                disabled={!hasChanges || isSubmitting}
                onClick={handleDiscard}
                size="small"
                type="button"
                variant="outlined"
              >
                {t("myUnit.branding.discard")}
              </Button>
              <Button disabled={!hasChanges || isSubmitting} size="small" type="submit">
                {t("myUnit.branding.save")}
              </Button>
            </FormActions>
          </form>
        </SectionCard>

        <SectionCard description={t("myUnit.branding.previewDescription")} title={t("myUnit.branding.previewTitle")}>
          <BrandingPreview
            displayName={displayName}
            faviconUrl={chosenFiles.favicon?.url ?? branding.faviconUrl}
            logoUrl={chosenFiles.logo?.url ?? branding.logoUrl}
            primaryColor={draft.primaryColor ?? branding.primaryColor}
            secondaryColor={draft.secondaryColor ?? branding.secondaryColor}
          />
        </SectionCard>
      </BrandingLayout>
    </TabCard>
  )
}
