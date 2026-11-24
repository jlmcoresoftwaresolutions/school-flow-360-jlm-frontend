import { useEffect, useState } from "react"
import { useTranslation } from "react-i18next"

import { toast } from "@/components"
import { Badge, Button, Text } from "@/ds-components/atoms"
import type { ActionMenuItem } from "@/ds-components/molecules"
import { ActionMenu, StateMessage } from "@/ds-components/molecules"
import { Table } from "@/ds-components/organisms"
import type { CatalogItem, PersonDocument } from "@/models"
import { getPersonDocumentDownload, listPersonDocuments } from "@/services/people"
import { formatDate } from "@/utils/dates"
import { formatFileSize } from "@/utils/formats"

import { PersonCell } from "../../userAccess/userAccess.styles"
import { PersonBlock } from "../PersonBlock"
import { ArchiveDocumentDialog } from "./ArchiveDocumentDialog"
import { documentStatusTone } from "./documentFile"
import { DocumentFileModal } from "./DocumentFileModal"
import { NewDocumentModal } from "./NewDocumentModal"
import { useDocumentFailure } from "./useDocumentFailure"

export type PersonDocumentsProps = {
  documentTypes: CatalogItem[]
  personId: number
  // Only downloads (an anonymized person): nothing registered, attached or archived.
  readOnly?: boolean
}

type LoadResult = { documents: PersonDocument[]; key: string } | { error: true; key: string }

type Dialog = { document: PersonDocument; kind: "archive" | "file" } | { kind: "new" } | null

// A document of the table, with a field for each column.
type DocumentRow = PersonDocument & { actions: string; file: string }

