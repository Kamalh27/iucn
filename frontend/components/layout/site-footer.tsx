import { cn } from "@/lib/utils"

type SiteFooterProps = {
  className?: string
}

export function SiteFooter({ className = "" }: SiteFooterProps) {
  const year = new Date().getFullYear()

  return (
    <footer
      className={cn(
        "w-full border-t border-slate-200/80 py-3 text-center text-sm text-slate-700 dark:border-zinc-800/80 dark:text-slate-300",
        className
      )}
    >
      <div className="mx-auto w-full max-w-6xl px-4">Copyright {year} ADPC. All rights reserved.</div>
    </footer>
  )
}
