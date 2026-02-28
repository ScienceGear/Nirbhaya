import { type PoliceStation, type Incident, type RouteOption, type TrustedContact } from "@/lib/mockData";
import type { SharingPrefs } from "@/lib/auth";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "";

/* ── Reverse Geocoding ── */
const _geoCache = new Map<string, string>();
let _geocoderReady: Promise<void> | null = null;

/** Ensure Google Maps geocoding library is loaded */
function ensureGeocoderLoaded(): Promise<void> {
  if ((window as any).google?.maps?.Geocoder) return Promise.resolve();
  if (_geocoderReady) return _geocoderReady;
  _geocoderReady = (async () => {
    try {
      // Dynamically import the loader (same one Dashboard uses)
      const loader = await import("@googlemaps/js-api-loader");
      (loader.setOptions as any)({ apiKey: "AIzaSyBHQJgdFNDxvNZeeDp9sbQGWW7eFn1arm0", version: "weekly" });
      await loader.importLibrary("geocoding");
    } catch { /* ignore */ }
  })();
  return _geocoderReady;
}

export async function reverseGeocode(lat: number, lng: number): Promise<string> {
  const key = `${lat.toFixed(5)},${lng.toFixed(5)}`;
  if (_geoCache.has(key)) return _geoCache.get(key)!;

  let result = "";

  // ── Strategy 1: Google Maps JS API Geocoder (most accurate for India) ──
  try {
    await ensureGeocoderLoaded();
    const g = (window as any).google;
    if (g?.maps?.Geocoder) {
      const geocoder = new g.maps.Geocoder();
      const response: any = await new Promise((resolve, reject) => {
        geocoder.geocode(
          { location: { lat, lng } },
          (results: any, status: any) => {
            if (status === "OK" && results?.length) resolve(results);
            else reject(status);
          }
        );
      });

      // Google returns results from most specific → least specific
      for (const r of response) {
        const types: string[] = r.types || [];
        if (
          types.some((t: string) =>
            ["point_of_interest", "establishment", "premise", "subpremise",
             "street_address", "route", "sublocality", "sublocality_level_1",
             "neighborhood"].includes(t)
          )
        ) {
          const parts: string[] = r.formatted_address
            .split(",")
            .map((s: string) => s.trim())
            .filter((p: string) => !/^\d{6}$/.test(p) && p !== "India");
          result = parts.slice(0, 3).join(", ");
          break;
        }
      }

      if (!result && response.length) {
        const parts: string[] = response[0].formatted_address
          .split(",")
          .map((s: string) => s.trim())
          .filter((p: string) => !/^\d{6}$/.test(p) && p !== "India");
        result = parts.slice(0, 3).join(", ");
      }
    }
  } catch {
    // Google JS API failed, fall through
  }

  // ── Strategy 2: Nominatim fallback ──
  if (!result) {
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&addressdetails=1&zoom=18`,
        { headers: { "Accept-Language": "en", "User-Agent": "NirbhayaSafetyApp/1.0" } }
      );
      const data = await res.json();
      if (data.display_name) {
        const parts = data.display_name.split(",").map((s: string) => s.trim()).filter(Boolean);
        const trimmed = parts.filter((p: string) => !["India", "Maharashtra"].includes(p));
        result = trimmed.slice(0, 3).join(", ");
      }
    } catch { /* Nominatim failed too */ }
  }

  if (!result) result = `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
  _geoCache.set(key, result);
  return result;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    headers: { "Content-Type": "application/json", ...(init?.headers || {}) },
    credentials: "include",
    ...init,
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error((body as any).message || `API request failed: ${response.status}`);
  }

  return response.json() as Promise<T>;
}

export async function getMapOverview(params?: { lat?: number; lng?: number; radiusKm?: number }) {
  try {
    const query = new URLSearchParams();
    if (params?.lat) query.set("lat", String(params.lat));
    if (params?.lng) query.set("lng", String(params.lng));
    if (params?.radiusKm) query.set("radiusKm", String(params.radiusKm));
    const suffix = query.toString() ? `?${query.toString()}` : "";
    return await request<{
      center: [number, number];
      policeStations: PoliceStation[];
      incidents: Incident[];
      clusters?: Array<{ id: string; lat: number; lng: number; count: number }>;
      routes: RouteOption[];
      heatmap: Array<{ lat: number; lng: number; weight: number }>;
    }>(`/api/map/overview${suffix}`);
  } catch (err: any) {
    console.error("getMapOverview failed:", err);
    return {
      center: [73.8567, 18.5204] as [number, number],
      policeStations: [],
      incidents: [],
      clusters: [],
      routes: [],
      heatmap: [],
    };
  }
}

export async function getContacts(userId = "demo") {
  try {
    return await request<TrustedContact[]>(`/api/contacts?userId=${encodeURIComponent(userId)}`);
  } catch {
    return [];
  }
}

