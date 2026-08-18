"use client"

import { ShieldCheck, SunMoon } from "lucide-react"
import { useEffect } from "react"
import { useRouter } from "next/navigation"

import { SiteFooter } from "@/components/layout/site-footer"
import { getCurrentUser } from "@/features/auth/api"
import { LoginForm } from "@/features/auth/components/login-form"
import { ThemeToggle } from "@/components/layout/theme-toggle"

export default function AdminLoginPage() {
  const router = useRouter()

  useEffect(() => {
    void getCurrentUser().then((user) => {
      if (user?.role === "admin") {
        router.replace("/admin")
      }
    })
  }, [router])

  return (
    <main className="flex min-h-screen flex-col bg-[radial-gradient(900px_500px_at_10%_-10%,var(--adpc-red-soft),transparent_65%),#f8fafc] px-4 dark:bg-[radial-gradient(900px_500px_at_10%_-10%,#2a1313,transparent_65%),#09090b]">
      <div className="flex justify-end py-5"><ThemeToggle /></div>
      <section className="flex flex-1 items-center justify-center">
        <div className="w-full max-w-md rounded-2xl border border-red-200 bg-white p-6 shadow-lg dark:border-zinc-800 dark:bg-zinc-900">
          <div className="flex items-center justify-between gap-2 text-[var(--adpc-red)]">
            <div className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5" />
            <span className="text-xs font-semibold uppercase tracking-[0.2em]">CRVA Admin</span>
            </div><SunMoon className="h-4 w-4 opacity-60" />
          </div>
          <h1 className="mt-3 text-2xl font-semibold text-slate-900 dark:text-slate-100">Admin Sign In</h1>
          <p className="mt-2 text-sm text-slate-700 dark:text-slate-300">
            Sign in with the admin credentials configured on the backend server.
          </p>
          <LoginForm onSuccess={() => router.push("/admin")} />
        </div>
      </section>

      <SiteFooter className="-mx-4" />
    </main>
  )
}
