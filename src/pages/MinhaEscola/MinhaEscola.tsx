import type { ChangeEvent, FormEvent } from "react"
import { useEffect, useState } from "react"

import schoolFlowIcon from "@/assets/images/school-flow-icon.svg"
import { Loading, toast } from "@/components"
import { Button, Card, Grid, Icon, Image, Tag, Text } from "@/ds-components/atoms"
import type { SelectOption } from "@/ds-components/molecules"
import { ColorPicker, FileUpload, Input, Select, Textarea } from "@/ds-components/molecules"
import { spacing } from "@/foundation"

import type { Organization, OrganizationBranding, OrganizationDetails } from "./MinhaEscola.mock"
import { fetchMockOrganization, operationModelOptions, statusOptions } from "./MinhaEscola.mock"
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

export type OrganizationDetailsCardProps = {
  details: OrganizationDetails
  onSave: (details: OrganizationDetails) => void
}

export const OrganizationDetailsCard = (props: OrganizationDetailsCardProps) => {
  const { details, onSave } = props

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
    toast.success("Dados da organização atualizados.")
  }

  return (
    <Card color="surface" elevated style={{ padding: spacing[32] }}>
      <CardHeader>
        <Text as="h2" fontSize="lg" bold>
          Dados da organização
        </Text>

        {!isEditing && (
          <Button
            onClick={handleEdit}
            startIcon={<Icon color="brand" name="pen-outline" size={16} />}
            variant="outlined"
          >
            Editar
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
                  title="Nome da organização"
                  value={draft.legalName}
                  required
                />
              </Grid.Col>
              <Grid.Col xs={12} md={6}>
                <Input onChange={handleChange("displayName")} title="Nome exibido" value={draft.displayName} required />
              </Grid.Col>
            </Grid.Row>

            <Grid.Row>
              <Grid.Col xs={12} md={6}>
                <Select
                  onChange={(option) => setDraft((current) => ({ ...current, operationModel: option?.value ?? "" }))}
                  options={operationModelOptions}
                  title="Modelo de operação"
                  value={operationModelOptions.find((option) => option.value === draft.operationModel) ?? null}
                />
              </Grid.Col>
              <Grid.Col xs={12} md={6}>
                <Select
                  onChange={(option) => setDraft((current) => ({ ...current, status: option?.value ?? "" }))}
                  options={statusOptions}
                  title="Situação"
                  value={statusOptions.find((option) => option.value === draft.status) ?? null}
                />
              </Grid.Col>
            </Grid.Row>

            <Grid.Row>
              <Grid.Col xs={12} md={6}>
                <Input
                  onChange={handleChange("contactEmail")}
                  title="E-mail institucional"
                  type="email"
                  value={draft.contactEmail}
                  required
                />
              </Grid.Col>
              <Grid.Col xs={12} md={6}>
                <Input onChange={handleChange("contactPhone")} title="Telefone" value={draft.contactPhone} required />
              </Grid.Col>
            </Grid.Row>

            <Input onChange={handleChange("address")} title="Endereço" value={draft.address} required />

            <Textarea
              helperText="Visível apenas para a equipe administrativa."
              onChange={handleChange("internalNotes")}
              title="Observação interna"
              value={draft.internalNotes}
            />
          </FieldGroup>

          <FormActions>
            <Button onClick={handleCancel} type="button" variant="outlined">
              Cancelar
            </Button>
            <Button type="submit">Salvar</Button>
          </FormActions>
        </form>
      ) : (
        <ReadOnlyGrid>
          <ReadOnlyField>
            <Text color="muted" fontSize="xs">
              Nome da organização
            </Text>
            <Text fontSize="sm">{details.legalName}</Text>
          </ReadOnlyField>

          <ReadOnlyField>
            <Text color="muted" fontSize="xs">
              Nome exibido
            </Text>
            <Text fontSize="sm">{details.displayName}</Text>
          </ReadOnlyField>

          <ReadOnlyField>
            <Text color="muted" fontSize="xs">
              Modelo de operação
            </Text>
            <Text fontSize="sm">{optionLabel(operationModelOptions, details.operationModel)}</Text>
          </ReadOnlyField>

          <ReadOnlyField>
            <Text color="muted" fontSize="xs">
              Situação
            </Text>
            <Tag color={statusTagColor(details.status)} variant="soft">
              {optionLabel(statusOptions, details.status)}
            </Tag>
          </ReadOnlyField>

          <ReadOnlyField>
            <Text color="muted" fontSize="xs">
              E-mail institucional
            </Text>
            <Text fontSize="sm">{details.contactEmail}</Text>
          </ReadOnlyField>

          <ReadOnlyField>
            <Text color="muted" fontSize="xs">
              Telefone
            </Text>
            <Text fontSize="sm">{details.contactPhone}</Text>
          </ReadOnlyField>

          <ReadOnlyField>
            <Text color="muted" fontSize="xs">
              Endereço
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
    toast.success("Identidade visual atualizada.")
  }

  return (
    <Card color="surface" elevated style={{ padding: spacing[32] }}>
      <CardHeader>
        <Text as="h2" fontSize="lg" bold>
          Identidade visual
        </Text>

        {!isEditing && (
          <Button
            onClick={handleEdit}
            startIcon={<Icon color="brand" name="pen-outline" size={16} />}
            variant="outlined"
          >
            Editar
          </Button>
        )}
      </CardHeader>

      {isEditing ? (
        <form onSubmit={handleSubmit}>
          <FieldGroup>
            <FileUpload
              helperText="PNG ou SVG, fundo transparente recomendado."
              onChange={handleFileChange("logoFileName")}
              title="Logo"
            />

            <FileUpload
              helperText="Formato .svg ou .ico recomendado."
              onChange={handleFileChange("faviconFileName")}
              title="Favicon"
            />

            <Grid.Row>
              <Grid.Col xs={12} md={6}>
                <ColorPicker
                  onChange={handleColorChange("primaryColor")}
                  title="Cor primária"
                  value={draft.primaryColor}
                />
              </Grid.Col>
              <Grid.Col xs={12} md={6}>
                <ColorPicker
                  onChange={handleColorChange("secondaryColor")}
                  title="Cor secundária"
                  value={draft.secondaryColor}
                />
              </Grid.Col>
            </Grid.Row>
          </FieldGroup>

          <FormActions>
            <Button onClick={handleCancel} type="button" variant="outlined">
              Cancelar
            </Button>
            <Button type="submit">Salvar</Button>
          </FormActions>
        </form>
      ) : (
        <FieldGroup>
          <Image alt="Logo da organização" borderRadius="medium" size={64} src={schoolFlowIcon} />

          <ReadOnlyGrid>
            <ReadOnlyField>
              <Text color="muted" fontSize="xs">
                Cor primária
              </Text>
              <ColorPreviewRow>
                <ColorSwatch $color={branding.primaryColor} />
                <Text fontSize="sm">{branding.primaryColor}</Text>
              </ColorPreviewRow>
            </ReadOnlyField>

            <ReadOnlyField>
              <Text color="muted" fontSize="xs">
                Cor secundária
              </Text>
              <ColorPreviewRow>
                <ColorSwatch $color={branding.secondaryColor} />
                <Text fontSize="sm">{branding.secondaryColor}</Text>
              </ColorPreviewRow>
            </ReadOnlyField>

            <ReadOnlyField>
              <Text color="muted" fontSize="xs">
                Favicon
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
  const [organization, setOrganization] = useState<Organization | null>(null)
  const [error, setError] = useState<string | null>(null)
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
        setError("Não foi possível carregar os dados da organização.")
      } finally {
        setIsLoading(false)
      }
    }

    void loadOrganization()
  }, [reloadToken])

  const handleRetry = () => {
    setIsLoading(true)
    setError(null)
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
      {isLoading && <Loading />}

      <PageHeader>
        <Text as="h1" fontSize="2xl" bold>
          Minha Escola
        </Text>
        <Text color="secondary" fontSize="sm">
          Configure a identidade institucional da organização corrente.
        </Text>
      </PageHeader>

      {error && (
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
            {error}
          </Text>
          <Button color="inverse" onClick={handleRetry} size="small" variant="outlined">
            Tentar novamente
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
