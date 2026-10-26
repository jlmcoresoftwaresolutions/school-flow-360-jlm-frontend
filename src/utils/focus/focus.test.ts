import { describe, expect, it } from "vitest"

import { getFocusableElements } from "./focus"

const build = (html: string) => {
  const container = document.createElement("div")
  container.innerHTML = html

  return container
}

describe("getFocusableElements", () => {
  it("returns buttons, links and form fields in DOM order", () => {
    const container = build(`
      <button id="a">A</button>
      <a id="b" href="/x">B</a>
      <input id="c" />
      <select id="d"></select>
      <textarea id="e"></textarea>
    `)

    expect(getFocusableElements(container).map((element) => element.id)).toEqual(["a", "b", "c", "d", "e"])
  })

  it("skips disabled controls and hidden inputs", () => {
    const container = build(`
      <button id="a" disabled>A</button>
      <input id="b" disabled />
      <input id="c" type="hidden" />
      <button id="d">D</button>
    `)

    expect(getFocusableElements(container).map((element) => element.id)).toEqual(["d"])
  })

  it("skips anchors without href and elements removed from the tab order", () => {
    const container = build(`
      <a id="a">A</a>
      <div id="b" tabindex="-1"></div>
      <div id="c" tabindex="0"></div>
    `)

    expect(getFocusableElements(container).map((element) => element.id)).toEqual(["c"])
  })

  it("returns an empty list when nothing is focusable", () => {
    expect(getFocusableElements(build("<p>texto</p>"))).toEqual([])
  })
})
