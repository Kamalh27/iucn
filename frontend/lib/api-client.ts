import { clearToken, getToken } from "@/lib/auth-storage"

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000"

type RequestOptions = {
  method?: string
  body?: unknown
  withAuth?: boolean
}

type ErrorDetail =
  | string
  | {
      msg?: string
      message?: string
      detail?: string
    }
  | Array<{
      msg?: string
      message?: string
      detail?: string
    }>

function normalizeErrorMessage(detail: ErrorDetail | undefined, status: number): string {
  if (typeof detail === "string" && detail.trim()) {
    return detail
  }

  if (Array.isArray(detail) && detail.length > 0) {
    const messages = detail
      .map((item) => item?.msg ?? item?.message ?? item?.detail)
      .filter((value): value is string => typeof value === "string" && value.trim().length > 0)
    if (messages.length > 0) {
      return messages.join("; ")
    }
  }

  if (detail && typeof detail === "object") {
    const message = detail.msg ?? detail.message ?? detail.detail
    if (typeof message === "string" && message.trim()) {
      return message
    }
  }

  return `Request failed: ${status}`
}

export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = "GET", body, withAuth = false } = options

  const headers: HeadersInit = {
    "Content-Type": "application/json",
  }

  if (withAuth) {
    const token = getToken()
    if (!token) {
      throw new Error("Missing auth token")
    }
    headers.Authorization = `Bearer ${token}`
  }

  const response = await fetch(`${API_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  })

  if (response.status === 401 && withAuth) {
    clearToken()
  }

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as
      | {
          detail?: ErrorDetail
        }
      | null
    throw new Error(normalizeErrorMessage(payload?.detail, response.status))
  }

  if (response.status === 204) {
    return undefined as T
  }

  return (await response.json()) as T
}
