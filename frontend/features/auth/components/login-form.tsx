"use client"

import { FormEvent, useState } from "react"
import { Lock, LogIn, Mail } from "lucide-react"

import { loginAdmin } from "@/features/auth/api"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

type LoginFormProps = {
  onSuccess: () => void
}

export function LoginForm({ onSuccess }: LoginFormProps) {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setLoading(true)
    setError("")
    try {
      await loginAdmin(email.trim(), password)
      onSuccess()
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Unable to login")
    } finally {
      setLoading(false)
    }
  }

  return (
    <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
      <label className="block text-sm">
        <span className="mb-1.5 block text-slate-800 dark:text-slate-200">Admin Email</span>
        <div className="group flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-2 py-1.5 transition focus-within:border-[var(--adpc-red)] focus-within:ring-2 focus-within:ring-[var(--adpc-red)]/20 dark:border-zinc-700 dark:bg-zinc-900 dark:focus-within:border-[var(--adpc-red)] dark:focus-within:ring-[var(--adpc-red)]/25">
          <Mail className="h-4 w-4 shrink-0 text-slate-500 transition group-focus-within:text-[var(--adpc-red)] dark:text-slate-400" />
          <Input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="crva-auth-input h-9 border-0 bg-transparent px-0 py-0 shadow-none focus-visible:ring-0"
              placeholder="admin@local.dev"
            required
          />
        </div>
      </label>

      <label className="block text-sm">
        <span className="mb-1.5 block text-slate-800 dark:text-slate-200">Password</span>
        <div className="group flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-2 py-1.5 transition focus-within:border-[var(--adpc-red)] focus-within:ring-2 focus-within:ring-[var(--adpc-red)]/20 dark:border-zinc-700 dark:bg-zinc-900 dark:focus-within:border-[var(--adpc-red)] dark:focus-within:ring-[var(--adpc-red)]/25">
          <Lock className="h-4 w-4 shrink-0 text-slate-500 transition group-focus-within:text-[var(--adpc-red)] dark:text-slate-400" />
          <Input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="crva-auth-input h-9 border-0 bg-transparent px-0 py-0 shadow-none focus-visible:ring-0"
            placeholder="admin123"
            required
          />
        </div>
      </label>

      {error ? <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-200">{error}</p> : null}

      <Button type="submit" disabled={loading} className="w-full bg-[var(--adpc-red)] hover:bg-[var(--adpc-red-dark)]">
        <span className="inline-flex items-center gap-2">
          <LogIn className="h-4 w-4" />
          {loading ? "Signing in..." : "Admin Login"}
        </span>
      </Button>
    </form>
  )
}
