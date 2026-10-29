// Whether two flat objects hold the same values under the same keys (compared with ===). Meant for a
// form's draft against what it started with, so nested values are compared by reference only.
export const isShallowEqual = <T extends object>(a: T, b: T): boolean => {
  const aKeys = Object.keys(a) as (keyof T)[]
  const bKeys = Object.keys(b) as (keyof T)[]

  return aKeys.length === bKeys.length && aKeys.every((key) => a[key] === b[key])
}
