import { useRouteLoaderData } from "react-router-dom"

import type { UserContext } from "@/models"
import { shellRouteId } from "@/routes/paths"

// Who signed in, for a page behind the login: the AppShell route's loader reads it before any page
// renders. Null outside that route (a public page) or when it couldn't be read.
export const useSignedInUser = (): UserContext | null =>
  (useRouteLoaderData(shellRouteId) as UserContext | null | undefined) ?? null
