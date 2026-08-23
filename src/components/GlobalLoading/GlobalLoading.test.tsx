import { act, render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { startLoading, stopLoading } from "@/utils/loadingStore"

import { GlobalLoading } from "./GlobalLoading"

describe("GlobalLoading", () => {
  it("renders nothing when there is no request in flight", () => {
    render(<GlobalLoading />)

    expect(screen.queryByRole("status")).not.toBeInTheDocument()
  })

  it("renders the Loading overlay while a request is in flight", () => {
    render(<GlobalLoading />)

    act(() => startLoading())
    expect(screen.getByRole("status")).toBeInTheDocument()

    act(() => stopLoading())
    expect(screen.queryByRole("status")).not.toBeInTheDocument()
  })

  it("stays visible until every overlapping request finishes", () => {
    render(<GlobalLoading />)

    act(() => {
      startLoading()
      startLoading()
    })
    act(() => stopLoading())
    expect(screen.getByRole("status")).toBeInTheDocument()

    act(() => stopLoading())
    expect(screen.queryByRole("status")).not.toBeInTheDocument()
  })
})
