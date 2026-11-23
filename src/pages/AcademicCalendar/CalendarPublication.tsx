import { useEffect, useState } from "react"
import { useTranslation } from "react-i18next"

import { toast } from "@/components"
import { Badge, Button, Text } from "@/ds-components/atoms"
import { DescriptionList, StateMessage } from "@/ds-components/molecules"
import { ConfirmDialog, Table } from "@/ds-components/organisms"
import type { AcademicCalendarPreview, AcademicCalendarVersion } from "@/models"
import {
  listAcademicCalendarVersions,
  previewAcademicCalendar,
  publishAcademicCalendar,
} from "@/services/academicCalendar"
import { getErrorCode, getErrorStatus } from "@/services/httpClient"

import { useAcademicLabels } from "../shared/academic/useAcademicLabels"
import { PersonSections } from "../shared/people/people.styles"
import { PersonBlock } from "../shared/people/PersonBlock"
import { useFailureMessage } from "../shared/people/useFailureMessage"
import { PersonCell } from "../shared/userAccess/userAccess.styles"
import { WithdrawVersionDialog } from "./WithdrawVersionDialog"

export type CalendarPublicationProps = {
  periodId: number
  // Changes whenever the calendar changed, to read the preview and the versions again.
  refreshKey: number
  unitId: number
  unitName: string
  // A publication or a withdrawal happened: the rest of the page reads again.
  onChanged: () => void
}

type PublicationResult =
  | { error: true; key: string }
  | { key: string; preview: AcademicCalendarPreview; versions: AcademicCalendarVersion[] }

type Dialog = { kind: "publish" } | { kind: "withdraw"; version: AcademicCalendarVersion } | null

