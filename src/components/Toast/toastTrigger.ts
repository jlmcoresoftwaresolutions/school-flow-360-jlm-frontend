// Co-located with Toast rather than living in src/utils/, the same call made for useTooltip next
// to Tooltip: it's tightly coupled to it. react-toastify/unstyled keeps its own store internal to
// that entry point, separate from the plain "react-toastify" one - a toast() call made through the
// wrong entry point would never reach a <Toast /> mounted through this one. Re-exporting it here
// gives the app a single import path that's guaranteed to match.
//
// Named toastTrigger.ts rather than toast.ts: this folder's filesystem is case-insensitive
// (Windows/NTFS), so a file differing from Toast.tsx only by case is unsafe - module resolution
// can silently pick the wrong one.
export { toast } from "react-toastify/unstyled"
