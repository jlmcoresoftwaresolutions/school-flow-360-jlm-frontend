import { createBrowserRouter, Navigate } from "react-router-dom"

import { Login } from "@/pages"

export const router = createBrowserRouter([
  { element: <Navigate to="/login" replace />, path: "/" },
  { element: <Login />, path: "/login" },
])
