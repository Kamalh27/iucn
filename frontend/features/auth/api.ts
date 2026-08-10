import { apiRequest } from "@/lib/api-client"
import { clearToken, saveToken } from "@/lib/auth-storage"

import type { AuthUser, LoginResponse } from "./types"

export async function loginAdmin(email: string, password: string): Promise<AuthUser> {
  const result = await apiRequest<LoginResponse>("/auth/admin/login", {
    method: "POST",
    body: { email, password },
  })
  saveToken(result.access_token)
  return result.user
}

export async function getCurrentUser(): Promise<AuthUser | null> {
  try {
    return await apiRequest<AuthUser>("/auth/me", { withAuth: true })
  } catch {
    return null
  }
}

export async function logout(): Promise<void> {
  try {
    await apiRequest<{ message: string }>("/auth/logout", {
      method: "POST",
      withAuth: true,
    })
  } finally {
    clearToken()
  }
}
