export const zIndex = {
  base: 0,
  dropdown: 1000,
  sticky: 1100,
  fixed: 1200,
  overlay: 1300,
  modal: 1400,
  popover: 1500,
  tooltip: 1600,
  toast: 1700,
  // The global loading overlay: above everything, a modal and its menus included, since nothing on
  // screen should be usable while a request is pending.
  loading: 1800,
}

export type ZIndexType = typeof zIndex
