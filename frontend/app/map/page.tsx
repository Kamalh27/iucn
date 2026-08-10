"use client"

import * as React from "react"
import {
  House,
  Layers,
  LocateFixed,
  Maximize2,
  Minimize2,
  Minus,
  Plus,
} from "lucide-react"
import Map, { AttributionControl, ScaleControl, type MapRef } from "react-map-gl/maplibre"
import maplibregl, { type StyleSpecification } from "maplibre-gl"

import { SiteHeader } from "@/components/layout/site-header"
import { cn } from "@/lib/utils"

type BasemapKey = "auto" | "light" | "dark" | "imagery"

const sriLankaInitialView = {
  longitude: 80.7,
  latitude: 7.9,
  zoom: 6.5,
}

const imageryStyle: StyleSpecification = {
  version: 8,
  sources: {
    imagery: {
      type: "raster",
      tiles: [
        "https://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
      ],
      tileSize: 256,
      attribution:
        "Source: Esri, Maxar, Earthstar Geographics, and the GIS User Community",
    },
  },
  layers: [
    {
      id: "imagery",
      type: "raster",
      source: "imagery",
    },
  ],
}

function MapControlButton({
  tooltip,
  className,
  children,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  tooltip: string
}) {
  return (
    <div className="group relative flex">
      <button
        {...props}
        className={cn(
          "inline-flex size-12 items-center justify-center text-slate-900 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60 dark:text-slate-100 dark:hover:bg-zinc-800",
          className
        )}
      >
        {children}
      </button>
      <span className="pointer-events-none absolute right-full top-1/2 mr-2 -translate-y-1/2 whitespace-nowrap rounded-md border border-slate-300/80 bg-white/95 px-2 py-1 text-[10px] font-medium text-slate-800 opacity-0 shadow-sm transition-opacity group-hover:opacity-100 dark:border-zinc-700 dark:bg-zinc-900/95 dark:text-slate-100">
        {tooltip}
      </span>
    </div>
  )
}

