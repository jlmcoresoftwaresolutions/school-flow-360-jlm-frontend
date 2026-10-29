import { act, fireEvent, render, screen, within } from "@testing-library/react"
import { useState } from "react"
import { createMemoryRouter, Link, Outlet, RouterProvider } from "react-router-dom"
import { describe, expect, it } from "vitest"

import { UnsavedChangesGuard } from "./UnsavedChangesGuard"
import { useUnsavedChanges } from "./useUnsavedChanges"

// A form that has unsaved changes once something is typed, and none again after saving.
const EditForm = () => {
  const [value, setValue] = useState("")
  const [savedValue, setSavedValue] = useState("")

  useUnsavedChanges(value !== savedValue)

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault()
        setSavedValue(value)
      }}
    >
      <input aria-label="Nome" onChange={(event) => setValue(event.target.value)} value={value} />
      <button type="submit">Salvar</button>
      <Link to="/outra">Ir para outra página</Link>
      <Link to="/form?aba=2">Outra aba</Link>
      <Link to="/form">Mesma página</Link>
    </form>
  )
}

const renderGuardedForm = () => {
  const router = createMemoryRouter(
    [
      {
        children: [
          { element: <EditForm />, path: "/form" },
          { element: <div>Outra página</div>, path: "/outra" },
        ],
        element: (
          <UnsavedChangesGuard>
            <Outlet />
          </UnsavedChangesGuard>
        ),
      },
    ],
    // The other page first, so the browser's back button has somewhere to go.
    { initialEntries: ["/outra", "/form"], initialIndex: 1 },
  )

  render(<RouterProvider router={router} />)

  return router
}

const typeName = () => fireEvent.change(screen.getByRole("textbox", { name: "Nome" }), { target: { value: "Escola" } })
const warningDialog = () => screen.queryByRole("dialog", { name: "Descartar alterações?" })

describe("UnsavedChangesGuard", () => {
  it("lets the user leave a form with nothing changed", async () => {
    renderGuardedForm()

    fireEvent.click(screen.getByRole("link", { name: "Ir para outra página" }))

    expect(await screen.findByText("Outra página")).toBeInTheDocument()
    expect(warningDialog()).not.toBeInTheDocument()
  })

  it("asks before leaving a form with unsaved changes, explaining they will be lost", async () => {
    renderGuardedForm()
    typeName()

    fireEvent.click(screen.getByRole("link", { name: "Ir para outra página" }))

    const dialog = await screen.findByRole("dialog", { name: "Descartar alterações?" })
    expect(dialog).toHaveTextContent("Se sair agora, elas serão perdidas.")
    expect(screen.queryByText("Outra página")).not.toBeInTheDocument()
  })

  it("also asks on the browser's back button", async () => {
    const router = renderGuardedForm()
    typeName()

    await act(() => router.navigate(-1))

    expect(await screen.findByRole("dialog", { name: "Descartar alterações?" })).toBeInTheDocument()
    expect(screen.getByRole("textbox", { name: "Nome" })).toHaveValue("Escola")
  })

  it("stays on the form, with what was typed, when the user keeps editing", async () => {
    renderGuardedForm()
    typeName()
    fireEvent.click(screen.getByRole("link", { name: "Ir para outra página" }))

    fireEvent.click(within(await screen.findByRole("dialog")).getByRole("button", { name: "Continuar editando" }))

    expect(warningDialog()).not.toBeInTheDocument()
    expect(screen.getByRole("textbox", { name: "Nome" })).toHaveValue("Escola")
  })

  it("leaves when the user confirms, dropping the changes", async () => {
    renderGuardedForm()
    typeName()
    fireEvent.click(screen.getByRole("link", { name: "Ir para outra página" }))

    fireEvent.click(within(await screen.findByRole("dialog")).getByRole("button", { name: "Sair sem salvar" }))

    expect(await screen.findByText("Outra página")).toBeInTheDocument()
  })

  it("counts a change of query as leaving, but not a navigation to the same address", async () => {
    renderGuardedForm()
    typeName()

    fireEvent.click(screen.getByRole("link", { name: "Mesma página" }))
    expect(warningDialog()).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole("link", { name: "Outra aba" }))
    expect(await screen.findByRole("dialog", { name: "Descartar alterações?" })).toBeInTheDocument()
  })

  it("stops asking once the changes are saved", async () => {
    renderGuardedForm()
    typeName()
    fireEvent.click(screen.getByRole("button", { name: "Salvar" }))

    fireEvent.click(screen.getByRole("link", { name: "Ir para outra página" }))

    expect(await screen.findByText("Outra página")).toBeInTheDocument()
  })

  it("asks the browser to confirm a reload or closing the tab only while there are unsaved changes", () => {
    renderGuardedForm()

    const cleanUnload = new Event("beforeunload", { cancelable: true })
    window.dispatchEvent(cleanUnload)
    expect(cleanUnload.defaultPrevented).toBe(false)

    typeName()

    const dirtyUnload = new Event("beforeunload", { cancelable: true })
    window.dispatchEvent(dirtyUnload)
    expect(dirtyUnload.defaultPrevented).toBe(true)
  })
})