// The personal documents of a student or a guardian (P03, Documentos tab): the type from the catalog,
// the masked number, the issue and expiry dates, the file and the status the backend derives (Válido,
// Sem arquivo, Vencido, Arquivado). From here a document is registered, its file attached or replaced,
// downloaded (a 5-minute link, opened at once and never kept) and archived - never deleted. The list is
// kept with the person it was read for, so another person's documents never show while a new one loads.
export const PersonDocuments = (props: PersonDocumentsProps) => {
  const { documentTypes, personId, readOnly = false } = props

  const { i18n, t } = useTranslation()
  const toFailure = useDocumentFailure()

  const [result, setResult] = useState<LoadResult | null>(null)
  const [reloadToken, setReloadToken] = useState(0)
  const [dialog, setDialog] = useState<Dialog>(null)

  const requestKey = `${personId}#${reloadToken}`
  const current = result?.key === requestKey ? result : null
  const documents = current && "documents" in current ? current.documents : []
  const rows: DocumentRow[] = documents.map((document) => ({ ...document, actions: "", file: "" }))

  useEffect(() => {
    let isStale = false

    const load = async () => {
      try {
        const loaded = await listPersonDocuments(personId, { showLoading: false })
        if (!isStale) setResult({ documents: loaded, key: requestKey })
      } catch {
        if (!isStale) setResult({ error: true, key: requestKey })
      }
    }

    void load()

    return () => {
      isStale = true
    }
  }, [personId, requestKey])

  const reload = () => {
    setDialog(null)
    setReloadToken((value) => value + 1)
  }

  // The link lasts 5 minutes and is never kept: it is asked for at each download and opened right away.
  const download = async (document: PersonDocument) => {
    try {
      const link = await getPersonDocumentDownload(personId, document.id)
      const anchor = window.document.createElement("a")
      anchor.href = link.url
      anchor.rel = "noopener"
      anchor.target = "_blank"
      anchor.click()
    } catch (error) {
      const outcome = toFailure(error)
      toast.error(outcome.message)
      if (outcome.kind === "stale") reload()
    }
  }

  const renderDocument = (row: DocumentRow) => (
    <PersonCell>
      <Text fontSize="sm" semibold>
        {row.documentTypeLabel || row.documentType}
      </Text>
      {row.maskedNumber && (
        <Text color="secondary" fontSize="sm">
          {row.maskedNumber}
        </Text>
      )}
    </PersonCell>
  )

  const renderFile = (row: DocumentRow) => {
    if (!row.hasFile || !row.fileName) {
      return (
        <Text color="secondary" fontSize="sm">
          {t("personDocuments.noFile")}
        </Text>
      )
    }

    return (
      <PersonCell>
        <Text fontSize="sm">{row.fileName}</Text>
        {row.fileSize !== null && (
          <Text color="secondary" fontSize="sm">
            {formatFileSize(row.fileSize, i18n.language)}
          </Text>
        )}
      </PersonCell>
    )
  }

  const renderActions = (row: DocumentRow) => {
    const isArchived = row.status === "ARCHIVED"
    const items: ActionMenuItem[] = []
    if (row.hasFile) {
      items.push({
        icon: "download-outline",
        key: "download",
        label: t("personDocuments.download"),
        onClick: () => void download(row),
      })
    }
    if (!isArchived && !readOnly) {
      items.push(
        {
          icon: "file-outline",
          key: "file",
          label: row.hasFile ? t("personDocuments.file.replace") : t("personDocuments.file.attach"),
          onClick: () => setDialog({ document: row, kind: "file" }),
        },
        {
          icon: "lock-outline",
          key: "archive",
          label: t("personDocuments.archive.action"),
          onClick: () => setDialog({ document: row, kind: "archive" }),
          tone: "danger",
        },
      )
    }
    if (items.length === 0) return null

    return (
      <ActionMenu
        items={items}
        triggerLabel={t("personDocuments.actionsFor", { type: row.documentTypeLabel || row.documentType })}
      />
    )
  }

  const renderContent = () => {
    if (current && "error" in current) {
      return (
        <StateMessage
          action={
            <Button onClick={reload} size="small">
              {t("common.tryAgain")}
            </Button>
          }
          description={t("personDocuments.errorDescription")}
          title={t("personDocuments.errorTitle")}
          variant="error"
        />
      )
    }

    return (
      <Table
        dataKey="id"
        emptyMessage={t("personDocuments.empty")}
        loading={!current}
        loadingMessage={t("personDocuments.loading")}
        value={rows}
      >
        <Table.Column body={renderDocument} field="documentType" header={t("personDocuments.document")} />
        <Table.Column
          body={(row: DocumentRow) => (row.issuedOn ? formatDate(row.issuedOn) : t("common.notInformed"))}
          field="issuedOn"
          header={t("personDocuments.issuedOn")}
        />
        <Table.Column
          body={(row: DocumentRow) => (row.expiresOn ? formatDate(row.expiresOn) : "—")}
          field="expiresOn"
          header={t("personDocuments.expiresOn")}
        />
        <Table.Column body={renderFile} field="file" header={t("personDocuments.file.label")} />
        <Table.Column
          body={(row: DocumentRow) => (
            <Badge tone={documentStatusTone[row.status]}>{t(`personDocuments.statuses.${row.status}`)}</Badge>
          )}
          field="status"
          header={t("people.status")}
        />
        <Table.Column
          align="right"
          body={renderActions}
          field="actions"
          header={t("personDocuments.actions")}
          width="1%"
        />
      </Table>
    )
  }

  return (
    <>
      <PersonBlock
        action={
          !readOnly && (
            <Button onClick={() => setDialog({ kind: "new" })} size="small">
              {t("personDocuments.add")}
            </Button>
          )
        }
        title={t("personDocuments.title")}
      >
        <Text color="secondary" fontSize="sm">
          {t("personDocuments.description")}
        </Text>
        {renderContent()}
      </PersonBlock>

      {dialog?.kind === "new" && (
        <NewDocumentModal
          documentTypes={documentTypes}
          onChanged={reload}
          onClose={() => setDialog(null)}
          personId={personId}
        />
      )}

      {dialog?.kind === "file" && (
        <DocumentFileModal
          document={dialog.document}
          onChanged={reload}
          onClose={() => setDialog(null)}
          personId={personId}
        />
      )}

      {dialog?.kind === "archive" && (
        <ArchiveDocumentDialog
          document={dialog.document}
          onChanged={reload}
          onClose={() => setDialog(null)}
          personId={personId}
        />
      )}
    </>
  )
}