export default function MapPage() {
  const mapRef = React.useRef<MapRef | null>(null)
  const containerRef = React.useRef<HTMLDivElement | null>(null)
  const [basemap, setBasemap] = React.useState<BasemapKey>("auto")
  const [layersPanelOpen, setLayersPanelOpen] = React.useState(false)
  const [isFullscreen, setIsFullscreen] = React.useState(false)
  const [isLocating, setIsLocating] = React.useState(false)
  const [locateError, setLocateError] = React.useState<string | null>(null)
  const [showMapReset, setShowMapReset] = React.useState(false)
  const [isDarkTheme, setIsDarkTheme] = React.useState(false)

  React.useEffect(() => {
    const root = document.documentElement
    const updateTheme = () => setIsDarkTheme(root.classList.contains("dark"))
    updateTheme()

    const observer = new MutationObserver(updateTheme)
    observer.observe(root, { attributes: true, attributeFilter: ["class"] })

    return () => {
      observer.disconnect()
    }
  }, [])

  const baseStyle = React.useMemo(() => {
    if (basemap === "imagery") {
      return imageryStyle
    }
    if (basemap === "dark" || (basemap === "auto" && isDarkTheme)) {
      return "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json"
    }
    return "https://basemaps.cartocdn.com/gl/positron-gl-style/style.json"
  }, [basemap, isDarkTheme])

  const resetToSriLanka = () => {
    mapRef.current?.flyTo({
      center: [sriLankaInitialView.longitude, sriLankaInitialView.latitude],
      zoom: sriLankaInitialView.zoom,
      duration: 850,
    })
    setShowMapReset(false)
    setLocateError(null)
  }

  const zoomIn = () => {
    const zoom = mapRef.current?.getZoom() ?? sriLankaInitialView.zoom
    mapRef.current?.easeTo({ zoom: zoom + 1, duration: 300 })
    setShowMapReset(true)
  }

  const zoomOut = () => {
    const zoom = mapRef.current?.getZoom() ?? sriLankaInitialView.zoom
    mapRef.current?.easeTo({ zoom: zoom - 1, duration: 300 })
    setShowMapReset(true)
  }

  const handleLocate = () => {
    if (!navigator.geolocation) {
      setLocateError("Geolocation is not supported in this browser.")
      return
    }

    setIsLocating(true)
    setLocateError(null)

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const nextCenter: [number, number] = [
          position.coords.longitude,
          position.coords.latitude,
        ]
        mapRef.current?.flyTo({ center: nextCenter, zoom: 11, duration: 1000 })
        setIsLocating(false)
        setShowMapReset(true)
      },
      () => {
        setIsLocating(false)
        setLocateError("Unable to access your location.")
      },
      { enableHighAccuracy: true, timeout: 10000 }
    )
  }

  const toggleFullscreen = () => {
    const container = containerRef.current
    if (!container) return

    if (!document.fullscreenElement) {
      void container.requestFullscreen()
    } else {
      void document.exitFullscreen()
    }
  }

  React.useEffect(() => {
    const onChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement))
    }
    document.addEventListener("fullscreenchange", onChange)
    return () => {
      document.removeEventListener("fullscreenchange", onChange)
    }
  }, [])

  const basemapLabel =
    basemap === "auto"
      ? isDarkTheme
        ? "Auto (Dark)"
        : "Auto (Light)"
      : basemap === "dark"
      ? "Dark"
      : basemap === "imagery"
      ? "Imagery"
      : "Light"

  return (
    <>
      <SiteHeader className="border-b-0" />
      <main className="bg-[var(--background)] pt-16">
        <section className="h-[calc(100dvh-4rem)] w-full">
          <div ref={containerRef} className="relative h-full w-full">
            <Map
              ref={mapRef}
              mapLib={maplibregl}
              initialViewState={sriLankaInitialView}
              mapStyle={baseStyle}
              attributionControl={false}
              style={{ width: "100%", height: "100%" }}
              onMoveEnd={() => setShowMapReset(true)}
            >
              <ScaleControl position="bottom-left" />
              <AttributionControl compact position="bottom-left" />
            </Map>

            <div className="absolute right-4 top-4 z-20 flex flex-col items-end gap-2">
              <button
                type="button"
                aria-label="Layers panel"
                onClick={() => setLayersPanelOpen((open) => !open)}
                className="inline-flex size-10 items-center justify-center rounded-full border border-slate-300/80 bg-white/90 shadow-sm backdrop-blur transition hover:bg-slate-100 dark:border-zinc-700 dark:bg-zinc-900/85 dark:hover:bg-zinc-800"
              >
                <Layers className="size-4 text-slate-700 dark:text-slate-100" />
              </button>

              {layersPanelOpen ? (
                <div className="w-56 rounded-xl border border-slate-300/80 bg-white/90 p-3 text-[11px] shadow-sm dark:border-zinc-700 dark:bg-zinc-900/85">
                  <div className="mb-2 flex items-center gap-1 text-slate-700 dark:text-slate-300">
                    <Layers className="size-3.5" />
                    <span className="font-medium">{basemapLabel}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-1">
                    {(["auto", "light", "dark", "imagery"] as BasemapKey[]).map((key) => (
                      <button
                        key={key}
                        type="button"
                        onClick={() => {
                          setBasemap(key)
                          setLayersPanelOpen(false)
                        }}
                        className={cn(
                          "rounded-md border px-2 py-1 text-[10px] font-medium transition",
                          basemap === key
                            ? "border-[var(--adpc-red)] bg-[var(--adpc-red)] text-white"
                            : "border-slate-300 text-slate-700 hover:bg-slate-100 dark:border-zinc-700 dark:text-slate-200 dark:hover:bg-zinc-800"
                        )}
                      >
                        {key === "auto"
                          ? "Auto"
                          : key === "light"
                          ? "Light"
                          : key === "dark"
                          ? "Dark"
                          : "Imagery"}
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>

            <div className="absolute bottom-4 right-4 z-20 flex flex-col items-end gap-2">
              <div className="flex flex-col items-center rounded-[28px] border border-slate-300/80 bg-white/90 shadow-lg shadow-black/10 backdrop-blur dark:border-zinc-700 dark:bg-zinc-900/85">
                <MapControlButton
                  type="button"
                  tooltip="Zoom in"
                  aria-label="Zoom in"
                  onClick={zoomIn}
                  className="rounded-t-[28px]"
                >
                  <Plus className="size-4" />
                </MapControlButton>
                <MapControlButton
                  type="button"
                  tooltip="Zoom out"
                  aria-label="Zoom out"
                  onClick={zoomOut}
                  className="rounded-none border-t border-slate-300/60 dark:border-zinc-700"
                >
                  <Minus className="size-4" />
                </MapControlButton>
                <MapControlButton
                  type="button"
                  tooltip={isLocating ? "Locating..." : "My location"}
                  aria-label="My location"
                  onClick={handleLocate}
                  className="rounded-none border-t border-slate-300/60 dark:border-zinc-700"
                  disabled={isLocating}
                >
                  <LocateFixed className={cn("size-4", isLocating && "animate-pulse")} />
                </MapControlButton>
                <MapControlButton
                  type="button"
                  tooltip="Reset"
                  aria-label="Reset"
                  onClick={resetToSriLanka}
                  className="rounded-none border-t border-slate-300/60 dark:border-zinc-700"
                >
                  <House className="size-4" />
                </MapControlButton>
                <MapControlButton
                  type="button"
                  tooltip={isFullscreen ? "Exit fullscreen" : "Fullscreen"}
                  aria-label={isFullscreen ? "Exit fullscreen" : "Fullscreen"}
                  onClick={toggleFullscreen}
                  className="rounded-b-[28px] border-t border-slate-300/60 dark:border-zinc-700"
                >
                  {isFullscreen ? <Minimize2 className="size-4" /> : <Maximize2 className="size-4" />}
                </MapControlButton>
              </div>

              {showMapReset ? (
                <button
                  type="button"
                  onClick={resetToSriLanka}
                  className="rounded-full border border-slate-300/80 bg-white/90 px-2.5 py-1 text-[11px] font-medium text-slate-700 shadow-sm backdrop-blur transition hover:bg-slate-100 dark:border-zinc-700 dark:bg-zinc-900/85 dark:text-slate-200 dark:hover:bg-zinc-800"
                >
                  Reset to Sri Lanka
                </button>
              ) : null}

              {locateError ? (
                <div className="max-w-[220px] rounded-md border border-red-200 bg-white/90 px-2 py-1 text-[10px] text-red-700 shadow-sm dark:border-red-900 dark:bg-zinc-900/90 dark:text-red-300">
                  {locateError}
                </div>
              ) : null}
            </div>
          </div>
        </section>
      </main>
    </>
  )
}
