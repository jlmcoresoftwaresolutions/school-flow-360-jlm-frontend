import type { AnimationEvent } from "react"
import { useState } from "react"
import { Controller, useFieldArray, useFormContext, useWatch } from "react-hook-form"
import { useTranslation } from "react-i18next"

import { Button, Icon, IconButton, Text } from "@/ds-components/atoms"
import type { SelectOption } from "@/ds-components/molecules"
import { Select } from "@/ds-components/molecules"
import { useMediaQuery } from "@/hooks"
import type { RoleCode } from "@/models"

import { type AssignmentsFormValues, emptyAssignment, newAccessLimits } from "./newAccess"
import { useAccessLabels } from "./useAccessLabels"
import { AccessBox, AssignmentRow, RemoveSlot, RowMotion } from "./userAccess.styles"
import type { DirectoryUnit } from "./useUnitDirectory"

export type AssignmentFieldsProps = {
  // The roles the signed-in user may grant, widest first.
  roles: RoleCode[]
  // The units that can be granted (active ones in the user's reach).
  units: DirectoryUnit[]
  // Whether every row may be removed (an access change, where the access already held stays apart);
  // otherwise at least one row is kept (an invitation).
  allowEmpty?: boolean
  description?: string
  // A refusal that concerns the whole access (a role not grantable, a unit gone), shown above the rows.
  error?: string
  // How many rows fit, besides the access already held (the backend takes up to 10 in all).
  maxRows?: number
  // The access the person already holds: choosing it again is refused as a repetition.
  taken?: { role: RoleCode; unitId: number | null }[]
  title?: string
}

