import { exportPerson } from "@/services/people"

// The data subject's right of access (LGPD, Admin only): everything the backend keeps about the person,
// downloaded at once as a JSON file named by the person's id (never by the name, which is personal data
// too). Nothing is kept on screen; the export is audited by the backend.
export const downloadPersonExport = async (personId: number) => {
  const data = await exportPerson(personId)
  const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }))
  const anchor = document.createElement("a")
  anchor.href = url
  anchor.download = `dados-pessoais-${personId}.json`
  anchor.click()
  URL.revokeObjectURL(url)
}
