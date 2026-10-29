import { act, render, screen } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { markBackendResponse, resetBackendActivity } from "@/utils/backendActivity"
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

  it("shows the overlay with no request in flight when visible is set", () => {
    render(<GlobalLoading visible />)

    expect(screen.getByRole("status", { name: "Carregando..." })).toBeInTheDocument()
  })

  describe("on a long wait", () => {
    const slowServerMessage = "Conectando ao servidor. Isso pode levar até um minuto."

    beforeEach(() => {
      vi.useFakeTimers()
      resetBackendActivity()
    })

    afterEach(() => {
      act(() => stopLoading())
      vi.useRealTimers()
    })

    it("blames the backend waking up after 5 seconds, not before, while it hasn't answered yet", () => {
      render(<GlobalLoading />)

      act(() => startLoading())
      act(() => vi.advanceTimersByTime(4999))
      expect(screen.getByRole("status").textContent).toBe("")

      act(() => vi.advanceTimersByTime(1))
      expect(screen.getByRole("status")).toHaveTextContent(slowServerMessage)
    })

    it("shows a neutral message instead when the backend answered recently", () => {
      markBackendResponse()
      render(<GlobalLoading />)

      act(() => startLoading())
      act(() => vi.advanceTimersByTime(5000))

      expect(screen.getByRole("status")).toHaveTextContent(
        "Isso está levando mais tempo que o normal. Aguarde um instante.",
      )
      expect(screen.getByRole("status")).not.toHaveTextContent(slowServerMessage)
    })

    it("starts counting again from zero on the next wait", () => {
      render(<GlobalLoading />)

      act(() => startLoading())
      act(() => vi.advanceTimersByTime(5000))
      act(() => stopLoading())

      act(() => startLoading())
      act(() => vi.advanceTimersByTime(1000))
      expect(screen.getByRole("status").textContent).toBe("")
    })
  })
})
