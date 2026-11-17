import { useCallback, useEffect, useMemo, useState } from "react"
import { useTranslation } from "react-i18next"

import { toast } from "@/components"
import { Badge, Button, Card, Icon, Text } from "@/ds-components/atoms"
import type { SelectOption } from "@/ds-components/molecules"
import { ActionMenu, PageHeader, Pagination, Select, StateMessage } from "@/ds-components/molecules"
import { ConfirmDialog, FilterBar, Table } from "@/ds-components/organisms"
import { spacing } from "@/foundation"
import { useDebouncedValue, useSignedInUser } from "@/hooks"
import type { InvitationPage, InvitationSearchParams, InvitationStatus, InvitationView, RoleCode } from "@/models"
import { getErrorCode, getErrorStatus } from "@/services/httpClient"
import { cancelInvitation, listInvitations, resendInvitation } from "@/services/invitations"
import { roleOrder } from "@/utils/access"

import type { NewAccessMode } from "../shared/userAccess/newAccess"
import { NewAccessModal } from "../shared/userAccess/NewAccessModal"
import { PersonSummary } from "../shared/userAccess/PersonSummary"
import { sortAccess, useAccessLabels } from "../shared/userAccess/useAccessLabels"
import { AccessLines, ListContent, PersonCell } from "../shared/userAccess/userAccess.styles"
import { useUnitDirectory } from "../shared/userAccess/useUnitDirectory"

const pageSize = 20

const statuses: InvitationStatus[] = ["PENDING", "EXPIRED", "ACCEPTED", "CANCELLED", "SUPERSEDED"]

type ListResult = { data: InvitationPage; key: string } | { error: "failed" | "forbidden"; key: string }

type PendingAction = { invitation: InvitationView; kind: "cancel" | "resend" } | null

