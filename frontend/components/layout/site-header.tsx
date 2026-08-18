import Link from "next/link"
import { Map } from "lucide-react"

import { ThemeToggle } from "@/components/layout/theme-toggle"
import { LanguageSwitcher } from "@/components/i18n/language-switcher"
import { cn } from "@/lib/utils"

type SiteHeaderProps = {
  className?: string
}

export function SiteHeader({ className = "" }: SiteHeaderProps) {
  return (
    <header
      className={cn(
        "fixed inset-x-0 top-0 z-50 w-full border-b border-slate-200/80 dark:border-zinc-800/80",
        className
      )}
    >
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-4">
        <Link href="/" className="leading-tight text-[var(--adpc-red)]">
          <span className="block text-xl font-semibold tracking-[0.08em]">CRVA</span>
          <span className="hidden text-[11px] font-medium tracking-[0.14em] text-slate-700 sm:block dark:text-slate-300">
            Climate Risk and Vulnerability Assessment
          </span>
        </Link>

        <div className="flex items-center gap-2">
          <Link
            href="/map"
            className="inline-flex h-10 items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3.5 text-sm font-medium text-slate-800 transition-colors hover:bg-slate-100 dark:border-zinc-700 dark:bg-zinc-900 dark:text-slate-100 dark:hover:bg-zinc-800"
          >
            <Map className="size-4" />
            Map Viewer
          </Link>
          <LanguageSwitcher />
          <ThemeToggle />
        </div>
      </div>
    </header>
  )
}
