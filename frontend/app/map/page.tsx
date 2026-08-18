"use client"

import * as React from "react"
import {
  Info,
  Layers,
  LocateFixed,
  Maximize2,
  Minimize2,
  Minus,
  Plus,
} from "lucide-react"
import Map, { Layer as MapLayer, Marker, ScaleControl, Source as MapSource, type MapRef } from "react-map-gl/maplibre"
import * as maplibregl from "maplibre-gl"
import type { StyleSpecification } from "maplibre-gl"

import { SiteHeader } from "@/components/layout/site-header"
import { cn } from "@/lib/utils"

type BasemapKey = "auto" | "light" | "dark" | "imagery"
type LocationKey = "chiang-rai" | "surat-thani"
type DataLayer = {
  id: string
  title: string
  location_tag: LocationKey
  data_kind: "raster" | "vector"
  layer_type: "cog" | "mvt" | "geojson"
  tile_url?: string
  data_url?: string
}

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000"

const cartoLightStyle: StyleSpecification = {
  version: 8,
  sources: {
    carto: {
      type: "raster",
      tiles: [
        "https://a.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png",
        "https://b.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png",
        "https://c.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png",
      ],
      tileSize: 256,
      attribution: "© CARTO © OpenStreetMap contributors",
    },
  },
  layers: [{ id: "carto-light", type: "raster", source: "carto" }],
}

const cartoDarkStyle: StyleSpecification = {
  version: 8,
  sources: {
    carto: {
      type: "raster",
      tiles: [
        "https://a.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png",
        "https://b.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png",
        "https://c.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png",
      ],
      tileSize: 256,
      attribution: "© CARTO © OpenStreetMap contributors",
    },
  },
  layers: [{ id: "carto-dark", type: "raster", source: "carto" }],
}

const mapLocations: Record<LocationKey, { label: string; longitude: number; latitude: number; zoom: number }> = {
  "chiang-rai": {
    label: "Chiang Rai",
    longitude: 99.8325,
    latitude: 19.9105,
    zoom: 10,
  },
  "surat-thani": {
    label: "Surat Thani",
    longitude: 99.3331,
    latitude: 9.1382,
    zoom: 10,
  },
}

