import type { ChangeEvent, FormEvent } from "react"
import { useEffect, useState } from "react"
import { useTranslation } from "react-i18next"

import schoolFlowIcon from "@/assets/images/school-flow-icon.svg"
import { Loading, toast } from "@/components"
import { Button, Card, Grid, Icon, Image, Tag, Text } from "@/ds-components/atoms"
import type { SelectOption } from "@/ds-components/molecules"
import { ColorPicker, FileUpload, Input, Select, Textarea } from "@/ds-components/molecules"
import { spacing } from "@/foundation"

import type {
  OperationModel,
  Organization,
  OrganizationBranding,
  OrganizationDetails,
  OrganizationStatus,
} from "./MinhaEscola.mock"
import { fetchMockOrganization, operationModelValues, statusValues } from "./MinhaEscola.mock"
import {
  CardHeader,
  ColorPreviewRow,
  ColorSwatch,
  FieldGroup,
  FormActions,
  PageHeader,
  ReadOnlyField,
  ReadOnlyGrid,
} from "./MinhaEscola.styles"

const statusTagColor = (status: string) => (status === "ATIVA" ? "success" : "muted")

const optionLabel = (options: SelectOption[], value: string) =>
  options.find((option) => option.value === value)?.label ?? value

// The Select options with translated labels; the values stay the codes the data uses.
const useOrganizationOptions = () => {
  const { t } = useTranslation()

  const operationModelOptions: SelectOption[] = operationModelValues.map((value: OperationModel) => ({
    label: t(`minhaEscola.operationModels.${value}`),
    value,
  }))
  const statusOptions: SelectOption[] = statusValues.map((value: OrganizationStatus) => ({
    label: t(`minhaEscola.statuses.${value}`),
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
    toast.success(t("minhaEscola.detailsSaved"))
  }

  return (
    <Card color="surface" elevated style={{ padding: spacing[32] }}>
      <CardHeader>
        <Text as="h2" fontSize="lg" bold>
          {t("minhaEscola.detailsTitle")}
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
                  title={t("minhaEscola.legalName")}
                  value={draft.legalName}
                  required
                />
              </Grid.Col>
              <Grid.Col xs={12} md={6}>
                <Input
                  onChange={handleChange("displayName")}
                  title={t("minhaEscola.displayName")}
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
                  title={t("minhaEscola.operationModel")}
                  value={operationModelOptions.find((option) => option.value === draft.operationModel) ?? null}
                />
              </Grid.Col>
              <Grid.Col xs={12} md={6}>
                <Select
                  onChange={(option) => setDraft((current) => ({ ...current, status: option?.value ?? "" }))}
                  options={statusOptions}
                  title={t("minhaEscola.status")}
                  value={statusOptions.find((option) => option.value === draft.status) ?? null}
                />
              </Grid.Col>
            </Grid.Row>

            <Grid.Row>
              <Grid.Col xs={12} md={6}>
                <Input
                  onChange={handleChange("contactEmail")}
                  title={t("minhaEscola.contactEmail")}
                  type="email"
                  value={draft.contactEmail}
                  required
                />
              </Grid.Col>
              <Grid.Col xs={12} md={6}>
                <Input
                  onChange={handleChange("contactPhone")}
                  title={t("minhaEscola.contactPhone")}
                  value={draft.contactPhone}
                  required
                />
              </Grid.Col>
            </Grid.Row>

            <Input onChange={handleChange("address")} title={t("minhaEscola.address")} value={draft.address} required />

            <Textarea
              helperText={t("minhaEscola.internalNotesHelper")}
              onChange={handleChange("internalNotes")}
              title={t("minhaEscola.internalNotes")}
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
              {t("minhaEscola.legalName")}
            </Text>
            <Text fontSize="sm">{details.legalName}</Text>
          </ReadOnlyField>

          <ReadOnlyField>
            <Text color="muted" fontSize="xs">
              {t("minhaEscola.displayName")}
            </Text>
            <Text fontSize="sm">{details.displayName}</Text>
          </ReadOnlyField>

          <ReadOnlyField>
            <Text color="muted" fontSize="xs">
              {t("minhaEscola.operationModel")}
            </Text>
            <Text fontSize="sm">{optionLabel(operationModelOptions, details.operationModel)}</Text>
          </ReadOnlyField>

          <ReadOnlyField>
            <Text color="muted" fontSize="xs">
              {t("minhaEscola.status")}
            </Text>
            <Tag color={statusTagColor(details.status)} variant="soft">
              {optionLabel(statusOptions, details.status)}
            </Tag>
          </ReadOnlyField>

          <ReadOnlyField>
            <Text color="muted" fontSize="xs">
              {t("minhaEscola.contactEmail")}
            </Text>
            <Text fontSize="sm">{details.contactEmail}</Text>
          </ReadOnlyField>

          <ReadOnlyField>
            <Text color="muted" fontSize="xs">
              {t("minhaEscola.contactPhone")}
            </Text>
            <Text fontSize="sm">{details.contactPhone}</Text>
          </ReadOnlyField>

          <ReadOnlyField>
            <Text color="muted" fontSize="xs">
              {t("minhaEscola.address")}
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
    toast.success(t("minhaEscola.brandingSaved"))
  }

  return (
    <Card color="surface" elevated style={{ padding: spacing[32] }}>
      <CardHeader>
        <Text as="h2" fontSize="lg" bold>
          {t("minhaEscola.brandingTitle")}
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
              helperText={t("minhaEscola.logoHelper")}
              onChange={handleFileChange("logoFileName")}
              title={t("minhaEscola.logo")}
            />

            <FileUpload
              helperText={t("minhaEscola.faviconHelper")}
              onChange={handleFileChange("faviconFileName")}
              title={t("minhaEscola.favicon")}
            />

            <Grid.Row>
              <Grid.Col xs={12} md={6}>
                <ColorPicker
                  onChange={handleColorChange("primaryColor")}
                  title={t("minhaEscola.primaryColor")}
                  value={draft.primaryColor}
                />
              </Grid.Col>
              <Grid.Col xs={12} md={6}>
                <ColorPicker
                  onChange={handleColorChange("secondaryColor")}
                  title={t("minhaEscola.secondaryColor")}
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
          <Image alt={t("minhaEscola.logoAlt")} borderRadius="medium" size={64} src={schoolFlowIcon} />

          <ReadOnlyGrid>
            <ReadOnlyField>
              <Text color="muted" fontSize="xs">
                {t("minhaEscola.primaryColor")}
              </Text>
              <ColorPreviewRow>
                <ColorSwatch $color={branding.primaryColor} />
                <Text fontSize="sm">{branding.primaryColor}</Text>
              </ColorPreviewRow>
            </ReadOnlyField>

            <ReadOnlyField>
              <Text color="muted" fontSize="xs">
                {t("minhaEscola.secondaryColor")}
              </Text>
              <ColorPreviewRow>
                <ColorSwatch $color={branding.secondaryColor} />
                <Text fontSize="sm">{branding.secondaryColor}</Text>
              </ColorPreviewRow>
            </ReadOnlyField>

            <ReadOnlyField>
              <Text color="muted" fontSize="xs">
                {t("minhaEscola.favicon")}
              </Text>
              <Text fontSize="sm">{branding.faviconFileName}</Text>
            </ReadOnlyField>
          </ReadOnlyGrid>
        </FieldGroup>
      )}
    </Card>
  )
}

export const MinhaEscola = () => {
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

      <PageHeader>
        <Text as="h1" fontSize="2xl" bold>
          {t("minhaEscola.title")}
        </Text>
        <Text color="secondary" fontSize="sm">
          {t("minhaEscola.subtitle")}
        </Text>
      </PageHeader>

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
            {t("minhaEscola.loadError")}
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
