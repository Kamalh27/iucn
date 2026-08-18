import Link from "next/link"
import { LogIn, Map } from "lucide-react"

import { SiteFooter } from "@/components/layout/site-footer"
import { SiteHeader } from "@/components/layout/site-header"

export default function HomePage() {
  return (
    <>
      <SiteHeader className="border-b-0" />
      <main className="min-h-screen bg-[linear-gradient(135deg,var(--adpc-red-soft),#ffffff_55%,#f8fafc)] pt-24 dark:bg-none dark:bg-black">
        <section className="mx-auto w-full max-w-5xl px-4 pb-12">
          <div className="rounded-2xl border border-red-200/80 bg-white/85 p-8 shadow-xl dark:border-zinc-800 dark:bg-zinc-950/80">
            <h1 className="text-4xl font-semibold leading-tight text-slate-900 dark:text-slate-100">Climate Risk and Vulnerability Assessment</h1>
            <p className="mt-4 max-w-2xl text-[15px] leading-relaxed text-slate-700 dark:text-slate-300">
              CRVA provides a public map viewer with an admin workspace for operational tools.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/map"
                className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--adpc-red)] px-5 py-3 text-sm font-medium text-white transition hover:bg-[var(--adpc-red-dark)]"
              >
                <Map className="size-4" />
                Open Map Viewer
              </Link>
              <Link
                href="/admin/login"
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-5 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-100 dark:border-zinc-700 dark:bg-zinc-900 dark:text-slate-100 dark:hover:bg-zinc-800"
              >
                <LogIn className="size-4" />
                Admin Login
              </Link>
            </div>
          </div>
        </section>

        <SiteFooter className="border-t-0" />
      </main>
    </>
  )
}
