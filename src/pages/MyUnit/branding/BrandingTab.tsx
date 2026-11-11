import type { ChangeEvent } from "react"
import { useState } from "react"
import { Controller, useForm, useWatch } from "react-hook-form"
import { useTranslation } from "react-i18next"

import { useUnsavedChanges } from "@/components"
import { Button, Text } from "@/ds-components/atoms"
import { ColorPicker, FileUpload } from "@/ds-components/molecules"
import type { OrganizationBranding, OrganizationBrandingUpdate } from "@/models"
import { formatFileSize } from "@/utils/formats"

import { logoRules } from "../MyUnit.constants"
import { BrandingLayout, FieldGroup, FilePreview, FileThumb, FormActions, InlineGroup } from "../MyUnit.styles"
import { SectionCard } from "../shared/SectionCard"
import { TabCard } from "../shared/TabCard"
import type { FileProblem, ImageSize } from "./brandingFiles"
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

// A logo picked but not saved yet, with its data URL for the preview. `shrunkFrom` is the original
// size when it had to be shrunk to the backend's maximum.
type ChosenFile = {
  file: File
  url: string
  shrunkFrom?: ImageSize
  size?: ImageSize
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

// The organization's visual identity (there is none per unit in the MVP): the logo and colors beside
// a live preview, with the organization's display name (edited in the overview). It is always
// editable, since the preview is the point. "Salvar e publicar" saves and publishes it at once (the
// backend's draft is only the preview's role here); "Descartar" goes back to the current one, and
// nothing changes for anyone before publishing. A saved draft that was never published (left by an
// earlier attempt that failed midway, say) is pointed out and can be published as it is. A logo larger
// than the backend's maximum is shrunk to fit (keeping its proportion, and saying so); one the backend
// would refuse anyway (type, too small, too wide or tall, too heavy) is refused on the spot. There is no favicon on
// the backend, and no "remove logo" (DP-P1-07 is open): a new file replaces the current one.
export const BrandingTab = (props: BrandingTabProps) => {
  const { branding, displayName, onSave } = props

  const { t, i18n } = useTranslation()
  const form = useForm<BrandingValues>({ defaultValues: toValues(branding) })
  const draft = useWatch({ control: form.control })

  const [chosenLogo, setChosenLogo] = useState<ChosenFile>()
  const [logoProblem, setLogoProblem] = useState<FileProblem>()
  // Bumped to remount the file input, clearing the name it shows, after saving or discarding.
  const [fileInputKey, setFileInputKey] = useState(0)

  const { isDirty, isSubmitting } = form.formState
  const hasChanges = isDirty || chosenLogo !== undefined
  const canSave = hasChanges || branding.hasUnpublishedChanges

  useUnsavedChanges(hasChanges)

  const clearLogo = () => {
    setChosenLogo(undefined)
    setLogoProblem(undefined)
    setFileInputKey((current) => current + 1)
  }

  const handleLogoChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]

    setChosenLogo(undefined)
    setLogoProblem(undefined)
    if (!file) return

    const typeProblem = getFileTypeProblem(file, logoRules)
    if (typeProblem) {
      setLogoProblem(typeProblem)
      return
    }

    try {
      const url = await readAsDataUrl(file)
      const size = await readImageSize(url)
      const imageProblem = getImageProblem(size, logoRules)

      if (imageProblem) {
        setLogoProblem(imageProblem)
        return
      }

      const fitted = fitWithin(size, logoRules.maxSide)
      const mustShrink = fitted.width !== size.width || fitted.height !== size.height
      const chosen: ChosenFile = mustShrink ? await shrunkLogo(file, url, size, fitted) : { file, size, url }

      const sizeProblem = getFileSizeProblem(chosen.file, logoRules)
      if (sizeProblem) {
        setLogoProblem(sizeProblem)
        return
      }

      setChosenLogo(chosen)
    } catch {
      setLogoProblem("unreadable")
    }
  }

  const shrunkLogo = async (file: File, url: string, size: ImageSize, fitted: ImageSize): Promise<ChosenFile> => {
    const shrunk = await shrinkImage(file, url, fitted)

    return { file: shrunk, shrunkFrom: size, size: fitted, url: await readAsDataUrl(shrunk) }
  }

  const handleDiscard = () => {
    form.reset(toValues(branding))
    clearLogo()
  }

  const handleSubmit = form.handleSubmit(async (values) => {
    const saved = await onSave({ ...values, logo: chosenLogo?.file })

    if (!saved) return

    form.reset(values)
    clearLogo()
  })

  const logoProblemMessage = (): string | undefined => {
    switch (logoProblem) {
      case "tooSmall":
        return t("myUnit.branding.fileTooSmall", { min: logoRules.minSide })
      case "badRatio":
        return t("myUnit.branding.fileRatio", { ratio: logoRules.maxAspectRatio })
      case "tooLarge":
        return t("myUnit.branding.fileTooLarge", { max: formatFileSize(logoRules.maxBytes, i18n.language) })
      case "unreadable":
        return t("myUnit.branding.fileUnreadable")
      case "wrongType":
        return t("myUnit.branding.fileWrongType")
      default:
        return undefined
    }
  }

  const renderLogoPreview = () => {
    const url = chosenLogo?.url ?? branding.logoUrl

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
            {chosenLogo
              ? t("myUnit.branding.newFile", {
                  name: chosenLogo.file.name,
                  size: formatFileSize(chosenLogo.file.size, i18n.language),
                })
              : t("myUnit.branding.currentFile")}
          </Text>
        </FilePreview>
        {chosenLogo?.shrunkFrom && chosenLogo.size && (
          <Text color="warning" fontSize="xs" role="status">
            {t("myUnit.branding.fileShrunk", {
              fromHeight: chosenLogo.shrunkFrom.height,
              fromWidth: chosenLogo.shrunkFrom.width,
              max: logoRules.maxSide,
              toHeight: chosenLogo.size.height,
              toWidth: chosenLogo.size.width,
            })}
          </Text>
        )}
      </>
    )
  }

  return (
    <TabCard>
      <BrandingLayout>
        <SectionCard description={t("myUnit.branding.description")} title={t("myUnit.branding.title")}>
          <form aria-label={t("myUnit.branding.title")} onSubmit={handleSubmit} noValidate>
            <FieldGroup>
              <FieldGroup key={`logo-${fileInputKey}`}>
                <FileUpload
                  accept={logoRules.extensions.join(",")}
                  error={logoProblemMessage()}
                  helperText={t("myUnit.branding.logoHelper")}
                  onChange={(event) => void handleLogoChange(event)}
                  placeholder={t("myUnit.branding.filePlaceholder")}
                  title={t("myUnit.branding.logo")}
                />
                {renderLogoPreview()}
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
            logoUrl={chosenLogo?.url ?? branding.logoUrl}
            primaryColor={draft.primaryColor ?? branding.primaryColor}
            secondaryColor={draft.secondaryColor ?? branding.secondaryColor}
          />
        </SectionCard>
      </BrandingLayout>
    </TabCard>
  )
}
