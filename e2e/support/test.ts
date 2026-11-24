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
// the real backend through the dev server's proxy. /api/me answers `signedInUser`, a session renewal
// is refused, as for the made-up tokens the specs sign in with, and the school has published no
// branding (the login, the password recovery and the shell keep the default look). A spec overrides either with
// its own page.route (the last route added for a URL wins).
export const test = base.extend({
  page: async ({ page }, provide) => {
    await page.route("**/api/me", (route) => route.fulfill(apiAnswer(signedInUser)))
    // Behind the login the shell reads the published identity: nothing published, the product's look.
    await page.route("**/api/organizations/current/branding/published", (route) =>
      route.fulfill({
        body: JSON.stringify({ data: null, message: "Branding not published.", status: "Error" }),
        contentType: "application/json",
        status: 404,
      }),
    )
    await page.route("**/api/public/branding", (route) =>
      route.fulfill({
        body: JSON.stringify({ code: "BRANDING_NOT_PUBLISHED", data: null, message: "", status: "Error" }),
        contentType: "application/json",
        status: 404,
      }),
    )
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
