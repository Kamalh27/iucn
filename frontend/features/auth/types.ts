export type Role = "admin" | "user"

export type AuthUser = {
  id: string
  email: string
  full_name: string
  role: Role
}

export type LoginResponse = {
  access_token: string
  token_type: string
  user: AuthUser
}
