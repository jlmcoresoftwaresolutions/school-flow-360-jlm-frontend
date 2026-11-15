import { describe, expect, it } from "vitest"

import { summarizeUserAgent } from "./userAgent"

const chromeOnWindows =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36"
const edgeOnWindows = `${chromeOnWindows} Edg/131.0.0.0`
const safariOnIphone =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1"
const chromeOnAndroid =
  "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36"
const firefoxOnMac = "Mozilla/5.0 (Macintosh; Intel Mac OS X 14.5; rv:132.0) Gecko/20100101 Firefox/132.0"
const firefoxOnLinux = "Mozilla/5.0 (X11; Linux x86_64; rv:132.0) Gecko/20100101 Firefox/132.0"

describe("summarizeUserAgent", () => {
  it("names the browser and the system", () => {
    expect(summarizeUserAgent(chromeOnWindows)).toEqual({ browser: "Chrome", system: "Windows" })
    expect(summarizeUserAgent(firefoxOnMac)).toEqual({ browser: "Firefox", system: "macOS" })
    expect(summarizeUserAgent(firefoxOnLinux)).toEqual({ browser: "Firefox", system: "Linux" })
  })

  it("tells Edge apart from the Chrome it also mentions", () => {
    expect(summarizeUserAgent(edgeOnWindows)).toEqual({ browser: "Edge", system: "Windows" })
  })

  it("reads a phone's system before the desktop ones it also mentions", () => {
    expect(summarizeUserAgent(safariOnIphone)).toEqual({ browser: "Safari", system: "iOS" })
    expect(summarizeUserAgent(chromeOnAndroid)).toEqual({ browser: "Chrome", system: "Android" })
  })

  it("leaves out what it doesn't recognize", () => {
    expect(summarizeUserAgent("curl/8.4.0")).toEqual({ browser: undefined, system: undefined })
    expect(summarizeUserAgent(null)).toEqual({})
    expect(summarizeUserAgent("")).toEqual({})
  })
})
