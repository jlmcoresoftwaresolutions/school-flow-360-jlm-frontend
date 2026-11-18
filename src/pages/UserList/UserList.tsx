import { useCallback, useEffect, useMemo, useState } from "react"
import { useTranslation } from "react-i18next"

import { Badge, Button, Card, Icon, Text } from "@/ds-components/atoms"
import type { SelectOption } from "@/ds-components/molecules"
import { ActionMenu, PageHeader, Pagination, Select, StateMessage } from "@/ds-components/molecules"
import { FilterBar, Table } from "@/ds-components/organisms"
import { spacing } from "@/foundation"
import { useDebouncedValue, useSignedInUser } from "@/hooks"
import type { RoleCode, UserPage, UserSearchParams, UserView } from "@/models"
import { getErrorStatus } from "@/services/httpClient"
import { listUsers } from "@/services/users"
import { roleOrder } from "@/utils/access"

import type { NewAccessMode } from "../shared/userAccess/newAccess"
import { NewAccessModal } from "../shared/userAccess/NewAccessModal"
import { PersonSummary } from "../shared/userAccess/PersonSummary"
import { sortAccess, useAccessLabels } from "../shared/userAccess/useAccessLabels"
import { AccessLines, ListContent } from "../shared/userAccess/userAccess.styles"
import { useUnitDirectory } from "../shared/userAccess/useUnitDirectory"
import { AccountStatusDialog } from "./AccountStatusDialog"
import { AssignmentsModal } from "./AssignmentsModal"
import { ProfileModal } from "./ProfileModal"
import { RevokeModal } from "./RevokeModal"
import { type UserDetailsAction, UserDetailsModal } from "./UserDetailsModal"

const pageSize = 20

type StatusFilter = "" | "ACTIVE" | "INACTIVE"

// Which dialog is open: a user's details (read again when opened), or one of the actions on a user.
type UserDialog = { kind: "details"; userId: number } | { kind: UserDetailsAction; user: UserView } | null

// What the list shows: the page asked for (by its request key, so a page of an earlier search or
// filter is never shown under a new one), or why it couldn't be read.
type ListResult = { data: UserPage; key: string } | { error: "failed" | "forbidden"; key: string }

