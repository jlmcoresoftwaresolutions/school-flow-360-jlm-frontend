import { createBrowserRouter, Navigate } from "react-router-dom"

import { AppShell } from "@/ds-components/templates"
import { Login, MinhaEscola } from "@/pages"

// Mock organization/unit names until ENB-0004 (contexto de organização e unidade) resolves them
// from a real session instead - see erp-p1-p3-backlog memory.
const appShellProps = { organizationName: "Colégio Horizonte", unitName: "Unidade Aldeota" }

export const router = createBrowserRouter([
  { element: <Navigate to="/login" replace />, path: "/" },
  { element: <Login />, path: "/login" },
  {
    children: [{ element: <MinhaEscola />, path: "/administracao/minha-escola" }],
    element: <AppShell {...appShellProps} />,
  },
])
