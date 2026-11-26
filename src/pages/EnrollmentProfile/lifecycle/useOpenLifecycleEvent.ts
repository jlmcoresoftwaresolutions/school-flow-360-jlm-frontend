import { useEffect, useState } from "react"

import type { Enrollment, LifecycleEvent } from "@/models"
import { listLifecycleEvents } from "@/services/lifecycleEvents"

// The prepared lifecycle event an enrollment is part of: as the origin (the enrollment being transferred,
// re-enrolled, cancelled or locked) or as the destination preparation of a transfer or a re-enrollment.
export type OpenLifecycleEvent = {
  event: LifecycleEvent
  role: "destination" | "origin"
}

type LoadResult = { found: OpenLifecycleEvent | null; key: string }

// Reads the prepared events of the enrollment's student and finds the one this enrollment is part of
// (`undefined` while reading or when the list couldn't be read: nothing is assumed). An enrollment has at
// most one prepared event as the origin. Read again with the enrollment (`refreshKey`); nothing is read
// before the enrollment is.
export const useOpenLifecycleEvent = (enrollment: Enrollment | null, refreshKey: number) => {
  const [result, setResult] = useState<LoadResult | null>(null)

  const enrollmentId = enrollment?.id
  const studentId = enrollment?.student.id
  const requestKey = `${enrollmentId}#${refreshKey}`

  useEffect(() => {
    if (enrollmentId === undefined || studentId === undefined) return

    let isStale = false

    const load = async () => {
      try {
        const page = await listLifecycleEvents({ size: 20, status: "PREPARED", studentId }, { showLoading: false })
        const origin = page.items.find((item) => item.originEnrollmentId === enrollmentId)
        const destination = page.items.find((item) => item.destinationEnrollmentId === enrollmentId)
        let found: OpenLifecycleEvent | null = null
        if (origin) found = { event: origin, role: "origin" }
        else if (destination) found = { event: destination, role: "destination" }
        if (!isStale) setResult({ found, key: requestKey })
      } catch {
        if (!isStale) setResult(null)
      }
    }

    void load()

    return () => {
      isStale = true
    }
  }, [enrollmentId, requestKey, studentId])

  return result?.key === requestKey ? result.found : undefined
}
