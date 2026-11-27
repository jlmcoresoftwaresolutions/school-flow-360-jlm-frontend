import { getLifecycleEvidence } from "@/services/lifecycleEvents"

// The evidence of a lifecycle event (Admin only): the event, its consequences, what was sent, the
// corrections, the lock and the acceptances of the destination contract, downloaded at once as a JSON
// file named by the event's id. Nothing is kept on screen; the export is audited by the backend.
export const downloadLifecycleEvidence = async (eventId: number) => {
  const data = await getLifecycleEvidence(eventId)
  const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }))
  const anchor = document.createElement("a")
  anchor.href = url
  anchor.download = `evidencia-evento-${eventId}.json`
  anchor.click()
  URL.revokeObjectURL(url)
}
