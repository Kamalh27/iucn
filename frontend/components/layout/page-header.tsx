import type { ReactNode } from "react"

type PageHeaderProps = {
  title: string
  subtitle?: string
  action?: ReactNode
}

export function PageHeader({ title, subtitle, action }: PageHeaderProps) {
  return (
    <header className="absolute left-4 right-4 top-4 z-10 flex items-center justify-between rounded-xl bg-white/90 px-4 py-3 shadow-lg backdrop-blur">
      <div>
        <div className="text-sm font-semibold text-slate-900">{title}</div>
        {subtitle ? <div className="text-xs text-slate-600">{subtitle}</div> : null}
      </div>
      {action}
    </header>
  )
}
