import { describe, expect, it } from "vitest"

import { getIsLoading, startLoading, stopLoading, subscribeToLoading } from "./loadingStore"

describe("loadingStore", () => {
  it("is not loading until a request starts", () => {
    expect(getIsLoading()).toBe(false)

    startLoading()
    expect(getIsLoading()).toBe(true)

    stopLoading()
  })

  it("stays loading until every overlapping request has stopped", () => {
    startLoading()
    startLoading()
    expect(getIsLoading()).toBe(true)

    stopLoading()
    expect(getIsLoading()).toBe(true)

    stopLoading()
    expect(getIsLoading()).toBe(false)
  })

  it("never goes below zero when stopLoading is called more than startLoading", () => {
    expect(getIsLoading()).toBe(false)

    stopLoading()
    stopLoading()
    expect(getIsLoading()).toBe(false)

    startLoading()
    expect(getIsLoading()).toBe(true)

    stopLoading()
  })

  it("notifies subscribers on every start/stop, and stops notifying after unsubscribing", () => {
    const calls: boolean[] = []
    const unsubscribe = subscribeToLoading(() => calls.push(getIsLoading()))

    startLoading()
    stopLoading()
    unsubscribe()
    startLoading()
    stopLoading()

    expect(calls).toEqual([true, false])
  })
})
