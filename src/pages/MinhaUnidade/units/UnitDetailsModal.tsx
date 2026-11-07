import { useTranslation } from "react-i18next"

import { Badge, Button } from "@/ds-components/atoms"
import type { DescriptionListItem } from "@/ds-components/molecules"
import { DescriptionList } from "@/ds-components/molecules"
import { Modal } from "@/ds-components/organisms"
import type { SchoolUnit } from "@/models"
import { formatAddress } from "@/utils/address"

import { useStatusLabels } from "../shared/useStatusLabels"

export type UnitDetailsModalProps = {
  unit: SchoolUnit
  onClose: () => void
  onEdit: (unit: SchoolUnit) => void
}

// A unit's details, read-only. An inactive one also shows when and why it was inactivated, and can't
// be edited (it stays only as history; there is no reactivation, DP-P1-06).
export const UnitDetailsModal = (props: UnitDetailsModalProps) => {
  const { onClose, onEdit, unit } = props

  const { i18n, t } = useTranslation()
  const { statusTone, unitStatusLabel } = useStatusLabels()

  const isActive = unit.status === "ATIVA"

  const items: DescriptionListItem[] = [
    { key: "name", label: t("minhaUnidade.units.name"), value: unit.name },
    {
      key: "status",
      label: t("minhaUnidade.units.status"),
      value: <Badge tone={statusTone(unit.status)}>{unitStatusLabel(unit.status)}</Badge>,
    },
    { key: "contactEmail", label: t("minhaUnidade.units.contactEmail"), value: unit.contactEmail },
    { key: "contactPhone", label: t("minhaUnidade.units.contactPhone"), value: unit.contactPhone },
    { fullWidth: true, key: "address", label: t("minhaUnidade.units.address"), value: formatAddress(unit.address) },
    { fullWidth: true, key: "notes", label: t("minhaUnidade.units.notes"), value: unit.notes },
  ]

  if (!isActive) {
    items.push(
      {
        key: "inactivatedAt",
        label: t("minhaUnidade.units.inactivatedAt"),
        value: unit.inactivatedAt
          ? new Intl.DateTimeFormat(i18n.language, { dateStyle: "long" }).format(new Date(unit.inactivatedAt))
          : undefined,
      },
      {
        fullWidth: true,
        key: "inactivationReason",
        label: t("minhaUnidade.units.inactivationReason"),
        value: unit.inactivationReason,
      },
    )
  }

  return (
    <Modal
      closeLabel={t("common.close")}
      footer={
        <>
          <Button onClick={onClose} variant="outlined">
            {t("common.close")}
          </Button>
          {isActive && <Button onClick={() => onEdit(unit)}>{t("common.edit")}</Button>}
        </>
      }
      onClose={onClose}
      size="lg"
      title={unit.name}
      open
    >
      <DescriptionList emptyValue={t("common.notInformed")} items={items} />
    </Modal>
  )
}