const defaultLocation: LocationKey = "chiang-rai"

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
  const [isDarkTheme, setIsDarkTheme] = React.useState(false)
  const [showAttribution, setShowAttribution] = React.useState(false)
  const [selectedLocation, setSelectedLocation] = React.useState<LocationKey>(defaultLocation)
  const [userLocation, setUserLocation] = React.useState<[number, number] | null>(null)
  const [dataLayers, setDataLayers] = React.useState<DataLayer[]>([])

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

  React.useEffect(() => {
    let active = true
    fetch(`${API_URL}/layers`)
      .then((response) => (response.ok ? response.json() : Promise.reject(new Error("Unable to load map layers"))))
      .then((layers: DataLayer[]) => {
        if (active) setDataLayers(layers)
      })
      .catch(() => {
        if (active) setDataLayers([])
      })

    return () => {
      active = false
    }
  }, [])

  const visibleLayers = React.useMemo(
    () => dataLayers.filter((layer) => layer.location_tag === selectedLocation),
    [dataLayers, selectedLocation]
  )

  const layerUrl = (url: string) => `${API_URL}${url}`

  const baseStyle = React.useMemo(() => {
    if (basemap === "imagery") {
      return imageryStyle
    }
    if (basemap === "dark" || (basemap === "auto" && isDarkTheme)) {
      return cartoDarkStyle
    }
    return cartoLightStyle
  }, [basemap, isDarkTheme])

  const flyToLocation = (locationKey: LocationKey) => {
    const location = mapLocations[locationKey]
    mapRef.current?.flyTo({
      center: [location.longitude, location.latitude],
      zoom: location.zoom,
      duration: 850,
    })
    setSelectedLocation(locationKey)
    setLocateError(null)
  }

  const zoomIn = () => {
    const zoom = mapRef.current?.getZoom() ?? mapLocations[selectedLocation].zoom
    mapRef.current?.easeTo({ zoom: zoom + 1, duration: 300 })
  }

  const zoomOut = () => {
    const zoom = mapRef.current?.getZoom() ?? mapLocations[selectedLocation].zoom
    mapRef.current?.easeTo({ zoom: zoom - 1, duration: 300 })
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
        setUserLocation(nextCenter)
        mapRef.current?.flyTo({ center: nextCenter, zoom: 11, duration: 1000 })
        setIsLocating(false)
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
        ? "Auto (CARTO Dark)"
        : "Auto (CARTO Light)"
      : basemap === "dark"
      ? "CARTO Dark"
      : basemap === "imagery"
      ? "Imagery"
      : "CARTO Light"

  return (
    <>
      <SiteHeader className="border-b-0" />
      <main className="bg-[var(--background)] pt-16">
        <section className="h-[calc(100dvh-4rem)] w-full">
          <div ref={containerRef} className="relative h-full w-full">
            <Map
              ref={mapRef}
              mapLib={maplibregl}
              initialViewState={mapLocations[defaultLocation]}
              mapStyle={baseStyle}
              attributionControl={false}
              style={{ width: "100%", height: "100%" }}
            >
              {visibleLayers.map((layer) => {
                const sourceId = `data-${layer.id}`
                const tileUrl = layer.tile_url ? layerUrl(layer.tile_url) : null

                if (layer.data_kind === "raster" && tileUrl) {
                  return (
                    <MapSource key={sourceId} id={sourceId} type="raster" tiles={[tileUrl]} tileSize={256}>
                      <MapLayer
                        id={`${sourceId}-raster`}
                        type="raster"
                        source={sourceId}
                        paint={{ "raster-opacity": 0.72 }}
                      />
                    </MapSource>
                  )
                }

                if (layer.data_kind === "vector" && layer.layer_type === "mvt" && tileUrl) {
                  return (
                    <MapSource key={sourceId} id={sourceId} type="vector" tiles={[layerUrl(layer.tile_url!)]}>
                      <MapLayer
                        id={`${sourceId}-fill`}
                        type="fill"
                        source={sourceId}
                        source-layer="layer"
                        filter={["==", "$type", "Polygon"]}
                        paint={{ "fill-color": "#c53030", "fill-opacity": 0.3 }}
                      />
                      <MapLayer
                        id={`${sourceId}-line`}
                        type="line"
                        source={sourceId}
                        source-layer="layer"
                        filter={["==", "$type", "LineString"]}
                        paint={{ "line-color": "#c53030", "line-width": 2 }}
                      />
                      <MapLayer
                        id={`${sourceId}-point`}
                        type="circle"
                        source={sourceId}
                        source-layer="layer"
                        filter={["==", "$type", "Point"]}
                        paint={{ "circle-color": "#c53030", "circle-radius": 4 }}
                      />
                    </MapSource>
                  )
                }

                if (layer.data_kind === "vector" && layer.layer_type === "geojson" && layer.data_url) {
                  return (
                    <MapSource key={sourceId} id={sourceId} type="geojson" data={layerUrl(layer.data_url)}>
                      <MapLayer
                        id={`${sourceId}-fill`}
                        type="fill"
                        source={sourceId}
                        filter={["==", "$type", "Polygon"]}
                        paint={{ "fill-color": "#c53030", "fill-opacity": 0.3 }}
                      />
                      <MapLayer
                        id={`${sourceId}-line`}
                        type="line"
                        source={sourceId}
                        filter={["==", "$type", "LineString"]}
                        paint={{ "line-color": "#c53030", "line-width": 2 }}
                      />
                      <MapLayer
                        id={`${sourceId}-point`}
                        type="circle"
                        source={sourceId}
                        filter={["==", "$type", "Point"]}
                        paint={{ "circle-color": "#c53030", "circle-radius": 4 }}
                      />
                    </MapSource>
                  )
                }

                return null
              })}
              {userLocation ? (
                <Marker longitude={userLocation[0]} latitude={userLocation[1]} anchor="center">
                  <div className="relative flex size-8 items-center justify-center" aria-label="Your location">
                    <span className="absolute size-8 animate-ping rounded-full bg-[var(--adpc-red)]/35" />
                    <span className="relative size-3 rounded-full border-2 border-white bg-[var(--adpc-red)] shadow-md dark:border-zinc-900" />
                  </div>
                </Marker>
              ) : null}
              <ScaleControl position="bottom-left" />
            </Map>

            <div className="absolute bottom-2 left-2 z-20">
              {showAttribution ? (
                <div className="flex items-center gap-2 rounded-md border border-slate-300/80 bg-white/95 px-2 py-1 text-[10px] text-slate-700 shadow-sm dark:border-zinc-700 dark:bg-zinc-900/95 dark:text-slate-200">
                  <span>
                    {basemap === "imagery"
                      ? "Source: Esri, Maxar, Earthstar Geographics, and the GIS User Community"
                      : "© CARTO © OpenStreetMap contributors"}
                  </span>
                  <button
                    type="button"
                    aria-label="Hide map attribution"
                    onClick={() => setShowAttribution(false)}
                    className="font-semibold hover:text-slate-950 dark:hover:text-white"
                  >
                    ×
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  aria-label="Show map attribution"
                  onClick={() => setShowAttribution(true)}
                  className="inline-flex size-7 items-center justify-center rounded-full border border-slate-300/80 bg-white/95 text-slate-700 shadow-sm transition hover:bg-slate-100 dark:border-zinc-700 dark:bg-zinc-900/95 dark:text-slate-200 dark:hover:bg-zinc-800"
                >
                  <Info className="size-3.5" />
                </button>
              )}
            </div>

            <div
              className="absolute left-1/2 top-4 z-20 flex -translate-x-1/2 overflow-hidden rounded-full border border-slate-300/80 bg-white/95 p-1 shadow-sm backdrop-blur dark:border-zinc-700 dark:bg-zinc-900/95"
              role="tablist"
              aria-label="Map locations"
            >
                {Object.entries(mapLocations).map(([key, location]) => (
                  <button
                    key={key}
                    type="button"
                    role="tab"
                    aria-selected={selectedLocation === key}
                    onClick={() => flyToLocation(key as LocationKey)}
                    className={cn(
                      "whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-medium transition",
                      selectedLocation === key
                        ? "bg-[var(--adpc-red)] text-white"
                        : "text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-zinc-800"
                    )}
                  >
                    {location.label}
                  </button>
                ))}
            </div>

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
                  <p className="mb-2 text-[10px] text-slate-500 dark:text-slate-400">
                    {visibleLayers.length} {visibleLayers.length === 1 ? "data layer" : "data layers"} for {mapLocations[selectedLocation].label}
                  </p>
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
                          ? "CARTO Light"
                          : key === "dark"
                          ? "CARTO Dark"
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
                  tooltip={isFullscreen ? "Exit fullscreen" : "Fullscreen"}
                  aria-label={isFullscreen ? "Exit fullscreen" : "Fullscreen"}
                  onClick={toggleFullscreen}
                  className="rounded-b-[28px] border-t border-slate-300/60 dark:border-zinc-700"
                >
                  {isFullscreen ? <Minimize2 className="size-4" /> : <Maximize2 className="size-4" />}
                </MapControlButton>
              </div>

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
