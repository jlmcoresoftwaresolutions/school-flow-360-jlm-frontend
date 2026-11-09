import type { ChangeEvent } from "react"
import { useState } from "react"
import { Controller, useForm, useWatch } from "react-hook-form"
import { useTranslation } from "react-i18next"

import { useUnsavedChanges } from "@/components"
import { Button, Text } from "@/ds-components/atoms"
import { ColorPicker, FileUpload, Input } from "@/ds-components/molecules"
import type { OrganizationBranding, OrganizationBrandingUpdate } from "@/models"
import { formatFileSize } from "@/utils/formats"

import { displayNameMaxLength, faviconRules, logoRules } from "../MinhaUnidade.constants"
import { BrandingLayout, FieldGroup, FilePreview, FileThumb, FormActions, InlineGroup } from "../MinhaUnidade.styles"
import { SectionCard } from "../shared/SectionCard"
import { TabCard } from "../shared/TabCard"
import type { FileProblem, FileRules } from "./brandingFiles"
import { getFileProblem, readAsDataUrl } from "./brandingFiles"
import { BrandingPreview } from "./BrandingPreview"

type BrandingValues = Pick<OrganizationBranding, "displayName" | "primaryColor" | "secondaryColor">

// A file picked but not saved yet, with its data URL for the preview.
type ChosenFile = {
  file: File
  url: string
}

type FileField = "favicon" | "logo"

export type BrandingTabProps = {
  branding: OrganizationBranding
  onSave: (update: OrganizationBrandingUpdate) => Promise<boolean>
}

const toValues = (branding: OrganizationBranding): BrandingValues => ({
  displayName: branding.displayName,
  primaryColor: branding.primaryColor,
  secondaryColor: branding.secondaryColor,
})

// The organization's visual identity (there is none per unit in the MVP): the form beside a live
// preview of what it would look like. Unlike the overview's sections it is always editable, since the
// preview is the point; "Salvar alterações" publishes it, "Descartar" goes back to the current one, and
// nothing changes for anyone before saving. An invalid file is refused on the spot and never saved.
// There is no "remove logo" (DP-P1-07 is open): a new file replaces the current one.
export const BrandingTab = (props: BrandingTabProps) => {
  const { branding, onSave } = props

  const { t, i18n } = useTranslation()
  const form = useForm<BrandingValues>({ defaultValues: toValues(branding) })
  const draft = useWatch({ control: form.control })

  const [chosenFiles, setChosenFiles] = useState<Partial<Record<FileField, ChosenFile>>>({})
  const [fileProblems, setFileProblems] = useState<Partial<Record<FileField, FileProblem>>>({})
  // Bumped to remount the file inputs, clearing the names they show, after saving or discarding.
  const [fileInputsKey, setFileInputsKey] = useState(0)

  const { errors, isDirty, isSubmitting } = form.formState
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
    if (problem === "wrongType") return t("minhaUnidade.branding.fileWrongType")
    if (problem === "tooLarge") {
      return t("minhaUnidade.branding.fileTooLarge", { max: formatFileSize(rules.maxBytes, i18n.language) })
    }

    return undefined
  }

  const renderFilePreview = (field: FileField, currentUrl: string | undefined) => {
    const chosen = chosenFiles[field]
    const url = chosen?.url ?? currentUrl

    if (!url) {
      return (
        <Text color="secondary" fontSize="xs">
          {t("minhaUnidade.branding.noFile")}
        </Text>
      )
    }

    return (
      <FilePreview>
        <FileThumb alt="" src={url} />
        <Text color="secondary" fontSize="xs">
          {chosen
            ? t("minhaUnidade.branding.newFile", {
                name: chosen.file.name,
                size: formatFileSize(chosen.file.size, i18n.language),
              })
            : t("minhaUnidade.branding.currentFile")}
        </Text>
      </FilePreview>
    )
  }

  return (
    <TabCard>
      <BrandingLayout>
        <SectionCard description={t("minhaUnidade.branding.description")} title={t("minhaUnidade.branding.title")}>
          <form aria-label={t("minhaUnidade.branding.title")} onSubmit={handleSubmit} noValidate>
            <FieldGroup>
              <Input
                error={errors.displayName?.message}
                helperText={t("minhaUnidade.branding.displayNameHelper")}
                maxLength={displayNameMaxLength}
                title={t("minhaUnidade.branding.displayName")}
                required
                {...form.register("displayName", {
                  validate: (value) => value.trim() !== "" || t("minhaUnidade.validation.required"),
                })}
              />

              <FieldGroup key={`logo-${fileInputsKey}`}>
                <FileUpload
                  accept={logoRules.extensions.join(",")}
                  error={fileProblemMessage(fileProblems.logo, logoRules)}
                  helperText={t("minhaUnidade.branding.logoHelper")}
                  onChange={(event) => void handleFileChange("logo", logoRules)(event)}
                  placeholder={t("minhaUnidade.branding.filePlaceholder")}
                  title={t("minhaUnidade.branding.logo")}
                />
                {renderFilePreview("logo", branding.logoUrl)}
              </FieldGroup>

              <FieldGroup key={`favicon-${fileInputsKey}`}>
                <FileUpload
                  accept={faviconRules.extensions.join(",")}
                  error={fileProblemMessage(fileProblems.favicon, faviconRules)}
                  helperText={t("minhaUnidade.branding.faviconHelper")}
                  onChange={(event) => void handleFileChange("favicon", faviconRules)(event)}
                  placeholder={t("minhaUnidade.branding.filePlaceholder")}
                  title={t("minhaUnidade.branding.favicon")}
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
                      openLabel={t("minhaUnidade.branding.openColorPicker")}
                      title={t("minhaUnidade.branding.primaryColor")}
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
                      openLabel={t("minhaUnidade.branding.openColorPicker")}
                      title={t("minhaUnidade.branding.secondaryColor")}
                      value={controller.field.value}
                    />
                  )}
                />
              </InlineGroup>
            </FieldGroup>

            <FormActions>
              <Button disabled={!hasChanges || isSubmitting} onClick={handleDiscard} type="button" variant="outlined">
                {t("minhaUnidade.branding.discard")}
              </Button>
              <Button disabled={!hasChanges || isSubmitting} type="submit">
                {t("minhaUnidade.branding.save")}
              </Button>
            </FormActions>
          </form>
        </SectionCard>

        <SectionCard
          description={t("minhaUnidade.branding.previewDescription")}
          title={t("minhaUnidade.branding.previewTitle")}
        >
          <BrandingPreview
            displayName={draft.displayName ?? ""}
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
