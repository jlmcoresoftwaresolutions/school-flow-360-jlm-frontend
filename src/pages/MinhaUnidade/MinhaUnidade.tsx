import type { ChangeEvent, FormEvent } from "react"
import { useEffect, useState } from "react"
import { useTranslation } from "react-i18next"

import schoolFlowIcon from "@/assets/images/school-flow-icon.svg"
import { Loading, toast, useUnsavedChanges } from "@/components"
import { Button, Card, Grid, Icon, Image, Tag, Text } from "@/ds-components/atoms"
import type { SelectOption } from "@/ds-components/molecules"
import { ColorPicker, FileUpload, Input, PageHeader, Select, Textarea } from "@/ds-components/molecules"
import { spacing } from "@/foundation"
import { isShallowEqual } from "@/utils/objects"

import type {
  OperationModel,
  Organization,
  OrganizationBranding,
  OrganizationDetails,
  OrganizationStatus,
} from "./MinhaUnidade.mock"
import { fetchMockOrganization, operationModelValues, statusValues } from "./MinhaUnidade.mock"
import {
  CardHeader,
  ColorPreviewRow,
  ColorSwatch,
  FieldGroup,
  FormActions,
  ReadOnlyField,
  ReadOnlyGrid,
} from "./MinhaUnidade.styles"

const statusTagColor = (status: string) => (status === "ATIVA" ? "success" : "muted")

const optionLabel = (options: SelectOption[], value: string) =>
  options.find((option) => option.value === value)?.label ?? value

// The Select options with translated labels; the values stay the codes the data uses.
const useOrganizationOptions = () => {
  const { t } = useTranslation()

  const operationModelOptions: SelectOption[] = operationModelValues.map((value: OperationModel) => ({
    label: t(`minhaUnidade.operationModels.${value}`),
    value,
  }))
  const statusOptions: SelectOption[] = statusValues.map((value: OrganizationStatus) => ({
    label: t(`minhaUnidade.statuses.${value}`),
    value,
  }))

  return { operationModelOptions, statusOptions }
}

export type OrganizationDetailsCardProps = {
  details: OrganizationDetails
  onSave: (details: OrganizationDetails) => void
}

