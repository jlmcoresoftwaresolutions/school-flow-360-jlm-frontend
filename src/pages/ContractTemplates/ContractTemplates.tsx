import { useEffect, useState } from "react"
import { useTranslation } from "react-i18next"

import { Badge, type BadgeProps, Button, Card, Icon, Text } from "@/ds-components/atoms"
import type { ActionMenuItem } from "@/ds-components/molecules"
import { ActionMenu, PageHeader, StateMessage } from "@/ds-components/molecules"
import { Modal, Table } from "@/ds-components/organisms"
import { spacing } from "@/foundation"
import { useSignedInUser } from "@/hooks"
import type { ContractTemplate, ContractTemplateStatus } from "@/models"
import { listContractTemplates } from "@/services/contracts"
import { getErrorStatus } from "@/services/httpClient"
import { hasAnyRole } from "@/utils/access"

import { ContractText } from "../shared/contracts/contracts.styles"
import { PeopleListError } from "../shared/people/PeopleListError"
import { ListContent } from "../shared/userAccess/userAccess.styles"
import { TemplateDecisionDialog } from "./TemplateDecisionDialog"
import { TemplateFormModal } from "./TemplateFormModal"

type BadgeTone = NonNullable<BadgeProps["tone"]>

type Dialog =
  | { copyFrom?: ContractTemplate; kind: "new" }
  | { kind: "approve" | "edit" | "retire" | "view"; template: ContractTemplate }
  | null

type LoadResult = { error: "failed" | "forbidden"; key: number } | { items: ContractTemplate[]; key: number }

const statusTones: Record<ContractTemplateStatus, BadgeTone> = {
  APPROVED: "success",
  DRAFT: "warning",
  RETIRED: "neutral",
}