// The access part of the invitation form: one row per role, each with its unit (an Admin's is the
// whole institution, so its unit is left out). Only roles and units the user may grant are offered,
// never a permission-by-permission setup: what a role allows follows the institution's policy. A role
// can't be chosen twice for the same unit. A row added grows in, and one removed collapses away before
// it leaves the form (at once for whoever asked for reduced motion); the rows there at first don't move.
export const AssignmentFields = (props: AssignmentFieldsProps) => {
  const {
    allowEmpty,
    description,
    error,
    maxRows = newAccessLimits.assignments,
    roles,
    taken = [],
    title,
    units,
  } = props

  const { t } = useTranslation()
  const { roleLabel } = useAccessLabels()
  const { control } = useFormContext<AssignmentsFormValues>()
  const { append, fields, remove } = useFieldArray({ control, name: "assignments" })

  const assignments = useWatch({ control, name: "assignments" })
  const prefersReducedMotion = useMediaQuery("(prefers-reduced-motion: reduce)")

  // The rows the form opened with, which appear without animating.
  const [initialIds] = useState(() => new Set(fields.map((field) => field.id)))
  // The rows collapsing on their way out, still in the form until their animation ends.
  const [leavingIds, setLeavingIds] = useState<ReadonlySet<string>>(() => new Set())

  const roleOptions: SelectOption[] = roles.map((role) => ({ label: roleLabel(role), value: role }))
  const unitOptions: SelectOption[] = units.map((unit) => ({ label: unit.name, value: String(unit.id) }))
  const canAdd = fields.length < maxRows
  const keptRows = fields.length - leavingIds.size

  const startRemoving = (id: string, index: number) => {
    if (prefersReducedMotion) {
      remove(index)
      return
    }

    setLeavingIds((current) => new Set(current).add(id))
  }

  // Only the row's own animation counts, not one from something inside it.
  const finishRemoving = (id: string) => (event: AnimationEvent<HTMLDivElement>) => {
    if (event.target !== event.currentTarget || !leavingIds.has(id)) return

    remove(fields.findIndex((field) => field.id === id))
    setLeavingIds((current) => {
      const next = new Set(current)
      next.delete(id)
      return next
    })
  }

  const rowPhase = (id: string) => {
    if (leavingIds.has(id)) return "leaving"
    if (!initialIds.has(id)) return "entering"
    return "still"
  }

  return (
    <AccessBox>
      <Text as="legend" fontSize="md" semibold style={{ padding: 0 }}>
        {title ?? t("userAccess.form.accessTitle")}
      </Text>

      <Text color="secondary" fontSize="sm">
        {description ?? t("userAccess.form.accessDescription")}
      </Text>

      {error && (
        <Text color="danger" fontSize="sm" role="alert">
          {error}
        </Text>
      )}

      {units.length === 0 && (
        <Text color="warning" fontSize="sm" role="status">
          {t("userAccess.form.noUnits")}
        </Text>
      )}

      {fields.map((field, index) => {
        const isAdmin = assignments[index]?.role === "ADMIN"
        const number = index + 1
        const isLeaving = leavingIds.has(field.id)

        return (
          <RowMotion
            key={field.id}
            $phase={rowPhase(field.id)}
            inert={isLeaving}
            onAnimationEnd={finishRemoving(field.id)}
          >
            <AssignmentRow aria-label={t("userAccess.form.assignmentLabel", { number })} role="group">
              <Controller
                control={control}
                name={`assignments.${index}.role`}
                render={(controller) => (
                  <Select
                    error={controller.fieldState.error?.message}
                    name={controller.field.name}
                    noOptionsMessage={t("common.noOptions")}
                    onBlur={controller.field.onBlur}
                    onChange={(option) => controller.field.onChange((option?.value as RoleCode | undefined) ?? "")}
                    options={roleOptions}
                    placeholder={t("userAccess.form.rolePlaceholder")}
                    title={t("userAccess.form.roleLabel")}
                    value={roleOptions.find((option) => option.value === controller.field.value) ?? null}
                    required
                  />
                )}
                rules={{ validate: (value) => value !== "" || t("userAccess.form.roleRequired") }}
              />

              <Controller
                control={control}
                name={`assignments.${index}.unitId`}
                render={(controller) => (
                  <Select
                    error={controller.fieldState.error?.message}
                    isDisabled={isAdmin}
                    name={controller.field.name}
                    noOptionsMessage={t("common.noOptions")}
                    onBlur={controller.field.onBlur}
                    onChange={(option) => controller.field.onChange(option?.value ?? "")}
                    options={unitOptions}
                    placeholder={isAdmin ? t("userAccess.wholeInstitution") : t("userAccess.form.unitPlaceholder")}
                    title={t("userAccess.form.unitLabel")}
                    value={
                      isAdmin ? null : (unitOptions.find((option) => option.value === controller.field.value) ?? null)
                    }
                    required={!isAdmin}
                  />
                )}
                rules={{
                  validate: (value, values) => {
                    const row = values.assignments[index]
                    if (!row || row.role === "") return true
                    if (row.role !== "ADMIN" && value === "") return t("userAccess.form.unitRequired")

                    const unitId = row.role === "ADMIN" ? "" : value
                    const held = taken.some(
                      (item) => item.role === row.role && (item.unitId === null ? "" : String(item.unitId)) === unitId,
                    )
                    if (held) return t("userAccess.form.alreadyHeld")

                    const first = values.assignments.findIndex(
                      (other) => other.role === row.role && (other.role === "ADMIN" ? "" : other.unitId) === unitId,
                    )

                    return first === index || t("userAccess.form.duplicateAssignment")
                  },
                }}
              />

              <RemoveSlot>
                {(allowEmpty || keptRows > 1) && (
                  <IconButton
                    color="danger"
                    icon="trash-outline"
                    label={t("userAccess.form.removeAssignmentLabel", { number })}
                    onClick={() => startRemoving(field.id, index)}
                    tooltip={t("userAccess.form.removeAssignment")}
                  />
                )}
              </RemoveSlot>
            </AssignmentRow>
          </RowMotion>
        )
      })}

      <div>
        <Button
          disabled={!canAdd}
          onClick={() => append(emptyAssignment)}
          size="small"
          startIcon={<Icon color="inherit" name="plus" size={16} />}
          variant="outlined"
        >
          {t("userAccess.form.addAssignment")}
        </Button>
        {!canAdd && (
          <Text color="secondary" fontSize="sm">
            {t("userAccess.form.maxAssignments", { max: newAccessLimits.assignments })}
          </Text>
        )}
      </div>
    </AccessBox>
  )
}
