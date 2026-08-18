import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { apiRequest } from "@/lib/api-client"
import * as authStorage from "@/lib/auth-storage"

function jsonResponse(body: unknown, init: ResponseInit = {}) {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "Content-Type": "application/json" },
    ...init,
  })
}

describe("apiRequest", () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    localStorage.clear()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it("performs a GET request without auth by default", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ ok: true }))
    vi.stubGlobal("fetch", fetchMock)

    const result = await apiRequest<{ ok: boolean }>("/health")

    expect(result).toEqual({ ok: true })
    const [url, options] = fetchMock.mock.calls[0]
    expect(url).toBe("http://localhost:8000/health")
    expect(options.method).toBe("GET")
    expect(options.headers.Authorization).toBeUndefined()
  })

  it("attaches a bearer token when withAuth is true and a token exists", async () => {
    authStorage.saveToken("my-token")
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ ok: true }))
    vi.stubGlobal("fetch", fetchMock)

    await apiRequest("/auth/me", { withAuth: true })

    const [, options] = fetchMock.mock.calls[0]
    expect(options.headers.Authorization).toBe("Bearer my-token")
  })

  it("throws immediately when withAuth is true but no token is stored", async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal("fetch", fetchMock)

    await expect(apiRequest("/auth/me", { withAuth: true })).rejects.toThrow("Missing auth token")
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it("clears the stored token on a 401 while authenticated", async () => {
    authStorage.saveToken("stale-token")
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ detail: "Invalid token" }), { status: 401 }),
    )
    vi.stubGlobal("fetch", fetchMock)

    await expect(apiRequest("/auth/me", { withAuth: true })).rejects.toThrow("Invalid token")
    expect(authStorage.getToken()).toBeNull()
  })

  it("serializes a plain object body as JSON with a JSON content-type", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ ok: true }))
    vi.stubGlobal("fetch", fetchMock)

    await apiRequest("/auth/login", { method: "POST", body: { email: "a@b.com", password: "x" } })

    const [, options] = fetchMock.mock.calls[0]
    expect(options.headers["Content-Type"]).toBe("application/json")
    expect(options.body).toBe(JSON.stringify({ email: "a@b.com", password: "x" }))
  })

  it("sends FormData bodies as-is without a JSON content-type", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ ok: true }))
    vi.stubGlobal("fetch", fetchMock)

    const form = new FormData()
    form.append("title", "Report")
    await apiRequest("/admin/documents", { method: "POST", body: form })

    const [, options] = fetchMock.mock.calls[0]
    expect(options.body).toBe(form)
    expect(options.headers["Content-Type"]).toBeUndefined()
  })

  it("normalizes a string error detail", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ detail: "Invalid credentials" }), { status: 401 }),
    )
    vi.stubGlobal("fetch", fetchMock)

    await expect(apiRequest("/auth/login", { method: "POST", body: {} })).rejects.toThrow("Invalid credentials")
  })

  it("normalizes FastAPI's validation-error array detail", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({ detail: [{ msg: "field required", loc: ["body", "email"] }] }),
        { status: 422 },
      ),
    )
    vi.stubGlobal("fetch", fetchMock)

    await expect(apiRequest("/auth/login", { method: "POST", body: {} })).rejects.toThrow("field required")
  })

  it("falls back to a generic message when detail is missing or unparseable", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response("not json", { status: 500 }))
    vi.stubGlobal("fetch", fetchMock)

    await expect(apiRequest("/auth/login", { method: "POST", body: {} })).rejects.toThrow("Request failed: 500")
  })

  it("returns undefined for a 204 No Content response", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 204 }))
    vi.stubGlobal("fetch", fetchMock)

    const result = await apiRequest("/admin/documents/1")
    expect(result).toBeUndefined()
  })
})
