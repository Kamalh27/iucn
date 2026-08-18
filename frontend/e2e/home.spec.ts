import { expect, test } from "@playwright/test"

test.describe("home page", () => {
  test.beforeEach(async ({ page }) => {
    // The home page (and every page under this app) calls the public
    // translations/layers endpoints on load; stub them so the e2e suite
    // does not depend on a live backend.
    await page.route("**/layers/translations**", (route) =>
      route.fulfill({ json: [] }),
    )
    await page.route("**/layers", (route) => route.fulfill({ json: [] }))
  })

  test("loads and offers navigation to the map and admin areas", async ({ page }) => {
    await page.goto("/")
    await expect(page).toHaveTitle(/.+/)
    await expect(page.getByRole("link", { name: /open map/i })).toBeVisible()
    await expect(page.getByRole("link", { name: /admin login/i })).toBeVisible()
  })

  test("navigates to the admin login page", async ({ page }) => {
    await page.goto("/")
    await page.getByRole("link", { name: /admin login/i }).click()
    await expect(page).toHaveURL(/\/admin\/login/)
  })
})
