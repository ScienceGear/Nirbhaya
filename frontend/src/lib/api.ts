import { defaultContacts, incidents, mockRoutes, policeStations, type TrustedContact } from "@/lib/mockData";
import type { SharingPrefs } from "@/lib/auth";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:3000";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    headers: { "Content-Type": "application/json", ...(init?.headers || {}) },
    credentials: "include",
    ...init,
  });

  if (!response.ok) {
    throw new Error(`API request failed: ${response.status}`);
  }

  return response.json() as Promise<T>;
}

export async function getMapOverview() {
  try {
    return await request<{
      center: [number, number];
      policeStations: typeof policeStations;
      incidents: typeof incidents;
      clusters?: Array<{ id: string; lat: number; lng: number; count: number }>;
      routes: typeof mockRoutes;
      heatmap: Array<{ lat: number; lng: number; weight: number }>;
    }>("/api/map/overview");
  } catch {
    return {
      center: [73.8567, 18.5204] as [number, number],
      policeStations,
      incidents,
      clusters: [],
      routes: mockRoutes,
      heatmap: [],
    };
  }
}

export async function getContacts(userId = "demo") {
  try {
    return await request<TrustedContact[]>(`/api/contacts?userId=${encodeURIComponent(userId)}`);
  } catch {
    return defaultContacts;
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
    return await request<typeof incidents>("/api/reports");
  } catch {
    return incidents;
  }
}

export async function submitReport(data: {
  type: string;
  description: string;
  location: string;
  anonymous: boolean;
  lat?: number;
  lng?: number;
  areaRating: number;
  imageUrl?: string;
  reporterId?: string;
}) {
  return request<{ success: boolean; pointsAwarded: number; totalPoints: number }>("/api/reports", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function getUserPoints(userId: string) {
  return request<{ userId: string; totalPoints: number }>(`/api/points?userId=${encodeURIComponent(userId)}`);
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
  lastSOS: { type: string; timestamp: string; location: string; lat?: number; lng?: number } | null;
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
