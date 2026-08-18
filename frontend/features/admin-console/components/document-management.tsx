"use client"

import { useEffect, useState, type FormEvent } from "react"
import { FileText, Plus, Trash2, Upload } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { listDocuments, removeDocument, uploadDocument, type AdminDocument } from "../api"
import { AdminCard, AdminFeedback } from "./admin-ui"

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function DocumentManagement() {
  const [documents, setDocuments] = useState<AdminDocument[]>([])
  const [title, setTitle] = useState(""); const [summary, setSummary] = useState(""); const [file, setFile] = useState<File | null>(null)
  const [error, setError] = useState(""); const [message, setMessage] = useState(""); const [saving, setSaving] = useState(false)
  async function refresh() { try { setDocuments(await listDocuments()); setError("") } catch (e) { setError(e instanceof Error ? e.message : "Unable to load documents") } }
  useEffect(() => { void listDocuments().then(setDocuments).catch((e) => setError(e instanceof Error ? e.message : "Unable to load documents")) }, [])
  async function submit(event: FormEvent) { event.preventDefault(); setError(""); setMessage(""); if (!title.trim()) { setError("Title is required"); return } if (!file) { setError("Please select a document"); return } const formData = new FormData(); formData.append("title", title.trim()); formData.append("summary", summary.trim()); formData.append("file", file); setSaving(true); try { await uploadDocument(formData); setTitle(""); setSummary(""); setFile(null); const input = document.getElementById("document-file") as HTMLInputElement | null; if (input) input.value = ""; setMessage("Document uploaded"); await refresh() } catch (e) { setError(e instanceof Error ? e.message : "Unable to upload document") } finally { setSaving(false) } }
  async function remove(document: AdminDocument) { if (!window.confirm(`Delete ${document.title}?`)) return; try { await removeDocument(document.id); await refresh() } catch (e) { setError(e instanceof Error ? e.message : "Unable to delete document") } }
  return <section className="mt-6 grid gap-6 lg:grid-cols-[1fr_360px]"><AdminCard><div className="flex items-start justify-between gap-4"><div><h2 className="text-xl font-semibold">Documents</h2><p className="mt-1 text-sm text-slate-600 dark:text-slate-400">Upload reference documents with a clear title and optional summary.</p></div><FileText className="h-5 w-5 text-[var(--adpc-red)]" /></div><div className="mt-5 space-y-3">{documents.map((item) => <div key={item.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 p-4 dark:border-zinc-800"><div className="min-w-0"><p className="font-medium">{item.title}</p>{item.summary ? <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">{item.summary}</p> : null}<p className="mt-2 truncate text-xs text-slate-500">{item.original_filename} · {formatSize(item.size_bytes)} · {new Date(item.created_at).toLocaleString()}</p></div><Button size="sm" variant="secondary" onClick={() => void remove(item)}><Trash2 className="h-4 w-4" />Delete</Button></div>)}{!documents.length ? <p className="py-8 text-center text-sm text-slate-500">No documents uploaded yet.</p> : null}</div><AdminFeedback error={error} message={message} /></AdminCard><AdminCard><div className="flex items-center gap-2"><Plus className="h-4 w-4 text-[var(--adpc-red)]" /><h2 className="text-lg font-semibold">Add document</h2></div><form onSubmit={submit} className="mt-4 space-y-4"><label className="block text-sm">Title <span className="text-[var(--adpc-red)]">*</span><Input className="mt-1" required value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Document title" /></label><label className="block text-sm">Summary <span className="text-xs text-slate-500">(optional)</span><textarea className="mt-1 min-h-24 w-full rounded-md border border-slate-300 bg-transparent p-3 text-sm outline-none dark:border-zinc-700" value={summary} onChange={(e) => setSummary(e.target.value)} placeholder="Brief description" /></label><label className="block text-sm">File <span className="text-[var(--adpc-red)]">*</span><input id="document-file" className="mt-1 block w-full rounded-md border border-slate-300 p-2 text-sm dark:border-zinc-700" type="file" required onChange={(e) => setFile(e.target.files?.[0] ?? null)} /></label><Button type="submit" disabled={saving} className="w-full bg-[var(--adpc-red)] hover:bg-[var(--adpc-red-dark)]"><Upload className="h-4 w-4" />{saving ? "Uploading..." : "Upload document"}</Button></form></AdminCard></section>
}
