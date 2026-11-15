// A browser's user agent, reduced to what a person recognizes: the browser and the system, by their
// usual names ("Chrome", "Windows"). Either is undefined when the text doesn't say (or there is none).
export type UserAgentSummary = {
  browser?: string
  system?: string
}

// Checked in order: Edge and Opera also say "Chrome", and Chrome also says "Safari".
const browsers: [RegExp, string][] = [
  [/Edg(e|A|iOS)?\//, "Edge"],
  [/OPR\/|Opera/, "Opera"],
  [/SamsungBrowser\//, "Samsung Internet"],
  [/Firefox\/|FxiOS\//, "Firefox"],
  [/Chrome\/|CriOS\//, "Chrome"],
  [/Safari\//, "Safari"],
]

// iOS before macOS (an iPad can say "Mac OS X"), Android before Linux (Android says "Linux").
const systems: [RegExp, string][] = [
  [/iPhone|iPad|iPod/, "iOS"],
  [/Android/, "Android"],
  [/Windows/, "Windows"],
  [/Mac OS X|Macintosh/, "macOS"],
  [/CrOS/, "ChromeOS"],
  [/Linux/, "Linux"],
]

const findName = (text: string, patterns: [RegExp, string][]) => patterns.find(([pattern]) => pattern.test(text))?.[1]

export const summarizeUserAgent = (userAgent?: string | null): UserAgentSummary => {
  if (!userAgent) return {}

  return { browser: findName(userAgent, browsers), system: findName(userAgent, systems) }
}
