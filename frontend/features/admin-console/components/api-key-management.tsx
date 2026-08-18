"use client"

import { useEffect, useState } from "react"
import { Copy, KeyRound, Plus, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { createApiKey, listApiKeys, removeApiKey, setApiKeyActive, type AdminApiKey } from "../api"
import { AdminCard, AdminFeedback, StatusPill } from "./admin-ui"

export function ApiKeyManagement() {
  const [keys, setKeys] = useState<AdminApiKey[]>([]); const [newKey, setNewKey] = useState(""); const [error, setError] = useState("")
  async function refresh() { try { setKeys(await listApiKeys()); setError("") } catch (e) { setError(e instanceof Error ? e.message : "Unable to load API keys") } }
  useEffect(() => { void listApiKeys().then(setKeys).catch((e) => setError(e instanceof Error ? e.message : "Unable to load API keys")) }, [])
  async function generate() { try { const result = await createApiKey(); setNewKey(result.api_key); await refresh() } catch (e) { setError(e instanceof Error ? e.message : "Unable to create API key") } }
  async function toggle(item: AdminApiKey) { try { await setApiKeyActive(item.id, !item.is_active); await refresh() } catch (e) { setError(e instanceof Error ? e.message : "Unable to update API key") } }
  async function remove(item: AdminApiKey) { if (!window.confirm(`Delete ${item.key_prefix}?`)) return; try { await removeApiKey(item.id); await refresh() } catch (e) { setError(e instanceof Error ? e.message : "Unable to delete API key") } }
  return <AdminCard className="mt-6"><div className="flex items-start justify-between gap-4"><div><h2 className="text-xl font-semibold">API keys</h2><p className="mt-1 text-sm text-slate-600 dark:text-slate-400">Issue and revoke keys for approved public integrations.</p></div><KeyRound className="h-5 w-5 text-[var(--adpc-red)]" /></div><Button onClick={() => void generate()} className="mt-5 bg-[var(--adpc-red)] hover:bg-[var(--adpc-red-dark)]"><Plus className="h-4 w-4" />Generate key</Button>{newKey ? <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-900 dark:bg-emerald-950/30"><p className="text-xs font-semibold uppercase tracking-wider text-emerald-700 dark:text-emerald-300">Copy this key now — it will not be shown again</p><div className="mt-2 flex gap-2"><Input readOnly value={newKey} /><Button variant="secondary" onClick={() => void navigator.clipboard.writeText(newKey)}><Copy className="h-4 w-4" />Copy</Button></div></div> : null}<AdminFeedback error={error} /><div className="mt-6 space-y-3">{keys.map((item) => <div key={item.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 p-4 dark:border-zinc-800"><div><p className="font-mono text-sm">{item.key_prefix}••••••••</p><p className="mt-1 text-xs text-slate-500">Created {new Date(item.created_at).toLocaleString()}</p></div><div className="flex items-center gap-2"><StatusPill active={item.is_active} /><Button size="sm" variant="secondary" onClick={() => void toggle(item)}>{item.is_active ? "Revoke" : "Activate"}</Button><Button size="sm" variant="secondary" onClick={() => void remove(item)}><Trash2 className="h-4 w-4" /></Button></div></div>)}{!keys.length ? <p className="text-sm text-slate-500">No API keys created yet.</p> : null}</div></AdminCard>
}
