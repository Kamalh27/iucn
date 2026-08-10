export type AdminManagedUserRole = "admin" | "user"

export type AdminManagedUser = {
  id: string
  email: string
  full_name: string
  role: AdminManagedUserRole
  is_active: boolean
}

export type AdminManagedUserCreateInput = {
  email: string
  full_name: string
  password: string
  role: AdminManagedUserRole
}

export type AdminManagedUserUpdateInput = {
  id: string
  email?: string
  full_name?: string
  password?: string
  role?: AdminManagedUserRole
  is_active?: boolean
}