export const OrganizationDetailsCard = (props: OrganizationDetailsCardProps) => {
  const { details, onSave } = props

  const { t } = useTranslation()
  const { operationModelOptions, statusOptions } = useOrganizationOptions()

  const [isEditing, setIsEditing] = useState(false)
  const [draft, setDraft] = useState<OrganizationDetails>(details)

  // Leaving the page while an edit has changed something asks first (see UnsavedChangesGuard).
  useUnsavedChanges(isEditing && !isShallowEqual(draft, details))

  const handleEdit = () => {
    setDraft(details)
    setIsEditing(true)
  }

  const handleCancel = () => setIsEditing(false)

  const handleChange =
    (field: keyof OrganizationDetails) => (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      setDraft((current) => ({ ...current, [field]: event.target.value }))
    }

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault()
    onSave(draft)
    setIsEditing(false)
    toast.success(t("minhaUnidade.detailsSaved"))
  }

  return (
    <Card color="surface" elevated style={{ padding: spacing[32] }}>
      <CardHeader>
        <Text as="h2" fontSize="lg" bold>
          {t("minhaUnidade.detailsTitle")}
        </Text>

        {!isEditing && (
          <Button
            onClick={handleEdit}
            startIcon={<Icon color="brand" name="pen-outline" size={16} />}
            variant="outlined"
          >
            {t("common.edit")}
          </Button>
        )}
      </CardHeader>

      {isEditing ? (
        <form onSubmit={handleSubmit}>
          <FieldGroup>
            <Grid.Row>
              <Grid.Col xs={12} md={6}>
                <Input
                  onChange={handleChange("legalName")}
                  title={t("minhaUnidade.legalName")}
                  value={draft.legalName}
                  required
                />
              </Grid.Col>
              <Grid.Col xs={12} md={6}>
                <Input
                  onChange={handleChange("displayName")}
                  title={t("minhaUnidade.displayName")}
                  value={draft.displayName}
                  required
                />
              </Grid.Col>
            </Grid.Row>

            <Grid.Row>
              <Grid.Col xs={12} md={6}>
                <Select
                  onChange={(option) => setDraft((current) => ({ ...current, operationModel: option?.value ?? "" }))}
                  options={operationModelOptions}
                  title={t("minhaUnidade.operationModel")}
                  value={operationModelOptions.find((option) => option.value === draft.operationModel) ?? null}
                />
              </Grid.Col>
              <Grid.Col xs={12} md={6}>
                <Select
                  onChange={(option) => setDraft((current) => ({ ...current, status: option?.value ?? "" }))}
                  options={statusOptions}
                  title={t("minhaUnidade.status")}
                  value={statusOptions.find((option) => option.value === draft.status) ?? null}
                />
              </Grid.Col>
            </Grid.Row>

            <Grid.Row>
              <Grid.Col xs={12} md={6}>
                <Input
                  onChange={handleChange("contactEmail")}
                  title={t("minhaUnidade.contactEmail")}
                  type="email"
                  value={draft.contactEmail}
                  required
                />
              </Grid.Col>
              <Grid.Col xs={12} md={6}>
                <Input
                  onChange={handleChange("contactPhone")}
                  title={t("minhaUnidade.contactPhone")}
                  value={draft.contactPhone}
                  required
                />
              </Grid.Col>
            </Grid.Row>

            <Input
              onChange={handleChange("address")}
              title={t("minhaUnidade.address")}
              value={draft.address}
              required
            />

            <Textarea
              helperText={t("minhaUnidade.internalNotesHelper")}
              onChange={handleChange("internalNotes")}
              title={t("minhaUnidade.internalNotes")}
              value={draft.internalNotes}
            />
          </FieldGroup>

          <FormActions>
            <Button onClick={handleCancel} type="button" variant="outlined">
              {t("common.cancel")}
            </Button>
            <Button type="submit">{t("common.save")}</Button>
          </FormActions>
        </form>
      ) : (
        <ReadOnlyGrid>
          <ReadOnlyField>
            <Text color="muted" fontSize="xs">
              {t("minhaUnidade.legalName")}
            </Text>
            <Text fontSize="sm">{details.legalName}</Text>
          </ReadOnlyField>

          <ReadOnlyField>
            <Text color="muted" fontSize="xs">
              {t("minhaUnidade.displayName")}
            </Text>
            <Text fontSize="sm">{details.displayName}</Text>
          </ReadOnlyField>

          <ReadOnlyField>
            <Text color="muted" fontSize="xs">
              {t("minhaUnidade.operationModel")}
            </Text>
            <Text fontSize="sm">{optionLabel(operationModelOptions, details.operationModel)}</Text>
          </ReadOnlyField>

          <ReadOnlyField>
            <Text color="muted" fontSize="xs">
              {t("minhaUnidade.status")}
            </Text>
            <Tag color={statusTagColor(details.status)} variant="soft">
              {optionLabel(statusOptions, details.status)}
            </Tag>
          </ReadOnlyField>

          <ReadOnlyField>
            <Text color="muted" fontSize="xs">
              {t("minhaUnidade.contactEmail")}
            </Text>
            <Text fontSize="sm">{details.contactEmail}</Text>
          </ReadOnlyField>

          <ReadOnlyField>
            <Text color="muted" fontSize="xs">
              {t("minhaUnidade.contactPhone")}
            </Text>
            <Text fontSize="sm">{details.contactPhone}</Text>
          </ReadOnlyField>

          <ReadOnlyField>
            <Text color="muted" fontSize="xs">
              {t("minhaUnidade.address")}
            </Text>
            <Text fontSize="sm">{details.address}</Text>
          </ReadOnlyField>
        </ReadOnlyGrid>
      )}
    </Card>
  )
}

export type OrganizationBrandingCardProps = {
  branding: OrganizationBranding
  onSave: (branding: OrganizationBranding) => void
}

