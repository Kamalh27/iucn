"use client"

import { useEffect, useState, type FormEvent } from "react"
import { Database, Layers3, Trash2, Upload } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { listGeoLayers, removeGeoLayer, uploadRasterLayer, uploadVectorLayer, type GeoLayer } from "../api"
import { AdminCard, AdminFeedback, StatusPill } from "./admin-ui"

const rasterTypes = ".tif,.tiff,.geotiff"
const vectorTypes = ".zip,.geojson,.json,.gpkg,.parquet,.geoparquet"

function formatSize(bytes: number) {
  return bytes < 1024 * 1024 ? `${(bytes / 1024).toFixed(1)} KB` : `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function GeoDataManagement() {
  const [layers, setLayers] = useState<GeoLayer[]>([])
  const [kind, setKind] = useState<"raster" | "vector">("raster")
  const [title, setTitle] = useState("")
  const [summary, setSummary] = useState("")
  const [locationTag, setLocationTag] = useState<GeoLayer["location_tag"]>("chiang-rai")
  const [palette, setPalette] = useState("viridis")
  const [file, setFile] = useState<File | null>(null)
  const [error, setError] = useState("")
  const [message, setMessage] = useState("")
  const [saving, setSaving] = useState(false)

  async function refresh() {
    try { setLayers(await listGeoLayers()); setError("") }
    catch (e) { setError(e instanceof Error ? e.message : "Unable to load geospatial layers") }
  }

  useEffect(() => { void listGeoLayers().then(setLayers).catch((e) => setError(e instanceof Error ? e.message : "Unable to load geospatial layers")) }, [])

  async function submit(event: FormEvent) {
    event.preventDefault(); setError(""); setMessage("")
    if (!title.trim()) return setError("Title is required")
    if (!file) return setError("Please select a data file")
    const body = new FormData()
    body.append("title", title.trim()); body.append("summary", summary.trim()); body.append("location_tag", locationTag); body.append("file", file)
    if (kind === "raster") body.append("palette", palette)
    setSaving(true)
    try {
      if (kind === "raster") await uploadRasterLayer(body); else await uploadVectorLayer(body)
      setTitle(""); setSummary(""); setFile(null); setMessage(`${kind === "raster" ? "Raster COG" : "Vector layer"} uploaded`)
      const input = document.getElementById("geo-data-file") as HTMLInputElement | null
      if (input) input.value = ""
      await refresh()
    } catch (e) { setError(e instanceof Error ? e.message : "Unable to upload layer") }
    finally { setSaving(false) }
  }

  async function remove(layer: GeoLayer) {
    if (!window.confirm(`Delete ${layer.title}?`)) return
    try { await removeGeoLayer(layer.id); await refresh() }
    catch (e) { setError(e instanceof Error ? e.message : "Unable to delete layer") }
  }

  return <section className="mt-6 grid gap-6 lg:grid-cols-[1fr_380px]">
    <AdminCard>
      <div className="flex items-start justify-between gap-4"><div><h2 className="text-xl font-semibold">Geospatial data</h2><p className="mt-1 text-sm text-slate-600 dark:text-slate-400">Upload and manage map data layers.</p></div><Layers3 className="h-5 w-5 text-[var(--adpc-red)]" /></div>
      <div className="mt-5 space-y-3">{layers.map((layer) => <div key={layer.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 p-4 dark:border-zinc-800"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><p className="font-medium">{layer.title}</p><StatusPill active /><span className="rounded-full bg-slate-100 px-2 py-1 text-xs text-slate-600 dark:bg-zinc-800 dark:text-slate-300">{layer.location_tag === "chiang-rai" ? "Chiang Rai" : "Surat Thani"}</span><span className="rounded-full bg-slate-100 px-2 py-1 text-xs uppercase text-slate-600 dark:bg-zinc-800 dark:text-slate-300">{layer.layer_type}</span></div>{layer.summary ? <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">{layer.summary}</p> : null}<p className="mt-2 truncate text-xs text-slate-500">{layer.data_kind} · {layer.source_filename} · {formatSize(layer.size_bytes)} · EPSG:3857</p></div><Button size="sm" variant="secondary" onClick={() => void remove(layer)}><Trash2 className="h-4 w-4" />Delete</Button></div>)}{!layers.length ? <p className="py-8 text-center text-sm text-slate-500">No geospatial layers uploaded yet.</p> : null}</div>
      <AdminFeedback error={error} message={message} />
    </AdminCard>
    <AdminCard>
      <div className="flex items-center gap-2"><Database className="h-4 w-4 text-[var(--adpc-red)]" /><h2 className="text-lg font-semibold">Upload layer</h2></div>
      <div className="mt-4 grid grid-cols-2 gap-2">{(["raster", "vector"] as const).map((value) => <button type="button" key={value} onClick={() => { setKind(value); setFile(null) }} className={`rounded-lg border px-3 py-2 text-sm capitalize ${kind === value ? "border-[var(--adpc-red)] bg-[var(--adpc-red-soft)]" : "border-slate-300 dark:border-zinc-700"}`}>{value === "raster" ? "Raster COG" : "Vector"}</button>)}</div>
      <form onSubmit={submit} className="mt-4 space-y-4"><label className="block text-sm">Title <span className="text-[var(--adpc-red)]">*</span><Input className="mt-1" required value={title} onChange={(e) => setTitle(e.target.value)} /></label><label className="block text-sm">Summary <span className="text-xs text-slate-500">(optional)</span><textarea className="mt-1 min-h-20 w-full rounded-md border border-slate-300 bg-transparent p-3 text-sm outline-none dark:border-zinc-700" value={summary} onChange={(e) => setSummary(e.target.value)} /></label><label className="block text-sm">Location<select className="mt-1 h-10 w-full rounded-md border border-slate-300 bg-transparent px-3 text-sm dark:border-zinc-700" value={locationTag} onChange={(e) => setLocationTag(e.target.value as GeoLayer["location_tag"])}><option value="chiang-rai">Chiang Rai</option><option value="surat-thani">Surat Thani</option></select></label>{kind === "raster" ? <label className="block text-sm">Color palette<select className="mt-1 h-10 w-full rounded-md border border-slate-300 bg-transparent px-3 text-sm dark:border-zinc-700" value={palette} onChange={(e) => setPalette(e.target.value)}><option value="viridis">Viridis</option><option value="plasma">Plasma</option><option value="magma">Magma</option><option value="inferno">Inferno</option><option value="turbo">Turbo</option><option value="gray">Gray</option></select></label> : <p className="rounded-lg bg-slate-50 p-3 text-xs text-slate-600 dark:bg-zinc-800 dark:text-slate-300">Choose a supported map data file to upload.</p>}<label className="block text-sm">Data file <span className="text-[var(--adpc-red)]">*</span><input id="geo-data-file" className="mt-1 block w-full rounded-md border border-slate-300 p-2 text-sm dark:border-zinc-700" type="file" accept={kind === "raster" ? rasterTypes : vectorTypes} required onChange={(e) => setFile(e.target.files?.[0] ?? null)} /></label><Button type="submit" disabled={saving} className="w-full bg-[var(--adpc-red)] hover:bg-[var(--adpc-red-dark)]"><Upload className="h-4 w-4" />{saving ? "Processing..." : "Upload layer"}</Button></form>
    </AdminCard>
  </section>
}
