"use client"

import { FormEvent, useEffect, useMemo, useState } from "react"
import { Pencil, Save, Shield, Trash2, UserPlus, X } from "lucide-react"

import {
  createManagedUser,
  deleteManagedUser,
  listManagedUsers,
  updateManagedUser,
} from "@/features/admin-users/api"
import type { AdminManagedUser, AdminManagedUserRole } from "@/features/admin-users/types"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"

type FormState = {
  id: string
  full_name: string
  email: string
  password: string
  role: AdminManagedUserRole
  is_active: boolean
}

const emptyForm: FormState = {
  id: "",
  full_name: "",
  email: "",
  password: "",
  role: "user",
  is_active: true,
}

export function AdminUserManagement() {
  const [users, setUsers] = useState<AdminManagedUser[]>([])
  const [form, setForm] = useState<FormState>(emptyForm)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const [message, setMessage] = useState("")

  const isEditing = form.id.length > 0
  const activeAdminCount = useMemo(
    () => users.filter((user) => user.role === "admin" && user.is_active).length,
    [users]
  )

  useEffect(() => {
    let mounted = true
    void listManagedUsers()
      .then((result) => {
        if (!mounted) return
        setUsers(result)
      })
      .catch((loadError) => {
        if (!mounted) return
        setError(loadError instanceof Error ? loadError.message : "Unable to load users")
      })
      .finally(() => {
        if (!mounted) return
        setLoading(false)
      })

    return () => {
      mounted = false
    }
  }, [])

  function setFormValue<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((current) => ({ ...current, [key]: value }))
  }

  function resetForm() {
    setForm(emptyForm)
  }

  function handleEdit(user: AdminManagedUser) {
    setError("")
    setMessage("")
    setForm({
      id: user.id,
      full_name: user.full_name,
      email: user.email,
      password: "",
      role: user.role,
      is_active: user.is_active,
    })
  }

  async function handleDelete(user: AdminManagedUser) {
    if (user.role === "admin" && user.is_active && activeAdminCount <= 1) {
      setError("At least one active admin must remain")
      setMessage("")
      return
    }

    const confirmed = window.confirm(`Delete ${user.full_name || user.email}?`)
    if (!confirmed) return

    try {
      await deleteManagedUser(user.id)
      setUsers((current) => current.filter((item) => item.id !== user.id))
      setMessage("User deleted")
      setError("")
      if (form.id === user.id) {
        resetForm()
      }
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Failed to delete user")
      setMessage("")
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSaving(true)
    setError("")
    setMessage("")

    const full_name = form.full_name.trim()
    const email = form.email.trim().toLowerCase()

    if (!full_name || !email) {
      setSaving(false)
      setError("Full name and email are required")
      return
    }

    if (!isEditing && !form.password) {
      setSaving(false)
      setError("Password is required for a new user")
      return
    }

    try {
      if (isEditing) {
        const updated = await updateManagedUser({
          id: form.id,
          full_name,
          email,
          role: form.role,
          is_active: form.is_active,
          password: form.password || undefined,
        })
        setUsers((current) => current.map((user) => (user.id === updated.id ? updated : user)))
        setMessage("User updated")
      } else {
        const created = await createManagedUser({
          full_name,
          email,
          role: form.role,
          password: form.password,
        })
        setUsers((current) => [created, ...current])
        setMessage("User added")
      }

      resetForm()
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Could not save user")
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className="mt-6 grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
      <div className="rounded-2xl border border-slate-200 p-5 shadow-sm dark:border-zinc-800">
        <div className="mb-4 flex items-center gap-2">
          <Shield className="h-4 w-4 text-[var(--adpc-red)]" />
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Users</h2>
        </div>

        {loading ? <p className="text-sm text-slate-600 dark:text-slate-300">Loading users...</p> : null}

        {!loading && users.length === 0 ? (
          <p className="text-sm text-slate-600 dark:text-slate-300">No users yet.</p>
        ) : null}

        <div className="space-y-3">
          {users.map((user) => {
            const isLastActiveAdmin = user.role === "admin" && user.is_active && activeAdminCount <= 1
            return (
              <div
                key={user.id}
                className="flex flex-col gap-3 rounded-xl border border-slate-200 p-3 dark:border-zinc-800 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{user.full_name}</p>
                  <p className="text-xs text-slate-600 dark:text-slate-400">{user.email}</p>
                  <div className="mt-1 flex items-center gap-2 text-xs">
                    <span className="rounded-full border border-slate-300 px-2 py-0.5 uppercase dark:border-zinc-700">
                      {user.role}
                    </span>
                    <span className={user.is_active ? "text-emerald-600" : "text-slate-500"}>
                      {user.is_active ? "Active" : "Inactive"}
                    </span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button type="button" variant="secondary" size="sm" onClick={() => handleEdit(user)}>
                    <Pencil className="h-3.5 w-3.5" />
                    Edit
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => handleDelete(user)}
                    disabled={isLastActiveAdmin}
                    className="bg-[var(--adpc-red)] hover:bg-[var(--adpc-red-dark)]"
                    title={isLastActiveAdmin ? "At least one active admin must remain" : "Delete user"}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Delete
                  </Button>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 p-5 shadow-sm dark:border-zinc-800">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
            {isEditing ? "Edit User" : "Add User"}
          </h2>
          <UserPlus className="h-4 w-4 text-[var(--adpc-red)]" />
        </div>

        <form className="space-y-4" onSubmit={handleSubmit}>
          <label className="block space-y-1.5 text-sm">
            <span className="text-slate-700 dark:text-slate-300">Full Name</span>
            <Input
              value={form.full_name}
              onChange={(event) => setFormValue("full_name", event.target.value)}
              placeholder="User name"
              required
            />
          </label>

          <label className="block space-y-1.5 text-sm">
            <span className="text-slate-700 dark:text-slate-300">Email</span>
            <Input
              type="email"
              value={form.email}
              onChange={(event) => setFormValue("email", event.target.value)}
              placeholder="user@local.dev"
              required
            />
          </label>

          <label className="block space-y-1.5 text-sm">
            <span className="text-slate-700 dark:text-slate-300">
              Password {isEditing ? "(optional)" : ""}
            </span>
            <Input
              type="password"
              value={form.password}
              onChange={(event) => setFormValue("password", event.target.value)}
              placeholder={isEditing ? "Leave blank to keep current password" : "Minimum 8 characters"}
              required={!isEditing}
            />
          </label>

          <label className="block space-y-1.5 text-sm">
            <span className="text-slate-700 dark:text-slate-300">Role</span>
            <select
              value={form.role}
              onChange={(event) => setFormValue("role", event.target.value as AdminManagedUserRole)}
              className="h-10 w-full rounded-md border border-slate-300 bg-transparent px-3 text-sm outline-none focus-visible:border-[var(--adpc-red)] dark:border-zinc-700"
            >
              <option value="user">User</option>
              <option value="admin">Admin</option>
            </select>
          </label>

          <label className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2 dark:border-zinc-800">
            <span className="text-sm text-slate-700 dark:text-slate-300">Active</span>
            <Switch checked={form.is_active} onCheckedChange={(checked) => setFormValue("is_active", checked)} />
          </label>

          {error ? <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-200">{error}</p> : null}
          {message ? (
            <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-200">
              {message}
            </p>
          ) : null}

          <div className="flex gap-2">
            <Button type="submit" disabled={saving} className="flex-1 bg-[var(--adpc-red)] hover:bg-[var(--adpc-red-dark)]">
              <Save className="h-4 w-4" />
              {saving ? "Saving..." : isEditing ? "Update User" : "Add User"}
            </Button>
            {isEditing ? (
              <Button type="button" variant="secondary" onClick={resetForm}>
                <X className="h-4 w-4" />
                Cancel
              </Button>
            ) : null}
          </div>
        </form>
      </div>
    </section>
  )
}
