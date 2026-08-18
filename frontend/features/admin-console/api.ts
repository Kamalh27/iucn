import { apiRequest } from "@/lib/api-client"

export type AdminApiKey = { id: string; key_prefix: string; scope: string; is_active: boolean; created_at: string; last_used_at?: string | null }
export type AdminTranslation = { id: string; namespace: string; key: string; language: string; value: string; updated_at: string }
export const listApiKeys = () => apiRequest<AdminApiKey[]>("/admin/api-keys", { withAuth: true })
export const createApiKey = () => apiRequest<AdminApiKey & { api_key: string }>("/admin/api-keys", { method: "POST", withAuth: true })
export const setApiKeyActive = (id: string, is_active: boolean) => apiRequest<AdminApiKey>(`/admin/api-keys/${id}?is_active=${is_active}`, { method: "PATCH", withAuth: true })
export const removeApiKey = (id: string) => apiRequest<void>(`/admin/api-keys/${id}`, { method: "DELETE", withAuth: true })
export const listTranslations = () => apiRequest<AdminTranslation[]>("/admin/translations", { withAuth: true })
export const saveTranslation = (payload: Omit<AdminTranslation, "id" | "updated_at">) => apiRequest<AdminTranslation>("/admin/translations", { method: "PUT", withAuth: true, body: payload })
export const removeTranslation = (id: string) => apiRequest<void>(`/admin/translations/${id}`, { method: "DELETE", withAuth: true })
export type AdminDocument = { id: string; title: string; summary?: string | null; original_filename: string; content_type?: string | null; size_bytes: number; created_at: string }
export const listDocuments = () => apiRequest<AdminDocument[]>("/admin/documents", { withAuth: true })
export const uploadDocument = (formData: FormData) => apiRequest<AdminDocument>("/admin/documents", { method: "POST", withAuth: true, body: formData })
export const removeDocument = (id: string) => apiRequest<void>(`/admin/documents/${id}`, { method: "DELETE", withAuth: true })
export type GeoLayer = { id: string; title: string; summary?: string | null; location_tag: "chiang-rai" | "surat-thani"; data_kind: "raster" | "vector"; layer_type: "cog" | "mvt" | "geojson"; palette?: string | null; bbox: number[]; source_filename: string; size_bytes: number; created_at: string; tile_url?: string; data_url?: string }
export const listGeoLayers = () => apiRequest<GeoLayer[]>("/admin/geo-layers", { withAuth: true })
export const uploadRasterLayer = (body: FormData) => apiRequest<GeoLayer>("/admin/geo-layers/raster", { method: "POST", withAuth: true, body })
export const uploadVectorLayer = (body: FormData) => apiRequest<GeoLayer>("/admin/geo-layers/vector", { method: "POST", withAuth: true, body })
export const removeGeoLayer = (id: string) => apiRequest<void>(`/admin/geo-layers/${id}`, { method: "DELETE", withAuth: true })
