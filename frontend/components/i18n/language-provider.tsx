"use client"

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react"
import { apiRequest } from "@/lib/api-client"

export type Language = "en" | "th"
type Translation = { namespace: string; key: string; language: string; value: string }
type LanguageContextValue = { language: Language; setLanguage: (language: Language) => void; t: (key: string, fallback?: string) => string }

const STORAGE_KEY = "crva-language"
const defaults: Record<Language, Record<string, string>> = {
  en: {
    "nav.userManagement": "User management", "nav.apiKeys": "API keys", "nav.languageEditor": "Language editor", "nav.documents": "Documents", "nav.geoData": "Geo data",
    "admin.console": "CRVA Admin Console", "admin.workspace": "CRVA Admin workspace", "admin.manage": "Manage access, integrations, documents, language, and map data.",
    "language.english": "English", "language.thai": "ไทย", "language.switch": "Language",
  },
  th: {
    "nav.userManagement": "จัดการผู้ใช้", "nav.apiKeys": "คีย์ API", "nav.languageEditor": "แก้ไขภาษา", "nav.documents": "เอกสาร", "nav.geoData": "ข้อมูลภูมิสารสนเทศ",
    "admin.console": "ศูนย์ผู้ดูแล CRVA", "admin.workspace": "พื้นที่ทำงานผู้ดูแล CRVA", "admin.manage": "จัดการสิทธิ์ การเชื่อมต่อ เอกสาร ภาษา และข้อมูลแผนที่",
    "language.english": "English", "language.thai": "ไทย", "language.switch": "ภาษา",
  },
}

const LanguageContext = createContext<LanguageContextValue | null>(null)

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>(() => {
    if (typeof window === "undefined") return "en"
    const saved = window.localStorage.getItem(STORAGE_KEY)
    return saved === "th" ? "th" : "en"
  })
  const [remote, setRemote] = useState<Record<string, string>>({})
  useEffect(() => { window.localStorage.setItem(STORAGE_KEY, language); document.documentElement.lang = language }, [language])
  useEffect(() => { void apiRequest<Translation[]>(`/layers/translations?language=${language}`).then((items) => setRemote(Object.fromEntries(items.map((item) => [`${item.namespace}.${item.key}`, item.value])))).catch(() => setRemote({})) }, [language])
  const value = useMemo(() => ({ language, setLanguage: (next: Language) => setLanguageState(next), t: (key: string, fallback = key) => remote[key] ?? defaults[language][key] ?? defaults.en[key] ?? fallback }), [language, remote])
  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>
}

export function useLanguage() {
  const context = useContext(LanguageContext)
  if (!context) throw new Error("useLanguage must be used inside LanguageProvider")
  return context
}
