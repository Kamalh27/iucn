import type { ReactNode } from "react"
import { cn } from "@/lib/utils"

export function AdminCard({ children, className }: { children: ReactNode; className?: string }) {
  return <section className={cn("rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900", className)}>{children}</section>
}

export function AdminFeedback({ error, message }: { error?: string; message?: string }) {
  if (error) return <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-200">{error}</p>
  if (message) return <p className="mt-4 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-200">{message}</p>
  return null
}

export function StatusPill({ active }: { active: boolean }) {
  return <span className={cn("rounded-full px-2 py-1 text-xs", active ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500")}>{active ? "Active" : "Inactive"}</span>
}