export async function saveContacts(contacts: TrustedContact[], userId = "demo") {
  try {
    await request("/api/contacts", {
      method: "PUT",
      body: JSON.stringify({ userId, contacts }),
    });
  } catch {
    localStorage.setItem("sr-contacts", JSON.stringify(contacts));
  }
}

export async function triggerSos(type: string, userId = "demo") {
  return request<{ success: boolean; message: string }>("/api/sos", {
    method: "POST",
    body: JSON.stringify({ type, userId }),
  });
}

export async function getReports() {
  try {
    // Try user-specific reports first, fall back to public endpoint for guests
    let raw: any[];
    try {
      raw = await request<any[]>("/api/report/myreports");
    } catch {
      raw = await request<any[]>("/api/report/all");
    }
    // Normalise backend report documents into the Incident shape the UI expects
    return raw.map((r: any) => ({
      id: r._id || r.id || String(Math.random()),
      type: r.incidentType || r.type || "unsafe_area",
      description: r.description || "",
      lat: r.latitude ?? r.lat ?? 0,
      lng: r.longitude ?? r.lng ?? 0,
      timestamp: r.timestamp || new Date().toISOString(),
      anonymous: r.anonymous !== false,
      severity: typeof r.severity === "number"
        ? r.severity
        : r.severity === "High" ? 3 : r.severity === "Medium" ? 2 : 1,
      areaRating: r.areaRating,
      imageUrl: r.imageUrl || undefined,
      locationText: r.locationText || undefined,
      pointsAwarded: r.pointsAwarded,
    })) as Incident[];
  } catch (err: any) {
    console.error("getReports failed:", err);
    return [];
  }
}

export async function submitReport(data: {
  type: string;
  description: string;
  location: string;
  anonymous: boolean;
  lat?: number;
  lng?: number;
  severity?: string;
  areaRating: number;
  imageUrl?: string;
  reporterId?: string;
}) {
  // Map areaRating (1-5) to severity for the backend
  const severity = data.severity || (data.areaRating <= 2 ? "High" : data.areaRating <= 3 ? "Medium" : "Low");
  return request<{ success: boolean; pointsAwarded: number; totalPoints: number }>("/api/report/create", {
    method: "POST",
    body: JSON.stringify({ ...data, severity }),
  });
}

export async function getUserPoints(_userId?: string) {
  return request<{ userId: string; totalPoints: number }>("/api/report/points");
}

export async function getCrowdHeatmap(params?: { lat?: number; lng?: number; radiusKm?: number; hour?: number }) {
  const query = new URLSearchParams();
  if (typeof params?.lat === "number") query.set("lat", String(params.lat));
  if (typeof params?.lng === "number") query.set("lng", String(params.lng));
  if (typeof params?.radiusKm === "number") query.set("radiusKm", String(params.radiusKm));
  if (typeof params?.hour === "number") query.set("hour", String(params.hour));

  const suffix = query.toString() ? `?${query.toString()}` : "";
  return request<{
    center: [number, number];
    hour: number;
    points: Array<{ id: string; lat: number; lng: number; busyPct: number; weight: number; source: string }>;
    summary: { totalPoints: number; averageBusyPct: number };
  }>(`/api/crowd/heatmap${suffix}`);
}

/* ── Guardian & Sync APIs ── */

export interface CheckpointDetail {
  name: string;
  type: string;
  lat: number;
  lng: number;
  eta: string;
  passed: boolean;
}

export interface SOSAlert {
  type: string;
  timestamp: string;
  location: string;
  lat?: number;
  lng?: number;
}

export interface TripHistoryEntry {
  origin: string;
  destination: string;
  rsi: number;
  eta: string;
  distance: string;
  checkpoints: { name: string; type: string; passed: boolean }[];
  startedAt: string;
  endedAt: string;
}

export interface WatchedUser {
  _id: string;
  username: string;
  email: string;
  phone?: string;
  lastLocation: { lat: number; lng: number; accuracy?: number; updatedAt?: string } | null;
  batteryLevel: number | null;
  isNavigating: boolean | null;
  currentRoute: { origin: string; destination: string; rsi: number; eta: string; distance: string } | null;
  checkpointsPassed: number | null;
  checkpointsTotal: number | null;
  checkpoints: CheckpointDetail[];
  lastSOS: SOSAlert | null;
  sosAlerts: SOSAlert[];
  tripHistory: TripHistoryEntry[];
  sharingPrefs: SharingPrefs;
}

export async function linkGuardian(linkCode: string) {
  return request<{ message: string; linkedUser: { _id: string; username: string; email: string } }>("/api/auth/link-guardian", {
    method: "POST",
    body: JSON.stringify({ linkCode }),
  });
}

