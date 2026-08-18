"use client"

import { useEffect, useMemo, useState } from "react"
import { Save } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { listTranslations, saveTranslation, type AdminTranslation } from "../api"
import { AdminCard, AdminFeedback } from "./admin-ui"

const sections = [
  { id: "header", label: "Header", namespaces: ["header"] },
  { id: "dashboard", label: "Dashboard", namespaces: ["dashboard"] },
  { id: "map", label: "Map viewer", namespaces: ["map"] },
  { id: "admin", label: "Admin", namespaces: ["admin", "nav"] },
] as const

type Draft = { en: string; th: string }

function buildDrafts(items: AdminTranslation[]): Record<string, Draft> {
  return items.reduce<Record<string, Draft>>((result, row) => {
    const id = `${row.namespace}.${row.key}`
    result[id] ??= { en: "", th: "" }
    if (row.language === "en" || row.language === "th") result[id][row.language] = row.value
    return result
  }, {})
}

export function LanguageManagement() {
  const [rows, setRows] = useState<AdminTranslation[]>([])
  const [section, setSection] = useState("header")
  const [search, setSearch] = useState("")
  const [drafts, setDrafts] = useState<Record<string, Draft>>({})
  const [saving, setSaving] = useState<string | null>(null)
  const [error, setError] = useState("")
  const [message, setMessage] = useState("")

  async function refresh() {
    try {
      const items = await listTranslations()
      setRows(items)
      setDrafts(buildDrafts(items))
      setError("")
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to load translations")
    }
  }

  useEffect(() => {
    void listTranslations().then((items) => {
      setRows(items)
      setDrafts(buildDrafts(items))
    }).catch((e) => setError(e instanceof Error ? e.message : "Unable to load translations"))
  }, [])

  const selectedSection = sections.find((item) => item.id === section) ?? sections[0]
  const keys = useMemo(() => Array.from(new Set(
    rows
      .filter((row) => selectedSection.namespaces.includes(row.namespace as never))
      .map((row) => `${row.namespace}.${row.key}`)
  )).filter((key) => key.toLowerCase().includes(search.toLowerCase().trim())), [rows, search, selectedSection])

  async function saveKey(id: string) {
    const [namespace, ...keyParts] = id.split(".")
    const key = keyParts.join(".")
    const draft = drafts[id] ?? { en: "", th: "" }
    setSaving(id); setError(""); setMessage("")
    try {
      await saveTranslation({ namespace, key, language: "en", value: draft.en })
      await saveTranslation({ namespace, key, language: "th", value: draft.th })
      setMessage(`${id} updated`)
      await refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to save translations")
    } finally {
      setSaving(null)
    }
  }

  return <section className="mt-6"><AdminCard>
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div><h2 className="text-xl font-semibold">Language editor</h2><p className="mt-1 text-sm text-slate-600 dark:text-slate-400">Edit the fixed English and Thai text used throughout the portal.</p></div>
      <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Find a key..." className="w-48" />
    </div>
    <div className="mt-5 flex gap-1 overflow-x-auto border-b border-slate-200 dark:border-zinc-800" role="tablist" aria-label="Translation sections">
      {sections.map((item) => <button key={item.id} type="button" role="tab" aria-selected={section === item.id} onClick={() => setSection(item.id)} className={`whitespace-nowrap border-b-2 px-3 py-2 text-sm font-medium transition ${section === item.id ? "border-[var(--adpc-red)] text-[var(--adpc-red)]" : "border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"}`}>{item.label}</button>)}
    </div>
    <div className="mt-5 overflow-x-auto"><table className="w-full min-w-[760px] text-left text-sm"><thead className="border-b border-slate-200 text-xs uppercase text-slate-500 dark:border-zinc-800"><tr><th className="pb-3">Fixed key</th><th className="pb-3">English</th><th className="pb-3">Thai</th><th className="pb-3" /></tr></thead><tbody>{keys.map((id) => <tr key={id} className="border-b border-slate-100 align-top dark:border-zinc-800/70"><td className="py-3 pr-4 font-mono text-xs text-slate-500">{id}</td><td className="py-3 pr-3"><textarea aria-label={`${id} English`} value={drafts[id]?.en ?? ""} onChange={(event) => setDrafts({ ...drafts, [id]: { ...(drafts[id] ?? { en: "", th: "" }), en: event.target.value } })} className="min-h-16 w-full rounded-md border border-slate-300 bg-transparent p-2 text-sm outline-none focus:border-[var(--adpc-red)] dark:border-zinc-700" /></td><td className="py-3 pr-3"><textarea aria-label={`${id} Thai`} value={drafts[id]?.th ?? ""} onChange={(event) => setDrafts({ ...drafts, [id]: { ...(drafts[id] ?? { en: "", th: "" }), th: event.target.value } })} className="min-h-16 w-full rounded-md border border-slate-300 bg-transparent p-2 text-sm outline-none focus:border-[var(--adpc-red)] dark:border-zinc-700" /></td><td className="py-3 text-right"><Button size="sm" onClick={() => void saveKey(id)} disabled={saving === id}><Save className="h-3.5 w-3.5" />{saving === id ? "Saving" : "Save"}</Button></td></tr>)}</tbody></table>{!keys.length ? <p className="py-8 text-center text-sm text-slate-500">No fixed keys found in this section.</p> : null}</div>
    <AdminFeedback error={error} message={message} />
  </AdminCard></section>
}
