"use client"

import Link from "next/link"
import { Shield, LogOut, Map } from "lucide-react"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"

import { ThemeToggle } from "@/components/layout/theme-toggle"
import { SiteFooter } from "@/components/layout/site-footer"
import { getCurrentUser, logout } from "@/features/auth/api"
import type { AuthUser } from "@/features/auth/types"
import { Button } from "@/components/ui/button"
import { AdminConsoleSections } from "@/features/admin-console/components/admin-console-sections"
import { LanguageSwitcher } from "@/components/i18n/language-switcher"
import { useLanguage } from "@/components/i18n/language-provider"

export default function AdminPage() {
  const router = useRouter()
  const [user, setUser] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(true)
  const { t } = useLanguage()

  useEffect(() => {
    let mounted = true
    void getCurrentUser().then((sessionUser) => {
      if (!mounted) return

      if (!sessionUser || sessionUser.role !== "admin") {
        setLoading(false)
        router.replace("/admin/login")
        return
      }

      setUser(sessionUser)
      setLoading(false)
    })

    return () => {
      mounted = false
    }
  }, [router])

  async function handleLogout() {
    await logout()
    router.push("/admin/login")
  }

  if (loading) {
    return <main className="grid min-h-screen place-items-center">Checking admin session...</main>
  }

  if (!user) {
    return <main className="grid min-h-screen place-items-center">Redirecting...</main>
  }

  return (
    <main className="flex min-h-screen flex-col bg-[radial-gradient(900px_500px_at_10%_-10%,var(--adpc-red-soft),transparent_65%),#f8fafc] dark:bg-[radial-gradient(900px_500px_at_10%_-10%,#2a1313,transparent_65%),#09090b]">
      <section className="flex-1 px-6 py-8">
        <div className="mx-auto max-w-5xl">
          <div className="rounded-2xl border border-red-200/70 bg-white/90 p-6 shadow-sm backdrop-blur dark:border-zinc-800 dark:bg-zinc-900/90">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 text-[var(--adpc-red)]">
                  <Shield className="h-5 w-5" />
                  <span className="text-xs font-semibold uppercase tracking-[0.2em]">{t("admin.console")}</span>
                </div>
                <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-900 dark:text-slate-100">{t("admin.workspace")}</h1>
                <p className="mt-1 text-sm text-slate-700 dark:text-slate-300">{t("admin.manage")}</p>
              </div>
              <div className="flex items-center gap-2">
                <ThemeToggle />
                <LanguageSwitcher />
                <Link
                  href="/map"
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-800 dark:border-zinc-700 dark:text-slate-200"
                >
                  <Map className="size-4" />
                  Open Map
                </Link>
                <Button onClick={handleLogout} className="bg-[var(--adpc-red)] hover:bg-[var(--adpc-red-dark)]">
                  <span className="inline-flex items-center gap-1">
                    <LogOut className="h-4 w-4" />
                    Logout
                  </span>
                </Button>
              </div>
            </div>
          </div>

          <AdminConsoleSections />
        </div>
      </section>

      <SiteFooter />
    </main>
  )
}
