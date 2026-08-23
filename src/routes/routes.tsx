import { createBrowserRouter } from "react-router-dom"

import { Experimental, Home, Login } from "@/pages"

export const router = createBrowserRouter([
  { element: <Home />, path: "/" },
  { element: <Experimental />, path: "/experimental" },
  { element: <Login />, path: "/login" },
])
