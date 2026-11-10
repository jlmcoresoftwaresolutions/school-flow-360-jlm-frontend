// What went wrong with a chosen identity file, if anything.
export type FileProblem = "tooLarge" | "wrongType"

export type FileRules = {
  extensions: string[]
  maxBytes: number
  mimeTypes: string[]
}

// Checks a file against the visual spec's limits. The extension counts as well as the type, since
// some systems report an .ico or .svg with an empty or generic type.
export const getFileProblem = (file: File, rules: FileRules): FileProblem | null => {
  const name = file.name.toLowerCase()
  const hasAllowedType = rules.mimeTypes.includes(file.type) || rules.extensions.some((ext) => name.endsWith(ext))

  if (!hasAllowedType) return "wrongType"
  if (file.size > rules.maxBytes) return "tooLarge"

  return null
}

// A data URL, so the preview can show a file before it is saved without anything to clean up.
export const readAsDataUrl = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(reader.error ?? new Error("Could not read the file"))
    reader.readAsDataURL(file)
  })
