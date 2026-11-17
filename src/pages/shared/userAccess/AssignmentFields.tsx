import { Controller, useFieldArray, useFormContext, useWatch } from "react-hook-form"
import { useTranslation } from "react-i18next"

import { Button, Icon, Text } from "@/ds-components/atoms"
import type { SelectOption } from "@/ds-components/molecules"
import { Select } from "@/ds-components/molecules"
import type { RoleCode } from "@/models"

import { emptyAssignment, newAccessLimits, type NewAccessValues } from "./newAccess"
import { useAccessLabels } from "./useAccessLabels"
import { AccessBox, AssignmentRow, RemoveSlot } from "./userAccess.styles"
import type { DirectoryUnit } from "./useUnitDirectory"

export type AssignmentFieldsProps = {
  // The roles the signed-in user may grant, widest first.
  roles: RoleCode[]
  // The units that can be granted (active ones in the user's reach).
  units: DirectoryUnit[]
  // A refusal that concerns the whole access (a role not grantable, a unit gone), shown above the rows.
  error?: string
}

// The access part of the invitation form: one row per role, each with its unit (an Admin's is the
// whole institution, so its unit is left out). Only roles and units the user may grant are offered,
// never a permission-by-permission setup: what a role allows follows the institution's policy. A role
// can't be chosen twice for the same unit.
export const AssignmentFields = (props: AssignmentFieldsProps) => {
  const { error, roles, units } = props

  const { t } = useTranslation()
  const { roleLabel } = useAccessLabels()
  const { control } = useFormContext<NewAccessValues>()
  const { append, fields, remove } = useFieldArray({ control, name: "assignments" })

  const assignments = useWatch({ control, name: "assignments" })

  const roleOptions: SelectOption[] = roles.map((role) => ({ label: roleLabel(role), value: role }))
  const unitOptions: SelectOption[] = units.map((unit) => ({ label: unit.name, value: String(unit.id) }))
  const canAdd = fields.length < newAccessLimits.assignments

  return (
    <AccessBox>
      <Text as="legend" fontSize="md" semibold style={{ padding: 0 }}>
        {t("userAccess.form.accessTitle")}
      </Text>

      <Text color="secondary" fontSize="sm">
        {t("userAccess.form.accessDescription")}
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

        return (
          <AssignmentRow key={field.id} aria-label={t("userAccess.form.assignmentLabel", { number })} role="group">
            <Controller
              control={control}
              name={`assignments.${index}.role`}
              render={(controller) => (
                <Select
                  error={controller.fieldState.error?.message}
                  name={controller.field.name}
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
                  const first = values.assignments.findIndex(
                    (other) => other.role === row.role && (other.role === "ADMIN" ? "" : other.unitId) === unitId,
                  )

                  return first === index || t("userAccess.form.duplicateAssignment")
                },
              }}
            />

            <RemoveSlot>
              {fields.length > 1 && (
                <Button
                  aria-label={t("userAccess.form.removeAssignmentLabel", { number })}
                  color="danger"
                  onClick={() => remove(index)}
                  size="small"
                  variant="link"
                >
                  {t("userAccess.form.removeAssignment")}
                </Button>
              )}
            </RemoveSlot>
          </AssignmentRow>
        )
      })}

      <div>
        <Button
          disabled={!canAdd}
          onClick={() => append(emptyAssignment)}
          size="small"
          startIcon={<Icon name="plus" size={16} />}
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
