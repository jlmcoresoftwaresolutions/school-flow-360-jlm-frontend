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
import type { FileProblem, FileRules, ImageSize } from "./brandingFiles"
import {
  fitWithin,
  getFileSizeProblem,
  getFileTypeProblem,
  getImageProblem,
  readAsDataUrl,
  readImageSize,
  shrinkImage,
} from "./brandingFiles"
import { BrandingPreview } from "./BrandingPreview"

type BrandingValues = Pick<OrganizationBranding, "primaryColor" | "secondaryColor">

// An image picked but not saved yet, with its data URL for the preview. `shrunkFrom` is the original
// size when it had to be shrunk to the backend's maximum.
type ChosenFile = {
  file: File
  url: string
  shrunkFrom?: ImageSize
  size?: ImageSize
}

type ImageField = "favicon" | "logo"

const rulesByField: Record<ImageField, FileRules> = {
  favicon: faviconRules,
  logo: logoRules,
}

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

// The organization's visual identity (there is none per unit in the MVP): the logo, the favicon and
// the colors beside a live preview, with the organization's display name (edited in the overview).
// It is always editable, since the preview is the point. "Salvar e publicar" saves and publishes it at
// once (the backend's draft is only the preview's role here); "Descartar" goes back to the current
// one, and nothing changes for anyone before publishing. A saved draft that was never published (left
// by an earlier attempt that failed midway, say) is pointed out and can be published as it is. An
// image larger than the backend's maximum is shrunk to fit (keeping its proportion, and saying so);
// one the backend would refuse anyway (type, too small, out of proportion - the favicon must be
// square - or too heavy) is refused on the spot. There is no "remove" (DP-P1-07 is open): a new file
// replaces the current one.
export const BrandingTab = (props: BrandingTabProps) => {
  const { branding, displayName, onSave } = props

  const { t, i18n } = useTranslation()
  const form = useForm<BrandingValues>({ defaultValues: toValues(branding) })
  const draft = useWatch({ control: form.control })

  const [chosenFiles, setChosenFiles] = useState<Partial<Record<ImageField, ChosenFile>>>({})
  const [fileProblems, setFileProblems] = useState<Partial<Record<ImageField, FileProblem>>>({})
  // Bumped to remount the file inputs, clearing the names they show, after saving or discarding.
  const [fileInputsKey, setFileInputsKey] = useState(0)

  const { isDirty, isSubmitting } = form.formState
  const hasChanges = isDirty || chosenFiles.logo !== undefined || chosenFiles.favicon !== undefined
  const canSave = hasChanges || branding.hasUnpublishedChanges
  const currentUrls: Record<ImageField, string | undefined> = {
    favicon: branding.faviconUrl,
    logo: branding.logoUrl,
  }

  useUnsavedChanges(hasChanges)

  const clearFiles = () => {
    setChosenFiles({})
    setFileProblems({})
    setFileInputsKey((current) => current + 1)
  }

  const setChosen = (field: ImageField, chosen: ChosenFile | undefined) =>
    setChosenFiles((current) => ({ ...current, [field]: chosen }))

  const setProblem = (field: ImageField, problem: FileProblem | undefined) =>
    setFileProblems((current) => ({ ...current, [field]: problem }))

  const shrunkImage = async (file: File, url: string, size: ImageSize, fitted: ImageSize): Promise<ChosenFile> => {
    const shrunk = await shrinkImage(file, url, fitted)

    return { file: shrunk, shrunkFrom: size, size: fitted, url: await readAsDataUrl(shrunk) }
  }

  // Checks a picked image as the backend would, shrinking it first when it is only too large.
  const checkImage = async (file: File, rules: FileRules): Promise<ChosenFile | FileProblem> => {
    const typeProblem = getFileTypeProblem(file, rules)
    if (typeProblem) return typeProblem

    const url = await readAsDataUrl(file)
    const size = await readImageSize(url)
    const imageProblem = getImageProblem(size, rules)
    if (imageProblem) return imageProblem

    const fitted = fitWithin(size, rules.maxSide)
    const mustShrink = fitted.width !== size.width || fitted.height !== size.height
    const chosen: ChosenFile = mustShrink ? await shrunkImage(file, url, size, fitted) : { file, size, url }

    return getFileSizeProblem(chosen.file, rules) ?? chosen
  }

  const handleFileChange = (field: ImageField) => async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]

    setChosen(field, undefined)
    setProblem(field, undefined)
    if (!file) return

    try {
      const result = await checkImage(file, rulesByField[field])

      if (typeof result === "string") setProblem(field, result)
      else setChosen(field, result)
    } catch {
      setProblem(field, "unreadable")
    }
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

  const problemMessage = (field: ImageField): string | undefined => {
    const rules = rulesByField[field]

    switch (fileProblems[field]) {
      case "badRatio":
        return t("myUnit.branding.fileRatio", { ratio: rules.maxAspectRatio })
      case "notSquare":
        return t("myUnit.branding.fileNotSquare")
      case "tooLarge":
        return t("myUnit.branding.fileTooLarge", { max: formatFileSize(rules.maxBytes, i18n.language) })
      case "tooSmall":
        return t("myUnit.branding.fileTooSmall", { min: rules.minSide })
      case "unreadable":
        return t("myUnit.branding.fileUnreadable")
      case "wrongType":
        return t("myUnit.branding.fileWrongType")
      default:
        return undefined
    }
  }

  const renderFilePreview = (field: ImageField) => {
    const chosen = chosenFiles[field]
    const url = chosen?.url ?? currentUrls[field]

    if (!url) {
      return (
        <Text color="secondary" fontSize="xs">
          {t("myUnit.branding.noFile")}
        </Text>
      )
    }

    return (
      <>
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
        {chosen?.shrunkFrom && chosen.size && (
          <Text color="warning" fontSize="xs" role="status">
            {t("myUnit.branding.fileShrunk", {
              fromHeight: chosen.shrunkFrom.height,
              fromWidth: chosen.shrunkFrom.width,
              max: rulesByField[field].maxSide,
              toHeight: chosen.size.height,
              toWidth: chosen.size.width,
            })}
          </Text>
        )}
      </>
    )
  }

  const renderImageField = (field: ImageField) => (
    <FieldGroup key={`${field}-${fileInputsKey}`}>
      <FileUpload
        accept={rulesByField[field].extensions.join(",")}
        error={problemMessage(field)}
        helperText={t(`myUnit.branding.${field}Helper`)}
        onChange={(event) => void handleFileChange(field)(event)}
        placeholder={t("myUnit.branding.filePlaceholder")}
        title={t(`myUnit.branding.${field}`)}
      />
      {renderFilePreview(field)}
    </FieldGroup>
  )

  return (
    <TabCard>
      <BrandingLayout>
        <SectionCard description={t("myUnit.branding.description")} title={t("myUnit.branding.title")}>
          <form aria-label={t("myUnit.branding.title")} onSubmit={handleSubmit} noValidate>
            <FieldGroup>
              {renderImageField("logo")}
              {renderImageField("favicon")}

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

              {branding.hasUnpublishedChanges && !hasChanges && (
                <Text color="secondary" fontSize="xs">
                  {t("myUnit.branding.unpublished")}
                </Text>
              )}
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
              <Button disabled={!canSave || isSubmitting} size="small" type="submit">
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
