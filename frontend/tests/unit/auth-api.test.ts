import { beforeEach, describe, expect, it, vi } from "vitest"

const apiRequestMock = vi.hoisted(() => vi.fn())

vi.mock("@/lib/api-client", () => ({
  apiRequest: apiRequestMock,
}))

import { getCurrentUser, loginAdmin, logout } from "@/features/auth/api"
import { getToken } from "@/lib/auth-storage"

const USER = { id: "1", email: "admin@local.dev", full_name: "Admin", role: "admin" as const }

describe("auth api", () => {
  beforeEach(() => {
    apiRequestMock.mockReset()
    localStorage.clear()
  })

  it("loginAdmin saves the returned token and resolves the user", async () => {
    apiRequestMock.mockResolvedValue({ access_token: "tok-123", token_type: "bearer", user: USER })

    const result = await loginAdmin("admin@local.dev", "pass")

    expect(result).toEqual(USER)
    expect(getToken()).toBe("tok-123")
    expect(apiRequestMock).toHaveBeenCalledWith("/auth/admin/login", {
      method: "POST",
      body: { email: "admin@local.dev", password: "pass" },
    })
  })

  it("getCurrentUser returns null instead of throwing when unauthenticated", async () => {
    apiRequestMock.mockRejectedValue(new Error("Missing auth token"))

    await expect(getCurrentUser()).resolves.toBeNull()
  })

  it("getCurrentUser returns the user on success", async () => {
    apiRequestMock.mockResolvedValue(USER)

    await expect(getCurrentUser()).resolves.toEqual(USER)
  })

  it("logout clears the local token even if the API call fails, but still surfaces the error", async () => {
    localStorage.setItem("crva_access_token", "tok-123")
    apiRequestMock.mockRejectedValue(new Error("network error"))

    await expect(logout()).rejects.toThrow("network error")

    expect(getToken()).toBeNull()
  })

  it("logout clears the token after a successful API call", async () => {
    localStorage.setItem("crva_access_token", "tok-123")
    apiRequestMock.mockResolvedValue({ message: "Logged out" })

    await logout()

    expect(getToken()).toBeNull()
  })
})
