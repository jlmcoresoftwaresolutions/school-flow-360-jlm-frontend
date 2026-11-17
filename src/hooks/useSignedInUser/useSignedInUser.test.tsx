import { render, screen } from "@testing-library/react"
import { createMemoryRouter, RouterProvider } from "react-router-dom"
import { describe, expect, it } from "vitest"

import type { UserContext } from "@/models"
import { shellRouteId } from "@/routes/paths"

import { useSignedInUser } from "./useSignedInUser"

const user: UserContext = {
  admin: false,
  assignments: [],
  email: "secretaria@escola.com.br",
  fullName: "Ana Lima",
  roles: ["SECRETARIA"],
  userId: 7,
}

const Probe = () => {
  const signedIn = useSignedInUser()

  return <p>{signedIn ? signedIn.fullName : "ninguém"}</p>
}

describe("useSignedInUser", () => {
  it("reads who signed in from the shell route's loader", async () => {
    const router = createMemoryRouter(
      [{ children: [{ element: <Probe />, path: "/" }], id: shellRouteId, loader: () => user }],
      { hydrationData: { loaderData: { [shellRouteId]: user } } },
    )
    render(<RouterProvider router={router} />)

    expect(await screen.findByText("Ana Lima")).toBeInTheDocument()
  })

  it("is null outside the shell route", async () => {
    const router = createMemoryRouter([{ element: <Probe />, path: "/" }])
    render(<RouterProvider router={router} />)

    expect(await screen.findByText("ninguém")).toBeInTheDocument()
  })
})
