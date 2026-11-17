import { useTranslation } from "react-i18next"

import { Text } from "@/ds-components/atoms"

import type { AccessChange } from "./accessChange"
import { sortAccess, useAccessLabels } from "./useAccessLabels"
import { AccessItem, AccessItems, DetailsSection, DetailsSections } from "./userAccess.styles"
import type { DirectoryUnit } from "./useUnitDirectory"

export type AccessChangeSummaryProps = {
  change: AccessChange
  units: DirectoryUnit[]
}

// A change of access before it is confirmed (JLM-157, JLM-161): what is added, what is removed and
// what stays, role by role in each unit, then what that means for the person's reach - units and
// roles gained or lost, Admin granted or taken, nothing left. Never a list of individual permissions.
export const AccessChangeSummary = (props: AccessChangeSummaryProps) => {
  const { change, units } = props

  const { t } = useTranslation()
  const { accessLabel, roleLabel } = useAccessLabels(units)

  const unitName = (unitId: number) =>
    units.find((unit) => unit.id === unitId)?.name ??
    change.removed.concat(change.kept, change.added).find((item) => item.unitId === unitId)?.unitName ??
    t("userAccess.unknownUnit")

  const renderGroup = (key: "added" | "kept" | "removed", color: "danger" | "default" | "success") => {
    const items = sortAccess(change[key])
    if (items.length === 0) return null

    return (
      <DetailsSection aria-label={t(`users.change.${key}`)}>
        <Text as="h3" fontSize="sm" semibold>
          {t(`users.change.${key}`)}
        </Text>
        <AccessItems>
          {items.map((item) => (
            <AccessItem key={`${item.role}-${item.unitId ?? "institution"}`}>
              <Text color={color} fontSize="sm">
                {accessLabel(item)}
              </Text>
            </AccessItem>
          ))}
        </AccessItems>
      </DetailsSection>
    )
  }

  const reach: { color: "danger" | "success" | "warning"; text: string }[] = []
  for (const unitId of change.gainedUnitIds) {
    reach.push({ color: "success", text: t("users.change.gainsUnit", { unit: unitName(unitId) }) })
  }
  for (const unitId of change.lostUnitIds) {
    reach.push({ color: "danger", text: t("users.change.losesUnit", { unit: unitName(unitId) }) })
  }
  for (const role of change.gainedRoles) {
    if (role !== "ADMIN") reach.push({ color: "success", text: t("users.change.gainsRole", { role: roleLabel(role) }) })
  }
  for (const role of change.lostRoles) {
    if (role !== "ADMIN") reach.push({ color: "danger", text: t("users.change.losesRole", { role: roleLabel(role) }) })
  }
  if (change.grantsAdmin) reach.push({ color: "warning", text: t("users.change.grantsAdmin") })
  if (change.losesAdmin) reach.push({ color: "danger", text: t("users.change.losesAdmin") })
  if (change.losesEverything) reach.push({ color: "danger", text: t("users.change.losesEverything") })

  return (
    <DetailsSections>
      {renderGroup("added", "success")}
      {renderGroup("removed", "danger")}
      {renderGroup("kept", "default")}

      {reach.length > 0 && (
        <DetailsSection aria-label={t("users.change.reach")}>
          <Text as="h3" fontSize="sm" semibold>
            {t("users.change.reach")}
          </Text>
          {reach.map((line) => (
            <Text key={line.text} color={line.color} fontSize="sm">
              {line.text}
            </Text>
          ))}
        </DetailsSection>
      )}
    </DetailsSections>
  )
}
