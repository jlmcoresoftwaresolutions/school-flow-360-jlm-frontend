// Joins element ids into a space-separated list for an IDREF attribute (aria-describedby,
// aria-labelledby, ...), skipping missing ones; undefined when nothing is left, so the attribute is
// left out instead of rendered empty.
export const joinIds = (...ids: (false | null | string | undefined)[]) => ids.filter(Boolean).join(" ") || undefined

// The first letter of the first and of the last word of a name, uppercased ("Maria da Silva" -> "MS").
// A single-word name gives one letter and a blank one gives an empty string.
export const getInitials = (name: string) => {
  const words = name.trim().split(/\s+/).filter(Boolean)

  if (words.length === 0) return ""
  if (words.length === 1) return words[0].charAt(0).toLocaleUpperCase()

  return (words[0].charAt(0) + words[words.length - 1].charAt(0)).toLocaleUpperCase()
}