export async function getWatchedUsers() {
  return request<{ watched: WatchedUser[] }>("/api/auth/watched-users");
}

export async function updateSharingPrefs(sharingPrefs: Partial<SharingPrefs>) {
  return request<{ message: string; sharingPrefs: SharingPrefs }>("/api/auth/sharing-prefs", {
    method: "PUT",
    body: JSON.stringify({ sharingPrefs }),
  });
}

export async function updateLocation(data: {
  lat: number;
  lng: number;
  accuracy?: number;
  batteryLevel?: number;
  isNavigating?: boolean;
  currentRoute?: { origin: string; destination: string; rsi: number; eta: string; distance: string };
  checkpointsPassed?: number;
  checkpointsTotal?: number;
  checkpoints?: CheckpointDetail[];
}) {
  return request<{ message: string }>("/api/auth/update-location", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function logSOS(data: { type: string; lat?: number; lng?: number; location?: string }) {
  return request<{ message: string; points: number }>("/api/auth/log-sos", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function saveTripHistory(data: {
  origin: string;
  destination: string;
  rsi: number;
  eta: string;
  distance: string;
  checkpoints?: { name: string; type: string; passed: boolean }[];
  startedAt?: string;
}) {
  return request<{ message: string; count: number }>("/api/auth/save-trip", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

/* ── Admin APIs ── */
export async function adminGetAllReports() {
  return request<any[]>("/api/auth/admin/reports");
}

export async function adminGetAllUsers() {
  return request<any[]>("/api/auth/admin/users");
}

export async function adminGetAlerts() {
  return request<any[]>("/api/auth/admin/alerts");
}

/* ── Public: all reports for map ── */
export interface MapReport {
  _id: string;
  latitude: number;
  longitude: number;
  severity: string;
  incidentType: string;
  description: string;
  timestamp: string;
  areaRating: number;
}

export async function getAllReportsForMap() {
  try {
    return await request<MapReport[]>("/api/auth/all-reports");
  } catch {
    return [];
  }
}

/* ── Hex zones from backend ── */
export interface HexZoneData {
  hexId: string;
  dangerScore: number;
}

export async function getHexZones(lat: number, lng: number) {
  return request<HexZoneData[]>(`/api/hex/hexes?lat=${lat}&lng=${lng}`);
}

/* ── SafeCity API ── */
export interface SafeCityCategory {
  id: number;
  name: string;
  description?: string;
  icon?: string;
  color?: string;
}

export interface SafeCityIncident {
  id: string;
  type: string;
  description: string;
  lat: number;
  lng: number;
  timestamp: string;
  anonymous: boolean;
  severity: number;
  // Rich fields from SafeCity
  categories?: string;
  location?: string;
  dateText?: string;
  timeText?: string;
  age?: string;
  gender?: string;
}

export interface SafeCityIncidentDetails {
  id: string | number;
  description: string;
  category: string;
  categories: string;
  lat: number;
  lng: number;
  location: string;
  dateText: string;
  timeText: string;
  age: string;
  gender: string;
  createdAt: string;
  verified: boolean;
  anonymous: boolean;
  [key: string]: any; // raw fields from SafeCity
}

export interface SafeCityCluster {
  id: string;
  lat: number;
  lng: number;
  count: number;
}

/* ── Hospital Types ── */
export interface HospitalData {
  id: string;
  name: string;
  facilityType: string;
  wardNo: number;
  wardName: string;
  cityName: string;
  lat: number;
  lng: number;
}

/**
 * GET /api/hospitals/near — hospitals near a point
 */
export async function getHospitalsNear(params: {
  lat: number;
  lng: number;
  radiusKm?: number;
  limit?: number;
}): Promise<HospitalData[]> {
  const query = new URLSearchParams({
    lat: String(params.lat),
    lng: String(params.lng),
  });
  if (params.radiusKm) query.set("radiusKm", String(params.radiusKm));
  if (params.limit) query.set("limit", String(params.limit));
  try {
    const res = await request<{ hospitals: HospitalData[] }>(
      `/api/hospitals/near?${query.toString()}`
    );
    console.log("[API] getHospitalsNear response:", res);
    return res.hospitals ?? [];
  } catch (err) {
    console.error("[API] getHospitalsNear failed:", err);
    return [];
  }
}

/**
 * GET /api/hospitals/all — all hospitals (static dataset)
 */
export async function getAllHospitals(): Promise<HospitalData[]> {
  try {
    const res = await request<{ hospitals: HospitalData[] }>("/api/hospitals/all");
    return res.hospitals ?? [];
  } catch {
    return [];
  }
}

export interface SafeCityMapData {
  incidents: SafeCityIncident[];
  clusters: SafeCityCluster[];
  heatmap: Array<{ lat: number; lng: number; weight: number }>;
}

export interface SafeCityAllData {
  mapData: SafeCityMapData;
  categories: SafeCityCategory[];
  incidentDescriptions: any[];
  safetyDescriptions: any[];
}

/**
 * Get nearby SafeCity incidents (geo-query, served from MongoDB cache)
 */
export async function getSafeCityNearby(params: {
  lat: number;
  lng: number;
  radiusKm?: number;
  limit?: number;
  city?: string;
}): Promise<SafeCityIncident[]> {
  const query = new URLSearchParams({
    lat: String(params.lat),
    lng: String(params.lng),
  });
  if (params.radiusKm) query.set("radiusKm", String(params.radiusKm));
  if (params.limit) query.set("limit", String(params.limit));
  if (params.city) query.set("city", params.city);
  try {
    const res = await request<{ incidents: SafeCityIncident[] }>(
      `/api/safecity/near?${query.toString()}`
    );
    return res.incidents ?? [];
  } catch {
    return [];
  }
}

/**
 * Get map data (incidents, clusters, heatmap) from SafeCity
 */
export async function getSafeCityMapData(params?: {
  lat?: number;
  lng?: number;
  radiusKm?: number;
  mapZoom?: number;
  city?: string;
}): Promise<SafeCityMapData> {
  const query = new URLSearchParams();
  if (params?.lat) query.set("lat", String(params.lat));
  if (params?.lng) query.set("lng", String(params.lng));
  if (params?.radiusKm) query.set("radiusKm", String(params.radiusKm));
  if (params?.mapZoom) query.set("mapZoom", String(params.mapZoom));
  if (params?.city) query.set("city", params.city);

  const suffix = query.toString() ? `?${query.toString()}` : "";
  return request<SafeCityMapData>(`/api/safecity/map${suffix}`);
}

/**
 * Get all SafeCity data (map + categories + descriptions)
 */
export async function getSafeCityAllData(params?: {
  lat?: number;
  lng?: number;
  radiusKm?: number;
  mapZoom?: number;
  city?: string;
  client_id?: number;
  country_id?: number;
  lang_id?: number;
}): Promise<SafeCityAllData> {
  const query = new URLSearchParams();
  if (params?.lat) query.set("lat", String(params.lat));
  if (params?.lng) query.set("lng", String(params.lng));
  if (params?.radiusKm) query.set("radiusKm", String(params.radiusKm));
  if (params?.mapZoom) query.set("mapZoom", String(params.mapZoom));
  if (params?.city) query.set("city", params.city);
  if (params?.client_id) query.set("client_id", String(params.client_id));
  if (params?.country_id) query.set("country_id", String(params.country_id));
  if (params?.lang_id) query.set("lang_id", String(params.lang_id));

  const suffix = query.toString() ? `?${query.toString()}` : "";
  return request<SafeCityAllData>(`/api/safecity/all${suffix}`);
}

/**
 * Get incident categories from SafeCity
 */
export async function getSafeCityCategories(langId = 1): Promise<SafeCityCategory[]> {
  try {
    const result = await request<{ categories: SafeCityCategory[] }>(
      `/api/safecity/categories?lang_id=${langId}`
    );
    return result.categories;
  } catch {
    return [];
  }
}

/**
 * Get incident descriptions from SafeCity
 */
export async function getSafeCityIncidentDescriptions(params?: {
  client_id?: number;
  country_id?: number;
  lang_id?: number;
}): Promise<any[]> {
  try {
    const result = await request<{ descriptions: any[] }>("/api/safecity/incident-descriptions", {
      method: "POST",
      body: JSON.stringify({
        client_id: params?.client_id ?? 1,
        country_id: params?.country_id ?? 101,
        lang_id: params?.lang_id ?? 1,
      }),
    });
    return result.descriptions;
  } catch {
    return [];
  }
}

/**
 * Get safety descriptions from SafeCity
 */
export async function getSafeCitySafetyDescriptions(params?: {
  client_id?: number;
  country_id?: number;
  lang_id?: number;
}): Promise<any[]> {
  try {
    const result = await request<{ descriptions: any[] }>("/api/safecity/safety-descriptions", {
      method: "POST",
      body: JSON.stringify({
        client_id: params?.client_id ?? 1,
        country_id: params?.country_id ?? 101,
        lang_id: params?.lang_id ?? 1,
      }),
    });
    return result.descriptions;
  } catch {
    return [];
  }
}

/**
 * Get specific incident details from SafeCity
 */
export async function getSafeCityIncidentDetails(incidentId: number | string): Promise<SafeCityIncidentDetails | null> {
  try {
    return await request<SafeCityIncidentDetails>("/api/safecity/incident-details", {
      method: "POST",
      body: JSON.stringify({ incident_id: incidentId }),
    });
  } catch {
    return null;
  }
}
