import { useRef, useState } from "react"

import type { PersonDocument } from "@/models"
import { uploadPersonDocumentFile } from "@/services/people"

export type DocumentUploadResult = { cancelled: true } | { document: PersonDocument } | { error: unknown }

// Sends a document's file with its progress (0 to 100, null while nothing is being sent) and a way to
// cancel it. A cancelled upload stores nothing: the record only says it has a file once the backend
// stored it.
export const useDocumentUpload = () => {
  const controllerRef = useRef<AbortController | null>(null)

  const [progress, setProgress] = useState<number | null>(null)

  const upload = async (personId: number, document: PersonDocument, file: File): Promise<DocumentUploadResult> => {
    const controller = new AbortController()
    controllerRef.current = controller
    setProgress(0)
    try {
      const saved = await uploadPersonDocumentFile(personId, document.id, document.version, file, {
        onUploadProgress: (event) => {
          if (event.total) setProgress(Math.min(100, Math.round((event.loaded * 100) / event.total)))
        },
        showLoading: false,
        signal: controller.signal,
      })
      return { document: saved }
    } catch (error) {
      if (controller.signal.aborted) return { cancelled: true }
      return { error }
    } finally {
      controllerRef.current = null
      setProgress(null)
    }
  }

  const cancel = () => controllerRef.current?.abort()

  return { cancel, isUploading: progress !== null, progress, upload }
}
