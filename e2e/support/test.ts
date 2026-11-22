import { expect, test as base } from "@playwright/test"

export { expect }
export type { Page } from "@playwright/test"

// Who signs in in every spec unless it says otherwise: an Admin, so every page and menu entry is open.
export const signedInUser = {
  admin: true,
  assignments: [],
  email: "diretor@schoolflow360.com.br",
  fullName: "João Silva",
  nickname: "joao.silva",
  roles: ["ADMIN"],
  userId: 1,
}

export const apiAnswer = (data: unknown) => ({
  body: JSON.stringify({ data, message: "", status: "Success", tenantId: "schoolflow_demo" }),
  contentType: "application/json",
})

// The specs' `test`: a page where the backend's session routes are already mocked, so nothing reaches
// the real backend through the dev server's proxy. /api/me answers `signedInUser`, and a session
// renewal is refused, as for the made-up tokens the specs sign in with. A spec overrides either with
// its own page.route (the last route added for a URL wins).
export const test = base.extend({
  page: async ({ page }, provide) => {
    await page.route("**/api/me", (route) => route.fulfill(apiAnswer(signedInUser)))
    await page.route("**/api/auth/refresh", (route) =>
      route.fulfill({
        body: JSON.stringify({ data: null, message: "Refresh token is invalid.", status: "Error" }),
        contentType: "application/json",
        status: 401,
      }),
    )

    await provide(page)
  },
})