// The invitations sent in the operator's reach (a Secretaria: those granting something in its units,
// never an Admin), newest first, read page by page with a search and filters by status, role and unit.
// Each row says where the invitation stands: pending (and whether the e-mail went out), expired,
// accepted, cancelled or replaced by a newer one - an old link is never offered for reuse. Only a
// pending or expired invitation can be resent (a new link, valid for 48 h, and the old one stops
// working), and only a pending one cancelled; both ask first. Their validity is the system's (48 h),
// never edited here. Inviting and registering someone by hand start from here too.
export const Invites = () => {
  const { t } = useTranslation()
  const user = useSignedInUser()
  const unitDirectory = useUnitDirectory()
  const {
    accessLabel,
    channelResultLabel,
    formatDate,
    invitationStatusLabel,
    invitationStatusTone,
    originLabel,
    roleLabel,
    unitOptionLabel,
  } = useAccessLabels(unitDirectory.units)

  const [search, setSearch] = useState("")
  const [status, setStatus] = useState<"" | InvitationStatus>("")
  const [roleCode, setRoleCode] = useState<"" | RoleCode>("")
  const [unitId, setUnitId] = useState("")
  const [page, setPage] = useState(1)
  const [reloadToken, setReloadToken] = useState(0)
  const [result, setResult] = useState<ListResult | null>(null)
  const [newAccess, setNewAccess] = useState<NewAccessMode | null>(null)
  const [pendingAction, setPendingAction] = useState<PendingAction>(null)
  const [isActing, setIsActing] = useState(false)

  const debouncedSearch = useDebouncedValue(search.trim())

  const params = useMemo<InvitationSearchParams>(
    () => ({
      direction: "desc",
      page: page - 1,
      q: debouncedSearch || undefined,
      roleCode: roleCode || undefined,
      size: pageSize,
      sortBy: "createdAt",
      status: status || undefined,
      unitId: unitId ? Number(unitId) : undefined,
    }),
    [debouncedSearch, page, roleCode, status, unitId],
  )
  const requestKey = `${JSON.stringify(params)}#${reloadToken}`

  useEffect(() => {
    let isStale = false

    const load = async () => {
      try {
        const data = await listInvitations(params, { showLoading: false })
        if (!isStale) setResult({ data, key: requestKey })
      } catch (error) {
        if (!isStale) setResult({ error: getErrorStatus(error) === 403 ? "forbidden" : "failed", key: requestKey })
      }
    }

    void load()

    return () => {
      isStale = true
    }
  }, [params, requestKey])

  const reload = useCallback(() => setReloadToken((current) => current + 1), [])

  const current = result?.key === requestKey ? result : null
  const data = current && "data" in current ? current.data : null
  const hasFilters = debouncedSearch !== "" || status !== "" || roleCode !== "" || unitId !== ""
  const filterRoles = user?.admin || user?.roles.includes("ADMIN") ? roleOrder : roleOrder.filter((r) => r !== "ADMIN")

  const statusOptions: SelectOption[] = [
    { label: t("userAccess.allStatuses"), value: "" },
    ...statuses.map((value) => ({ label: invitationStatusLabel(value), value })),
  ]
  const roleOptions: SelectOption[] = [
    { label: t("userAccess.allRoles"), value: "" },
    ...filterRoles.map((role) => ({ label: roleLabel(role), value: role })),
  ]
  const unitOptions: SelectOption[] = [
    { label: t("userAccess.allUnits"), value: "" },
    ...unitDirectory.units.map((unit) => ({ label: unitOptionLabel(unit), value: String(unit.id) })),
  ]

  const changeFilter =
    <T,>(setter: (value: T) => void) =>
    (value: T) => {
      setter(value)
      setPage(1)
    }

  const clearFilters = () => {
    setSearch("")
    setStatus("")
    setRoleCode("")
    setUnitId("")
    setPage(1)
  }

  // Resending or cancelling: the list is read again either way, since the invitation may have changed
  // meanwhile (accepted, cancelled, resent by someone else).
  const confirmAction = async () => {
    if (!pendingAction) return

    const { invitation, kind } = pendingAction
    setIsActing(true)

    try {
      if (kind === "resend") {
        await resendInvitation(invitation.id)
        toast.success(t("invites.resent", { email: invitation.email }))
      } else {
        await cancelInvitation(invitation.id)
        toast.success(t("invites.cancelled"))
      }
    } catch (error) {
      const code = getErrorCode(error)

      if (code === "INVITATION_STATE_INVALID" || code === "INVITATION_NOT_FOUND") toast.error(t("invites.stateChanged"))
      else if (code === "USER_DUPLICATE") toast.error(t("invites.userExists"))
      else toast.error(t("invites.actionFailed"))
    } finally {
      setIsActing(false)
      setPendingAction(null)
      reload()
    }
  }

  const actions = (
    <>
      <Button onClick={() => setNewAccess("register")} variant="outlined">
        {t("userAccess.register")}
      </Button>
      <Button onClick={() => setNewAccess("invite")} startIcon={<Icon color="inverse" name="plus" size={16} />}>
        {t("userAccess.invite")}
      </Button>
    </>
  )

  const renderInvitee = (row: InvitationView) => <PersonSummary email={row.email} fullName={row.fullName} />

  const renderStatus = (row: InvitationView) => {
    let note: { color: "danger" | "secondary" | "warning"; text: string } | null = null

    if (row.status === "PENDING") {
      let color: "danger" | "secondary" | "warning" = "secondary"
      if (row.channelResult === "FAILED") color = "danger"
      if (row.channelResult === "UNKNOWN") color = "warning"
      note = { color, text: channelResultLabel(row.channelResult) }
    }
    if (row.status === "EXPIRED") note = { color: "secondary", text: t("invites.expiredHint") }
    if (row.status === "SUPERSEDED") note = { color: "secondary", text: t("invites.supersededHint") }
    if (row.status === "CANCELLED") note = { color: "secondary", text: t("invites.cancelledHint") }

    return (
      <PersonCell>
        <span>
          <Badge tone={invitationStatusTone(row.status)}>{invitationStatusLabel(row.status)}</Badge>
        </span>
        {note && (
          <Text color={note.color} fontSize="sm">
            {note.text}
          </Text>
        )}
      </PersonCell>
    )
  }

  const renderValidity = (row: InvitationView) => {
    if (row.status === "PENDING") return t("invites.expiresAt", { date: formatDate(row.expiresAt) })
    if (row.status === "EXPIRED") return t("invites.expiredAt", { date: formatDate(row.expiresAt) })
    if (row.status === "ACCEPTED" && row.acceptedAt)
      return t("invites.acceptedAt", { date: formatDate(row.acceptedAt) })

    return ""
  }

  const renderActions = (row: InvitationView) => (
    <ActionMenu
      items={[
        {
          disabled: row.status !== "PENDING" && row.status !== "EXPIRED",
          icon: "history",
          key: "resend",
          label: t("invites.resend"),
          onClick: () => setPendingAction({ invitation: row, kind: "resend" }),
        },
        {
          disabled: row.status !== "PENDING",
          icon: "x-circle-outline",
          key: "cancel",
          label: t("invites.cancel"),
          onClick: () => setPendingAction({ invitation: row, kind: "cancel" }),
          tone: "danger",
        },
      ]}
      triggerLabel={t("invites.actionsFor", { email: row.email })}
    />
  )

  const renderContent = () => {
    if (current && "error" in current) {
      if (current.error === "forbidden") {
        return (
          <StateMessage
            description={t("invites.forbiddenDescription")}
            icon="lock-outline"
            title={t("invites.forbiddenTitle")}
          />
        )
      }

      return (
        <StateMessage
          action={<Button onClick={reload}>{t("common.tryAgain")}</Button>}
          description={t("invites.errorDescription")}
          title={t("invites.errorTitle")}
          variant="error"
        />
      )
    }

    if (data && data.totalElements === 0 && !hasFilters && search.trim() === "") {
      return (
        <StateMessage
          action={<Button onClick={() => setNewAccess("invite")}>{t("userAccess.invite")}</Button>}
          description={t("invites.emptyDescription")}
          icon="user-add-outline"
          title={t("invites.emptyTitle")}
        />
      )
    }

    return (
      <ListContent>
        <FilterBar
          actions={actions}
          clearDisabled={!hasFilters && search === ""}
          clearLabel={t("userAccess.clearFilters")}
          label={t("invites.filtersLabel")}
          onClear={clearFilters}
          onSearchChange={changeFilter(setSearch)}
          searchLabel={t("invites.searchLabel")}
          searchPlaceholder={t("invites.searchPlaceholder")}
          searchValue={search}
        >
          <Select
            onChange={(option) => changeFilter(setStatus)((option?.value as InvitationStatus | undefined) ?? "")}
            options={statusOptions}
            title={t("userAccess.status")}
            value={statusOptions.find((option) => option.value === status) ?? null}
          />
          <Select
            onChange={(option) => changeFilter(setRoleCode)((option?.value as RoleCode | undefined) ?? "")}
            options={roleOptions}
            title={t("userAccess.role")}
            value={roleOptions.find((option) => option.value === roleCode) ?? null}
          />
          <Select
            onChange={(option) => changeFilter(setUnitId)(option?.value ?? "")}
            options={unitOptions}
            title={t("userAccess.unit")}
            value={unitOptions.find((option) => option.value === unitId) ?? null}
          />
        </FilterBar>

        <Table
          dataKey="id"
          emptyMessage={t("invites.noResults")}
          loading={!current}
          loadingMessage={t("invites.loading")}
          value={data?.items ?? []}
        >
          <Table.Column body={renderInvitee} field="email" header={t("invites.invitee")} />
          <Table.Column
            body={(row: InvitationView) => (
              <AccessLines>
                {sortAccess(row.assignments).map((assignment) => (
                  <Text key={`${assignment.role}-${assignment.unitId ?? "institution"}`} fontSize="sm">
                    {accessLabel(assignment)}
                  </Text>
                ))}
              </AccessLines>
            )}
            field="assignments"
            header={t("invites.access")}
          />
          <Table.Column body={renderStatus} field="status" header={t("userAccess.status")} />
          <Table.Column
            body={(row: InvitationView) => renderValidity(row)}
            field="expiresAt"
            header={t("invites.validity")}
          />
          <Table.Column
            body={(row: InvitationView) => originLabel(row.origin)}
            field="origin"
            header={t("invites.origin")}
          />
          <Table.Column align="right" body={renderActions} field="id" header={t("invites.actions")} width="1%" />
        </Table>

        {data && data.totalPages > 1 && (
          <Pagination
            label={t("invites.filtersLabel")}
            nextLabel={t("common.nextPage")}
            onChange={setPage}
            page={page}
            pageLabel={(number) => t("common.pageLabel", { page: number })}
            previousLabel={t("common.previousPage")}
            style={{ alignSelf: "flex-end" }}
            totalPages={data.totalPages}
          />
        )}
      </ListContent>
    )
  }

  const isResend = pendingAction?.kind === "resend"

  return (
    <>
      <PageHeader description={t("invites.description")} icon="user-add-outline" title={t("shell.nav.invites")} />

      <Card elevated style={{ padding: spacing[32] }}>
        {renderContent()}
      </Card>

      {newAccess && (
        <NewAccessModal
          mode={newAccess}
          onClose={() => setNewAccess(null)}
          onCreated={reload}
          unitDirectory={unitDirectory}
        />
      )}

      <ConfirmDialog
        cancelLabel={isResend ? t("common.cancel") : t("invites.keep")}
        closeLabel={t("common.close")}
        confirmLabel={isResend ? t("invites.resendConfirm") : t("invites.cancelConfirm")}
        description={
          pendingAction
            ? t(isResend ? "invites.resendDescription" : "invites.cancelDescription", {
                email: pendingAction.invitation.email,
              })
            : undefined
        }
        loading={isActing}
        onClose={() => setPendingAction(null)}
        onConfirm={() => void confirmAction()}
        open={pendingAction !== null}
        title={isResend ? t("invites.resendTitle") : t("invites.cancelTitle")}
        tone={isResend ? "default" : "danger"}
      />
    </>
  )
}
