// What went wrong with a chosen logo, if anything.
export type FileProblem = "badRatio" | "tooLarge" | "tooSmall" | "unreadable" | "wrongType"

export type FileRules = {
  extensions: string[]
  maxAspectRatio: number
  maxBytes: number
  maxSide: number
  mimeTypes: string[]
  minSide: number
}

export type ImageSize = {
  height: number
  width: number
}

// Checks the file's type, as the backend does: the declared type AND the extension must be one of the
// allowed ones.
export const getFileTypeProblem = (file: File, rules: FileRules): FileProblem | null => {
  const name = file.name.toLowerCase()
  const hasAllowedType = rules.mimeTypes.includes(file.type) && rules.extensions.some((ext) => name.endsWith(ext))

  return hasAllowedType ? null : "wrongType"
}

// Checks the size in bytes (of the file that will be sent, after any shrinking).
export const getFileSizeProblem = (file: File, rules: FileRules): FileProblem | null =>
  file.size > rules.maxBytes ? "tooLarge" : null

// The image's size in pixels, read by the browser itself (so a file that isn't really an image fails).
export const readImageSize = (url: string) =>
  new Promise<ImageSize>((resolve, reject) => {
    const image = new Image()
    image.onload = () => resolve({ height: image.naturalHeight, width: image.naturalWidth })
    image.onerror = () => reject(new Error("Could not read the image"))
    image.src = url
  })

// What can't be fixed without distorting the image: a side under the minimum, or a ratio over the
// maximum (the longer side more than `maxAspectRatio` times the shorter). A side over the maximum is
// not a problem: the image is shrunk to fit (see fitWithin).
export const getImageProblem = (size: ImageSize, rules: FileRules): FileProblem | null => {
  const sides = [size.width, size.height]

  if (sides.some((side) => side < rules.minSide)) return "tooSmall"
  if (Math.max(...sides) / Math.min(...sides) > rules.maxAspectRatio) return "badRatio"

  return null
}

// The size the image takes to fit `maxSide` on both sides, keeping its proportion; the same size when
// it already fits.
export const fitWithin = (size: ImageSize, maxSide: number): ImageSize => {
  const scale = Math.min(1, maxSide / Math.max(size.width, size.height))

  return { height: Math.round(size.height * scale), width: Math.round(size.width * scale) }
}

// The image redrawn at `size`, as a file of the same name and type (a JPEG at a high quality).
export const shrinkImage = (file: File, url: string, size: ImageSize) =>
  new Promise<File>((resolve, reject) => {
    const image = new Image()

    image.onload = () => {
      const canvas = document.createElement("canvas")
      canvas.width = size.width
      canvas.height = size.height

      const context = canvas.getContext("2d")
      if (!context) {
        reject(new Error("Could not draw the image"))
        return
      }

      context.imageSmoothingQuality = "high"
      context.drawImage(image, 0, 0, size.width, size.height)
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(new Error("Could not shrink the image"))
            return
          }

          resolve(new File([blob], file.name, { type: file.type }))
        },
        file.type,
        0.92,
      )
    }
    image.onerror = () => reject(new Error("Could not read the image"))
    image.src = url
  })

// A data URL, so the preview can show a file before it is saved without anything to clean up.
export const readAsDataUrl = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(reader.error ?? new Error("Could not read the file"))
    reader.readAsDataURL(file)
  })
