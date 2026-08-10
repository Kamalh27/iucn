import { apiRequest } from "@/lib/api-client"

import type {
  AdminManagedUser,
  AdminManagedUserCreateInput,
  AdminManagedUserUpdateInput,
} from "./types"

export async function listManagedUsers(): Promise<AdminManagedUser[]> {
  return apiRequest<AdminManagedUser[]>("/admin/users", { withAuth: true })
}

export async function createManagedUser(payload: AdminManagedUserCreateInput): Promise<AdminManagedUser> {
  return apiRequest<AdminManagedUser>("/admin/users", {
    method: "POST",
    withAuth: true,
    body: payload,
  })
}

export async function updateManagedUser(payload: AdminManagedUserUpdateInput): Promise<AdminManagedUser> {
  const { id, ...body } = payload
  return apiRequest<AdminManagedUser>(`/admin/users/${id}`, {
    method: "PUT",
    withAuth: true,
    body,
  })
}

export async function deleteManagedUser(userId: string): Promise<void> {
  await apiRequest<{ message: string }>(`/admin/users/${userId}`, {
    method: "DELETE",
    withAuth: true,
  })
}
