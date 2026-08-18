import { beforeEach, describe, expect, it } from "vitest"

import { clearToken, getToken, saveToken } from "@/lib/auth-storage"

describe("auth-storage", () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it("returns null when nothing is stored", () => {
    expect(getToken()).toBeNull()
  })

  it("persists a token to localStorage", () => {
    saveToken("abc.def")
    expect(getToken()).toBe("abc.def")
    expect(localStorage.getItem("crva_access_token")).toBe("abc.def")
  })

  it("clears a stored token", () => {
    saveToken("abc.def")
    clearToken()
    expect(getToken()).toBeNull()
  })

  it("overwrites a previously stored token", () => {
    saveToken("first-token")
    saveToken("second-token")
    expect(getToken()).toBe("second-token")
  })
})