// Publishing a unit's calendar for the period: the preview of what would be published (the items, the
// school days they give and whether they differ from the version on air), published as a closed snapshot
// with the revision seen here - if the items changed meanwhile, nothing is published and the preview is
// read again. Only the Admin and the unit's Coordenação publish and withdraw (`canPublish`, `WITHDRAW`);
// the Secretaria prepares. The versions stay listed, newest first: published, superseded or withdrawn.
export const CalendarPublication = (props: CalendarPublicationProps) => {
  const { onChanged, periodId, refreshKey, unitId, unitName } = props

  const { t } = useTranslation()
  const { calendarVersionLabel, calendarVersionTone, formatMoment } = useAcademicLabels()
  const toFailureMessage = useFailureMessage()

  const [result, setResult] = useState<PublicationResult | null>(null)
  const [reloadToken, setReloadToken] = useState(0)
  const [dialog, setDialog] = useState<Dialog>(null)
  const [isPublishing, setIsPublishing] = useState(false)
  const [publishFailure, setPublishFailure] = useState("")

  const requestKey = `${periodId}:${unitId}#${refreshKey}#${reloadToken}`

  useEffect(() => {
    let isStale = false

    const load = async () => {
      try {
        const [preview, versions] = await Promise.all([
          previewAcademicCalendar({ periodId, unitId }, { showLoading: false }),
          listAcademicCalendarVersions({ periodId, unitId }, { showLoading: false }),
        ])
        if (!isStale) setResult({ key: requestKey, preview, versions })
      } catch {
        if (!isStale) setResult({ error: true, key: requestKey })
      }
    }

    void load()

    return () => {
      isStale = true
    }
  }, [periodId, requestKey, unitId])

  const current = result?.key === requestKey ? result : null

  const afterChange = () => {
    setDialog(null)
    onChanged()
  }

  const publish = async (preview: AcademicCalendarPreview) => {
    setIsPublishing(true)
    setPublishFailure("")
    try {
      await publishAcademicCalendar({ periodId, units: [{ revision: preview.revision, unitId }] })
      toast.success(t("academicCalendar.publish.done", { unit: unitName }))
      setIsPublishing(false)
      afterChange()
    } catch (error) {
      setIsPublishing(false)
      const code = getErrorCode(error)
      if (code === "VERSION_CONFLICT") {
        toast.error(t("academicCalendar.publish.changed"))
        afterChange()
      } else if (getErrorStatus(error) === 403) {
        setPublishFailure(t("academicCalendar.publish.forbidden"))
      } else if (code === "ACADEMIC_NOT_ELIGIBLE" || getErrorStatus(error) === 422) {
        setPublishFailure(t("academicCalendar.publish.nothing"))
      } else {
        setPublishFailure(toFailureMessage(t("academicCalendar.publish.failed"), error))
      }
    }
  }

  if (!current) {
    return (
      <Text color="secondary" fontSize="sm" role="status">
        {t("academicCalendar.loadingPreview")}
      </Text>
    )
  }

  if ("error" in current) {
    return (
      <StateMessage
        action={<Button onClick={() => setReloadToken((value) => value + 1)}>{t("common.tryAgain")}</Button>}
        description={t("academicCalendar.previewErrorDescription")}
        title={t("academicCalendar.previewErrorTitle")}
        variant="error"
      />
    )
  }

  const { preview, versions } = current

  const previewStatus = () => {
    if (preview.items.length === 0) return t("academicCalendar.preview.noItems")
    if (preview.publishedVersionNo === null) return t("academicCalendar.preview.neverPublished")
    if (preview.changedSincePublished) {
      return t("academicCalendar.preview.changed", { number: preview.publishedVersionNo })
    }
    return t("academicCalendar.preview.upToDate", { number: preview.publishedVersionNo })
  }

  return (
    <PersonSections>
      <PersonBlock
        action={
          preview.canPublish ? (
            <Button
              disabled={!preview.changedSincePublished}
              onClick={() => setDialog({ kind: "publish" })}
              size="small"
            >
              {t("academicCalendar.publish.action")}
            </Button>
          ) : undefined
        }
        title={t("academicCalendar.preview.title")}
      >
        <DescriptionList
          items={[
            { key: "items", label: t("academicCalendar.preview.items"), value: String(preview.items.length) },
            { key: "schoolDays", label: t("academicCalendar.preview.schoolDays"), value: String(preview.schoolDays) },
            { fullWidth: true, key: "status", label: t("academic.status"), value: previewStatus() },
          ]}
        />
        {!preview.canPublish && preview.items.length > 0 && (
          <Text color="secondary" fontSize="sm">
            {t("academicCalendar.preview.cannotPublish")}
          </Text>
        )}
      </PersonBlock>

      <PersonBlock title={t("academicCalendar.versions.title")}>
        <Table dataKey="id" emptyMessage={t("academicCalendar.versions.empty")} value={versions}>
          <Table.Column
            body={(row: AcademicCalendarVersion) => (
              <PersonCell>
                <Text fontSize="sm" semibold>
                  {t("academicCalendar.versions.number", { number: row.versionNo })}
                </Text>
                <Text color="secondary" fontSize="sm">
                  {formatMoment(row.publishedAt)}
                </Text>
              </PersonCell>
            )}
            field="versionNo"
            header={t("academicCalendar.versions.version")}
          />
          <Table.Column
            body={(row: AcademicCalendarVersion) => (
              <PersonCell>
                <span>
                  <Badge tone={calendarVersionTone(row.status)}>{calendarVersionLabel(row.status)}</Badge>
                </span>
                {row.withdrawReason && (
                  <Text color="secondary" fontSize="sm">
                    {t("academicCalendar.versions.withdrawReason", { reason: row.withdrawReason })}
                  </Text>
                )}
              </PersonCell>
            )}
            field="status"
            header={t("academic.status")}
          />
          <Table.Column
            body={(row: AcademicCalendarVersion) => (
              <Text fontSize="sm">{t("academicCalendar.versions.schoolDays", { count: row.schoolDays })}</Text>
            )}
            field="schoolDays"
            header={t("academicCalendar.preview.schoolDays")}
          />
          <Table.Column
            align="right"
            body={(row: AcademicCalendarVersion) =>
              row.eligibleActions.includes("WITHDRAW") ? (
                <Button onClick={() => setDialog({ kind: "withdraw", version: row })} size="small" variant="outlined">
                  {t("academicCalendar.withdraw.action")}
                </Button>
              ) : null
            }
            field="id"
            header={t("academic.actions")}
            width="1%"
          />
        </Table>
      </PersonBlock>

      {dialog?.kind === "publish" && (
        <ConfirmDialog
          cancelLabel={t("common.cancel")}
          confirmLabel={t("academicCalendar.publish.confirm")}
          description={t("academicCalendar.publish.description", {
            items: preview.items.length,
            schoolDays: preview.schoolDays,
          })}
          loading={isPublishing}
          onClose={() => {
            setDialog(null)
            setPublishFailure("")
          }}
          onConfirm={() => void publish(preview)}
          title={t("academicCalendar.publish.title", { unit: unitName })}
          open
        >
          {publishFailure && (
            <Text as="p" color="danger" fontSize="sm" role="alert">
              {publishFailure}
            </Text>
          )}
        </ConfirmDialog>
      )}
      {dialog?.kind === "withdraw" && (
        <WithdrawVersionDialog
          onChanged={afterChange}
          onClose={() => setDialog(null)}
          unitName={unitName}
          version={dialog.version}
        />
      )}
    </PersonSections>
  )
}
