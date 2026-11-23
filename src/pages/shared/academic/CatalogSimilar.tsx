import { useEffect, useState } from "react"
import { useTranslation } from "react-i18next"

import { Text } from "@/ds-components/atoms"
import { useDebouncedValue } from "@/hooks"
import type { AcademicCatalogMatches } from "@/models"
import { searchAcademicCatalog } from "@/services/academicCatalog"

export type CatalogSimilarProps = {
  kind: keyof AcademicCatalogMatches
  // What is being typed (a name or a code).
  term: string
  // The item being edited, left out of the similar ones.
  exceptId?: number
}

const minLength = 2

// The items of the catalog that look like what is being typed, before creating another (the backend's
// pre-creation search, which ignores accents): a hint against duplicates, never a block. Nothing is
// shown while the term is short, while it is read, or when nothing looks alike.
export const CatalogSimilar = (props: CatalogSimilarProps) => {
  const { exceptId, kind, term } = props

  const { t } = useTranslation()
  const debouncedTerm = useDebouncedValue(term.trim(), 400)

  const [found, setFound] = useState<{ names: string[]; term: string } | null>(null)

  const searchTerm = debouncedTerm.length >= minLength ? debouncedTerm : ""
  const names = found?.term === searchTerm ? found.names : []

  useEffect(() => {
    if (!searchTerm) return

    let isStale = false

    const load = async () => {
      try {
        const matches = await searchAcademicCatalog(searchTerm, { showLoading: false })
        if (isStale) return
        const items: { id: number; name: string }[] = matches[kind]
        setFound({ names: items.filter((item) => item.id !== exceptId).map((item) => item.name), term: searchTerm })
      } catch {
        // The hint is optional: a failed search just shows nothing.
      }
    }

    void load()

    return () => {
      isStale = true
    }
  }, [exceptId, kind, searchTerm])

  if (names.length === 0) return null

  return (
    <Text color="warning" fontSize="sm" role="status">
      {t("academic.similar", { names: names.join(", ") })}
    </Text>
  )
}
