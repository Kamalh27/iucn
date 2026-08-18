"use client"

import { useState } from "react"
import { FileText, KeyRound, Languages, Layers3, Shield, type LucideIcon } from "lucide-react"
import { AdminUserManagement } from "@/features/admin-users/components/admin-user-management"
import { useLanguage } from "@/components/i18n/language-provider"
import { ApiKeyManagement } from "./api-key-management"
import { LanguageManagement } from "./language-management"
import { DocumentManagement } from "./document-management"
import { GeoDataManagement } from "./geo-data-management"

type AdminTab = "users" | "keys" | "languages" | "documents" | "geo"
const tabs: Array<[AdminTab, string, LucideIcon]> = [
  ["users", "User management", Shield],
  ["keys", "API keys", KeyRound],
  ["languages", "Language editor", Languages],
  ["documents", "Documents", FileText],
  ["geo", "Geo data", Layers3],
]

export function AdminConsoleSections() {
  const [tab, setTab] = useState<AdminTab>("users")
  const { t } = useLanguage()
  const labels: Record<AdminTab, string> = { users: t("nav.userManagement"), keys: t("nav.apiKeys"), languages: t("nav.languageEditor"), documents: t("nav.documents"), geo: t("nav.geoData") }
  return <>
    <nav aria-label="Admin sections" className="sticky top-0 z-30 mt-8 flex flex-wrap gap-1 border-b border-slate-200 bg-slate-50/95 py-1 backdrop-blur supports-[backdrop-filter]:bg-slate-50/80 dark:border-zinc-800 dark:bg-zinc-950/95 supports-[backdrop-filter]:dark:bg-zinc-950/80">
      {tabs.map(([value, , Icon]) => <button key={value} type="button" role="tab" aria-selected={tab === value} onClick={() => setTab(value)} className={`inline-flex items-center gap-2 rounded-none border-b-2 px-3 py-3 text-sm font-medium transition-colors sm:px-4 ${tab === value ? "border-[var(--adpc-red)] text-[var(--adpc-red)]" : "border-transparent text-slate-600 hover:bg-white hover:text-slate-900 dark:text-slate-400 dark:hover:bg-zinc-900 dark:hover:text-slate-100"}`}><Icon className="size-4" aria-hidden="true" />{labels[value]}</button>)}
    </nav>
    {tab === "users" ? <AdminUserManagement /> : tab === "keys" ? <ApiKeyManagement /> : tab === "languages" ? <LanguageManagement /> : tab === "documents" ? <DocumentManagement /> : <GeoDataManagement />}
  </>
}