export const OrganizationBrandingCard = (props: OrganizationBrandingCardProps) => {
  const { branding, onSave } = props

  const { t } = useTranslation()

  const [isEditing, setIsEditing] = useState(false)
  const [draft, setDraft] = useState<OrganizationBranding>(branding)

  useUnsavedChanges(isEditing && !isShallowEqual(draft, branding))

  const handleEdit = () => {
    setDraft(branding)
    setIsEditing(true)
  }

  const handleCancel = () => setIsEditing(false)

  const handleColorChange = (field: keyof OrganizationBranding) => (nextValue: string) => {
    setDraft((current) => ({ ...current, [field]: nextValue }))
  }

  const handleFileChange = (field: "faviconFileName" | "logoFileName") => (event: ChangeEvent<HTMLInputElement>) => {
    const fileName = event.target.files?.[0]?.name
    if (fileName) setDraft((current) => ({ ...current, [field]: fileName }))
  }

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault()
    onSave(draft)
    setIsEditing(false)
    toast.success(t("minhaUnidade.brandingSaved"))
  }

  return (
    <Card color="surface" elevated style={{ padding: spacing[32] }}>
      <CardHeader>
        <Text as="h2" fontSize="lg" bold>
          {t("minhaUnidade.brandingTitle")}
        </Text>

        {!isEditing && (
          <Button
            onClick={handleEdit}
            startIcon={<Icon color="brand" name="pen-outline" size={16} />}
            variant="outlined"
          >
            {t("common.edit")}
          </Button>
        )}
      </CardHeader>

      {isEditing ? (
        <form onSubmit={handleSubmit}>
          <FieldGroup>
            <FileUpload
              helperText={t("minhaUnidade.logoHelper")}
              onChange={handleFileChange("logoFileName")}
              title={t("minhaUnidade.logo")}
            />

            <FileUpload
              helperText={t("minhaUnidade.faviconHelper")}
              onChange={handleFileChange("faviconFileName")}
              title={t("minhaUnidade.favicon")}
            />

            <Grid.Row>
              <Grid.Col xs={12} md={6}>
                <ColorPicker
                  onChange={handleColorChange("primaryColor")}
                  title={t("minhaUnidade.primaryColor")}
                  value={draft.primaryColor}
                />
              </Grid.Col>
              <Grid.Col xs={12} md={6}>
                <ColorPicker
                  onChange={handleColorChange("secondaryColor")}
                  title={t("minhaUnidade.secondaryColor")}
                  value={draft.secondaryColor}
                />
              </Grid.Col>
            </Grid.Row>
          </FieldGroup>

          <FormActions>
            <Button onClick={handleCancel} type="button" variant="outlined">
              {t("common.cancel")}
            </Button>
            <Button type="submit">{t("common.save")}</Button>
          </FormActions>
        </form>
      ) : (
        <FieldGroup>
          <Image alt={t("minhaUnidade.logoAlt")} borderRadius="medium" size={64} src={schoolFlowIcon} />

          <ReadOnlyGrid>
            <ReadOnlyField>
              <Text color="muted" fontSize="xs">
                {t("minhaUnidade.primaryColor")}
              </Text>
              <ColorPreviewRow>
                <ColorSwatch $color={branding.primaryColor} />
                <Text fontSize="sm">{branding.primaryColor}</Text>
              </ColorPreviewRow>
            </ReadOnlyField>

            <ReadOnlyField>
              <Text color="muted" fontSize="xs">
                {t("minhaUnidade.secondaryColor")}
              </Text>
              <ColorPreviewRow>
                <ColorSwatch $color={branding.secondaryColor} />
                <Text fontSize="sm">{branding.secondaryColor}</Text>
              </ColorPreviewRow>
            </ReadOnlyField>

            <ReadOnlyField>
              <Text color="muted" fontSize="xs">
                {t("minhaUnidade.favicon")}
              </Text>
              <Text fontSize="sm">{branding.faviconFileName}</Text>
            </ReadOnlyField>
          </ReadOnlyGrid>
        </FieldGroup>
      )}
    </Card>
  )
}

export const MinhaUnidade = () => {
  const { t } = useTranslation()

  const [organization, setOrganization] = useState<Organization | null>(null)
  const [hasError, setHasError] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [reloadToken, setReloadToken] = useState(0)

  // The fetch is defined inline inside the effect, rather than as an outer useCallback referenced
  // here, so react-hooks/set-state-in-effect doesn't flag it - a function it can see is local to
  // the effect isn't treated the same as one produced by useCallback and merely called from here.
  // handleRetry bumps reloadToken instead of calling this fetch directly, re-running the effect.
  useEffect(() => {
    const loadOrganization = async () => {
      try {
        const result = await fetchMockOrganization()
        setOrganization(result)
      } catch {
        setHasError(true)
      } finally {
        setIsLoading(false)
      }
    }

    void loadOrganization()
  }, [reloadToken])

  const handleRetry = () => {
    setIsLoading(true)
    setHasError(false)
    setReloadToken((current) => current + 1)
  }

  const handleSaveDetails = (details: OrganizationDetails) => {
    setOrganization((current) => (current ? { ...current, ...details } : current))
  }

  const handleSaveBranding = (branding: OrganizationBranding) => {
    setOrganization((current) => (current ? { ...current, branding } : current))
  }

  return (
    <>
      {isLoading && <Loading label={t("common.loading")} />}

      <PageHeader description={t("minhaUnidade.subtitle")} icon="building-outline" title={t("minhaUnidade.title")} />

      {hasError && (
        <Card
          color="danger"
          style={{
            alignItems: "center",
            display: "flex",
            justifyContent: "space-between",
            marginBottom: spacing[24],
            padding: spacing[16],
          }}
        >
          <Text color="inverse" fontSize="sm">
            {t("minhaUnidade.loadError")}
          </Text>
          <Button color="inverse" onClick={handleRetry} size="small" variant="outlined">
            {t("common.tryAgain")}
          </Button>
        </Card>
      )}

      {organization && (
        <Grid.Row>
          <Grid.Col xs={12} md={6}>
            <OrganizationDetailsCard details={organization} onSave={handleSaveDetails} />
          </Grid.Col>
          <Grid.Col xs={12} md={6}>
            <OrganizationBrandingCard branding={organization.branding} onSave={handleSaveBranding} />
          </Grid.Col>
        </Grid.Row>
      )}
    </>
  )
}
