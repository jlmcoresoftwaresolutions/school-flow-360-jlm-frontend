import libraryPhoto from "@/assets/images/login-library.webp"
import { paths } from "@/routes/paths"

// The screens before signing in, the ones that show the photoBackdrop.
const preLoginPaths = [
  paths.acceptInvitation,
  paths.changePassword,
  paths.contractAcceptance,
  paths.forgotPassword,
  paths.login,
  paths.resetPassword,
  paths.schoolInactive,
  paths.schoolNotFound,
  paths.unknownSchool,
]

// Starts downloading the library photo as soon as the app boots on a screen before signing in, instead
// of when the page's styles are injected (a background image is only found then), so it shows together
// with the card. Any other page never asks for it.
export const preloadPhotoBackdrop = () => {
  if (!preLoginPaths.includes(window.location.pathname)) return

  const link = document.createElement("link")
  link.as = "image"
  link.href = libraryPhoto
  link.rel = "preload"
  link.type = "image/webp"
  link.setAttribute("fetchpriority", "high")
  document.head.append(link)
}
