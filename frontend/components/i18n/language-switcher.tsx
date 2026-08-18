"use client"

import { Languages } from "lucide-react"
import { useLanguage, type Language } from "./language-provider"

export function LanguageSwitcher() {
  const { language, setLanguage, t } = useLanguage()
  return <label className="inline-flex h-10 items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 text-sm dark:border-zinc-700 dark:bg-zinc-900"><Languages className="size-4 text-[var(--adpc-red)]" /><span className="sr-only">{t("language.switch", "Language")}</span><select aria-label={t("language.switch", "Language")} value={language} onChange={(event) => setLanguage(event.target.value as Language)} className="bg-transparent outline-none"><option value="en">{t("language.english", "English")}</option><option value="th">{t("language.thai", "ไทย")}</option></select></label>
}