// The school's enrollment contract model (decided by Lucas on 24/11/2026, backend slice 3C), version by
// version, the newest first. The system brings no contract text: the school writes it with the
// controlled fields, and the Admin approves a draft with the legal counsel's reference. Only the approved
// version generates contracts, and only one is approved at a time; an approved version is never edited
// (a change is a new version) and is retired, never deleted. The Secretaria reads.
export const ContractTemplates = () => {
  const { i18n, t } = useTranslation()
  const signedIn = useSignedInUser()

  const [result, setResult] = useState<LoadResult | null>(null)
  const [reloadToken, setReloadToken] = useState(0)
  const [dialog, setDialog] = useState<Dialog>(null)

  const current = result?.key === reloadToken ? result : null
  const isAdmin = hasAnyRole(signedIn, ["ADMIN"])
  const templates = current && "items" in current ? current.items : null
  const sorted = [...(templates ?? [])].sort((first, second) => second.versionNumber - first.versionNumber)
  const approved = sorted.find((template) => template.status === "APPROVED") ?? null

  useEffect(() => {
    let isStale = false

    const load = async () => {
      try {
        const items = await listContractTemplates({ showLoading: false })
        if (!isStale) setResult({ items, key: reloadToken })
      } catch (error) {
        if (!isStale) setResult({ error: getErrorStatus(error) === 403 ? "forbidden" : "failed", key: reloadToken })
      }
    }

    void load()

    return () => {
      isStale = true
    }
  }, [reloadToken])

  const reload = () => setReloadToken((value) => value + 1)

  const afterChange = () => {
    setDialog(null)
    reload()
  }

  const formatMoment = (value: string) =>
    new Intl.DateTimeFormat(i18n.language, { dateStyle: "short", timeStyle: "short" }).format(new Date(value))

  const renderActions = (template: ContractTemplate) => {
    const items: ActionMenuItem[] = [
      {
        icon: "file-outline",
        key: "view",
        label: t("contractTemplates.viewText"),
        onClick: () => setDialog({ kind: "view", template }),
      },
    ]
    if (isAdmin && template.status === "DRAFT") {
      items.push(
        {
          icon: "pen-outline",
          key: "edit",
          label: t("contractTemplates.edit"),
          onClick: () => setDialog({ kind: "edit", template }),
        },
        {
          icon: "check-circle-outline",
          key: "approve",
          label: t("contractTemplates.approve.action"),
          onClick: () => setDialog({ kind: "approve", template }),
        },
      )
    }
    if (isAdmin && template.status !== "DRAFT") {
      items.push({
        icon: "plus",
        key: "copy",
        label: t("contractTemplates.copy"),
        onClick: () => setDialog({ copyFrom: template, kind: "new" }),
      })
    }
    if (isAdmin && template.status === "APPROVED") {
      items.push({
        icon: "lock-outline",
        key: "retire",
        label: t("contractTemplates.retire.action"),
        onClick: () => setDialog({ kind: "retire", template }),
        tone: "danger",
      })
    }

    return (
      <ActionMenu items={items} triggerLabel={t("contractTemplates.actionsFor", { version: template.versionNumber })} />
    )
  }

  const renderList = () => {
    if (current && "error" in current) {
      return (
        <PeopleListError
          error={current.error}
          errorDescription={t("contractTemplates.errorDescription")}
          errorTitle={t("contractTemplates.errorTitle")}
          forbiddenDescription={t("contractTemplates.forbiddenDescription")}
          forbiddenTitle={t("contractTemplates.forbiddenTitle")}
          onRetry={reload}
        />
      )
    }

    if (templates && templates.length === 0) {
      return (
        <StateMessage
          action={
            isAdmin ? (
              <Button onClick={() => setDialog({ kind: "new" })}>{t("contractTemplates.new")}</Button>
            ) : undefined
          }
          description={isAdmin ? t("contractTemplates.emptyDescription") : t("contractTemplates.emptyReadOnly")}
          icon="contract-outline"
          title={t("contractTemplates.emptyTitle")}
        />
      )
    }

    return (
      <Table
        dataKey="id"
        emptyMessage={t("contractTemplates.emptyTitle")}
        loading={!current}
        loadingMessage={t("contractTemplates.loading")}
        value={sorted}
      >
        <Table.Column
          body={(row: ContractTemplate) => (
            <Text fontSize="sm" semibold>
              {t("contractTemplates.versionLabel", { version: row.versionNumber })}
            </Text>
          )}
          field="versionNumber"
          header={t("contractTemplates.version")}
          width="1%"
        />
        <Table.Column field="title" header={t("contractTemplates.titleColumn")} />
        <Table.Column
          body={(row: ContractTemplate) => (
            <Badge tone={statusTones[row.status]}>{t(`contractTemplates.statuses.${row.status}`)}</Badge>
          )}
          field="status"
          header={t("contractTemplates.status")}
        />
        <Table.Column
          body={(row: ContractTemplate) =>
            row.approvedAt ? (
              <span style={{ display: "flex", flexDirection: "column" }}>
                <Text fontSize="sm">{formatMoment(row.approvedAt)}</Text>
                {row.legalApprovalRef && (
                  <Text color="secondary" fontSize="xs">
                    {row.legalApprovalRef}
                  </Text>
                )}
              </span>
            ) : (
              <Text color="secondary" fontSize="sm">
                {t("contractTemplates.notApproved")}
              </Text>
            )
          }
          field="approvedAt"
          header={t("contractTemplates.approval")}
        />
        <Table.Column
          align="right"
          body={renderActions}
          field="id"
          header={t("contractTemplates.actions")}
          width="1%"
        />
      </Table>
    )
  }

  return (
    <>
      <PageHeader
        description={t("contractTemplates.description")}
        icon="contract-outline"
        title={t("shell.nav.contractTemplates")}
      />

      <Card elevated style={{ padding: spacing[32] }}>
        <ListContent>
          <div
            style={{
              alignItems: "center",
              display: "flex",
              flexWrap: "wrap",
              gap: spacing[16],
              justifyContent: "space-between",
            }}
          >
            <Text color="secondary" fontSize="sm" role="status">
              {approved
                ? t("contractTemplates.approvedNow", { version: approved.versionNumber })
                : t("contractTemplates.noneApproved")}
            </Text>
            {isAdmin && (
              <Button
                onClick={() => setDialog({ copyFrom: approved ?? undefined, kind: "new" })}
                size="small"
                startIcon={<Icon color="inherit" name="plus" size={16} />}
              >
                {t("contractTemplates.new")}
              </Button>
            )}
          </div>

          {!isAdmin && (
            <Text color="secondary" fontSize="sm">
              {t("contractTemplates.readOnly")}
            </Text>
          )}

          {renderList()}
        </ListContent>
      </Card>

      {dialog?.kind === "new" && (
        <TemplateFormModal copyFrom={dialog.copyFrom} onClose={() => setDialog(null)} onSaved={afterChange} />
      )}
      {dialog?.kind === "edit" && (
        <TemplateFormModal onClose={() => setDialog(null)} onSaved={afterChange} template={dialog.template} />
      )}
      {(dialog?.kind === "approve" || dialog?.kind === "retire") && (
        <TemplateDecisionDialog
          decision={dialog.kind}
          onChanged={afterChange}
          onClose={() => setDialog(null)}
          template={dialog.template}
        />
      )}
      {dialog?.kind === "view" && (
        <Modal
          closeLabel={t("common.close")}
          onClose={() => setDialog(null)}
          size="lg"
          title={t("contractTemplates.viewTitle", {
            title: dialog.template.title,
            version: dialog.template.versionNumber,
          })}
          open
        >
          <ContractText>{dialog.template.body}</ContractText>
        </Modal>
      )}
    </>
  )
}
