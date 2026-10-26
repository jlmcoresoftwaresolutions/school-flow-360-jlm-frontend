const focusableSelector = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled]):not([type='hidden'])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  "[tabindex]:not([tabindex='-1'])",
].join(", ")

// Everything inside the container that the keyboard can reach with Tab, in DOM order. It doesn't
// check visibility: callers use it on containers that are fully rendered when they ask.
export const getFocusableElements = (container: HTMLElement): HTMLElement[] =>
  Array.from(container.querySelectorAll<HTMLElement>(focusableSelector))
