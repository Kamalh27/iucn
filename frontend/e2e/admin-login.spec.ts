import { expect, test } from "@playwright/test"

const FAKE_ADMIN = { id: "1", email: "admin@local.dev", full_name: "Admin", role: "admin" as const }

test.describe("admin login flow", () => {
  test.beforeEach(async ({ page }) => {
    await page.route("**/layers/translations**", (route) => route.fulfill({ json: [] }))
    await page.route("**/layers", (route) => route.fulfill({ json: [] }))
    // Not logged in yet.
    await page.route("**/auth/me", (route) => route.fulfill({ status: 401, json: { detail: "Missing bearer token" } }))
  })

  test("shows an error for invalid credentials", async ({ page }) => {
    await page.route("**/auth/admin/login", (route) =>
      route.fulfill({ status: 401, json: { detail: "Invalid credentials" } }),
    )

    await page.goto("/admin/login")
    await page.getByPlaceholder("admin@local.dev").fill("admin@local.dev")
    await page.getByPlaceholder("admin123").fill("wrong-password")
    await page.getByRole("button", { name: /admin login/i }).click()

    await expect(page.getByText("Invalid credentials")).toBeVisible()
    await expect(page).toHaveURL(/\/admin\/login/)
  })

  test("redirects to the admin workspace on successful login", async ({ page }) => {
    await page.route("**/auth/admin/login", (route) =>
      route.fulfill({ json: { access_token: "fake-token", token_type: "bearer", user: FAKE_ADMIN } }),
    )
    // After a successful login the client re-checks the session and the
    // admin console fetches its own lists; stub the ones needed to avoid
    // console-level network errors blocking the assertion below.
    await page.route("**/auth/me", (route) => route.fulfill({ json: FAKE_ADMIN }))
    await page.route("http://localhost:8000/admin/**", (route) => route.fulfill({ json: [] }))

    await page.goto("/admin/login")
    await page.getByPlaceholder("admin@local.dev").fill("admin@local.dev")
    await page.getByPlaceholder("admin123").fill("correct-password")
    await page.getByRole("button", { name: /admin login/i }).click()

    await expect(page).toHaveURL(/\/admin$/)
  })

  test("an already-authenticated admin visiting /admin/login is bounced to /admin", async ({ page }) => {
    // `getCurrentUser()` only calls the API when a token is present in
    // localStorage, so an authenticated session has to be seeded that way.
    await page.addInitScript(() => window.localStorage.setItem("crva_access_token", "fake-token"))
    await page.route("**/auth/me", (route) => route.fulfill({ json: FAKE_ADMIN }))
    await page.route("http://localhost:8000/admin/**", (route) => route.fulfill({ json: [] }))

    await page.goto("/admin/login")
    await expect(page).toHaveURL(/\/admin$/)
  })
})
