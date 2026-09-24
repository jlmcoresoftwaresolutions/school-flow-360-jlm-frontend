import { createBrowserRouter, Navigate } from "react-router-dom"

import { AppShell } from "@/ds-components/templates"
import { Login, MinhaEscola } from "@/pages"

export const router = createBrowserRouter([
  { element: <Navigate to="/login" replace />, path: "/" },
  { element: <Login />, path: "/login" },
  {
    children: [{ element: <MinhaEscola />, path: "/administracao/minha-escola" }],
    element: <AppShell />,
  },
])