// The people with access in the operator's reach (an Admin: the whole institution; a Secretaria: its
// units, never an Admin), read from the backend page by page with a search by name or e-mail and
// filters by role, unit and status. Each row shows the person's active roles in their units and the
// account's status; the details (and, in the next phase, the actions) open in a dialog. Changing a
// filter clears the rows at once and shows the table loading, so data from another context is never
// left on screen. An institution without users, a search without results, a failure and a refusal
// (403) each say so differently. From here the operator also invites or registers someone, which
// creates an invitation (the Convites page follows it until the person accepts).
export const UserList = () => {
  const { t } = useTranslation()
  const user = useSignedInUser()
  const unitDirectory = useUnitDirectory()
  const { accessLabel, roleLabel, unitOptionLabel, userStatusLabel, userStatusTone } = useAccessLabels(
    unitDirectory.units,
  )

  const [search, setSearch] = useState("")
  const [roleCode, setRoleCode] = useState<"" | RoleCode>("")
  const [unitId, setUnitId] = useState("")
  const [status, setStatus] = useState<StatusFilter>("")
  const [page, setPage] = useState(1)
  const [reloadToken, setReloadToken] = useState(0)
  const [result, setResult] = useState<ListResult | null>(null)
  const [newAccess, setNewAccess] = useState<NewAccessMode | null>(null)
  const [dialog, setDialog] = useState<UserDialog>(null)

  const debouncedSearch = useDebouncedValue(search.trim())

  const params = useMemo<UserSearchParams>(
    () => ({
      direction: "asc",
      page: page - 1,
      q: debouncedSearch || undefined,
      roleCode: roleCode || undefined,
      size: pageSize,
      sortBy: "fullName",
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
        // The table shows its own loading state, so the global overlay isn't needed.
        const data = await listUsers(params, { showLoading: false })
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
  const closeDialog = useCallback(() => setDialog(null), [])

  // After an action: the list is read again and the details reopen, read again too.
  const handleSaved = (user: UserView) => {
    reload()
    setDialog({ kind: "details", userId: user.id })
  }

  // The user went out of reach: the list is read again, without them.
  const handleGone = () => {
    reload()
    setDialog(null)
  }

  const current = result?.key === requestKey ? result : null
  const data = current && "data" in current ? current.data : null
  const hasFilters = debouncedSearch !== "" || roleCode !== "" || unitId !== "" || status !== ""
  // A Secretaria never sees an Admin, so Admin isn't a filter for it.
  const filterRoles = user?.admin || user?.roles.includes("ADMIN") ? roleOrder : roleOrder.filter((r) => r !== "ADMIN")

  const roleOptions: SelectOption[] = [
    { label: t("userAccess.allRoles"), value: "" },
    ...filterRoles.map((role) => ({ label: roleLabel(role), value: role })),
  ]
  const unitOptions: SelectOption[] = [
    { label: t("userAccess.allUnits"), value: "" },
    ...unitDirectory.units.map((unit) => ({ label: unitOptionLabel(unit), value: String(unit.id) })),
  ]
  const statusOptions: SelectOption[] = [
    { label: t("userAccess.allStatuses"), value: "" },
    { label: t("users.statusActive"), value: "ACTIVE" },
    { label: t("users.statusInactive"), value: "INACTIVE" },
  ]

  // Every filter starts the list over from its first page.
  const changeFilter =
    <T,>(setter: (value: T) => void) =>
    (value: T) => {
      setter(value)
      setPage(1)
    }

  const clearFilters = () => {
    setSearch("")
    setRoleCode("")
    setUnitId("")
    setStatus("")
    setPage(1)
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

  const renderPerson = (row: UserView) => <PersonSummary email={row.email} fullName={row.fullName} />

  const renderAccess = (row: UserView) => {
    const active = sortAccess(row.assignments.filter((assignment) => assignment.status === "ACTIVE"))
    if (active.length === 0) {
      return (
        <Text color="secondary" fontSize="sm">
          {t("users.noAccess")}
        </Text>
      )
    }

    return (
      <AccessLines>
        {active.map((assignment) => (
          <Text key={assignment.assignmentId} fontSize="sm">
            {accessLabel(assignment)}
          </Text>
        ))}
      </AccessLines>
    )
  }

  const renderContent = () => {
    if (current && "error" in current) {
      if (current.error === "forbidden") {
        return (
          <StateMessage
            description={t("users.forbiddenDescription")}
            icon="lock-outline"
            title={t("users.forbiddenTitle")}
          />
        )
      }

      return (
        <StateMessage
          action={<Button onClick={reload}>{t("common.tryAgain")}</Button>}
          description={t("users.errorDescription")}
          title={t("users.errorTitle")}
          variant="error"
        />
      )
    }

    if (data && data.totalElements === 0 && !hasFilters && search.trim() === "") {
      return (
        <StateMessage
          action={<Button onClick={() => setNewAccess("invite")}>{t("userAccess.invite")}</Button>}
          description={t("users.emptyDescription")}
          icon="users-outline"
          title={t("users.emptyTitle")}
        />
      )
    }

    return (
      <ListContent>
        <FilterBar
          actions={actions}
          clearDisabled={!hasFilters && search === ""}
          clearLabel={t("userAccess.clearFilters")}
          label={t("users.filtersLabel")}
          onClear={clearFilters}
          onSearchChange={changeFilter(setSearch)}
          searchLabel={t("users.searchLabel")}
          searchPlaceholder={t("users.searchPlaceholder")}
          searchValue={search}
        >
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
          <Select
            onChange={(option) => changeFilter(setStatus)((option?.value as StatusFilter | undefined) ?? "")}
            options={statusOptions}
            title={t("userAccess.status")}
            value={statusOptions.find((option) => option.value === status) ?? null}
          />
        </FilterBar>

        <Table
          dataKey="id"
          emptyMessage={t("users.noResults")}
          loading={!current}
          loadingMessage={t("users.loading")}
          value={data?.items ?? []}
        >
          <Table.Column body={renderPerson} field="fullName" header={t("users.person")} />
          <Table.Column body={renderAccess} field="assignments" header={t("users.access")} />
          <Table.Column
            body={(row: UserView) => <Badge tone={userStatusTone(row.status)}>{userStatusLabel(row.status)}</Badge>}
            field="status"
            header={t("userAccess.status")}
          />
          <Table.Column
            align="right"
            body={(row: UserView) => (
              <ActionMenu
                items={[
                  {
                    icon: "eye-outline",
                    key: "view",
                    label: t("users.view"),
                    onClick: () => setDialog({ kind: "details", userId: row.id }),
                  },
                ]}
                triggerLabel={t("users.actionsFor", { name: row.fullName || row.email })}
              />
            )}
            field="id"
            header={t("users.actions")}
            width="1%"
          />
        </Table>

        {data && data.totalPages > 1 && (
          <Pagination
            label={t("users.filtersLabel")}
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

  return (
    <>
      <PageHeader description={t("users.description")} icon="contacts-outline" title={t("shell.nav.userList")} />

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

      {dialog?.kind === "details" && (
        <UserDetailsModal
          onAction={(kind, user) => setDialog({ kind, user })}
          onClose={closeDialog}
          onUnavailable={reload}
          units={unitDirectory.units}
          userId={dialog.userId}
        />
      )}

      {dialog?.kind === "profile" && (
        <ProfileModal
          onClose={() => setDialog({ kind: "details", userId: dialog.user.id })}
          onGone={handleGone}
          onSaved={handleSaved}
          user={dialog.user}
        />
      )}

      {dialog?.kind === "assignments" && (
        <AssignmentsModal
          onClose={() => setDialog({ kind: "details", userId: dialog.user.id })}
          onGone={handleGone}
          onSaved={handleSaved}
          unitDirectory={unitDirectory}
          user={dialog.user}
        />
      )}

      {dialog?.kind === "revoke" && (
        <RevokeModal
          onClose={() => setDialog({ kind: "details", userId: dialog.user.id })}
          onGone={handleGone}
          onSaved={handleSaved}
          unitDirectory={unitDirectory}
          user={dialog.user}
        />
      )}

      {(dialog?.kind === "inactivate" || dialog?.kind === "reactivate") && (
        <AccountStatusDialog
          action={dialog.kind}
          onClose={() => setDialog({ kind: "details", userId: dialog.user.id })}
          onGone={handleGone}
          onSaved={handleSaved}
          user={dialog.user}
        />
      )}
    </>
  )
}
