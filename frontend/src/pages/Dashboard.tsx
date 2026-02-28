import { useState, useEffect, useRef, useCallback, useMemo, type ElementType } from "react";
import { Link, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search, Navigation, Shield, Layers, AlertTriangle, MapPin, Phone,
  Home, Map, Siren, FileWarning, Settings, Sun, Moon, LogOut, Star,
  User, ChevronDown, ChevronUp, X, Share2, ShieldCheck,
  Activity, Crosshair, ArrowUp, CornerUpRight, LocateFixed, Locate, BatteryLow,
  Car, Bike, Footprints,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import AISafetyAssistant from "@/components/AISafetyAssistant";
import {
  policeStations, incidents, PUNE_CENTER, demoLocations,
  safeZones, crimeHotspots,
  type RouteOption, type DemoLocation, type RouteCheckpoint,
} from "@/lib/mockData";
import { useTheme } from "@/lib/theme";
import { useAuth } from "@/lib/auth";
import SOSButton from "@/components/SOSButton";
import DashboardNav from "@/components/DashboardNav";
import GuestBanner from "@/components/GuestBanner";
import { MapContainer, TileLayer, Marker, Popup, Polyline, Circle, Polygon, useMap } from "react-leaflet";
import MarkerClusterGroup from "react-leaflet-cluster";
import L from "leaflet";
import { useQuery } from "@tanstack/react-query";
import { getCrowdHeatmap, getMapOverview, updateLocation, saveTripHistory, getAllReportsForMap, getHexZones, reverseGeocode, type MapReport, type HexZoneData } from "@/lib/api";
import { cellToBoundary } from "h3-js";
import { importLibrary, setOptions } from "@googlemaps/js-api-loader";

/* ─── Travel mode types ──────────────────────────────────────────────────── */
type TravelMode = "foot" | "car" | "bike";
const OSRM_PROFILE: Record<TravelMode, string> = { foot: "foot", car: "car", bike: "bike" };
const MODE_SPEED_KMH: Record<TravelMode, number> = { foot: 5, car: 30, bike: 15 };
const MODE_LABELS: Record<TravelMode, string> = { foot: "Walking", car: "Car", bike: "Bike" };

/* ─── Google Maps API config ─────────────────────────────────────────────── */
setOptions({ apiKey: "AIzaSyBHQJgdFNDxvNZeeDp9sbQGWW7eFn1arm0", version: "weekly" });

/* â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ Leaflet icon fix â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
});
/* ── SVG paths for map icons ── */
const SVG_SHIELD = `<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>`;
const SVG_WARNING = `<path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>`;
const SVG_HOSPITAL = `<path d="M18 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V4a2 2 0 00-2-2z"/><line x1="12" y1="6" x2="12" y2="18"/><line x1="6" y1="12" x2="18" y2="12"/>`;
const SVG_CHECK = `<polyline points="20 6 9 17 4 12"/>`;
const SVG_BUILDING = `<rect x="4" y="2" width="16" height="20" rx="2"/><line x1="9" y1="6" x2="9" y2="6.01"/><line x1="15" y1="6" x2="15" y2="6.01"/><line x1="9" y1="10" x2="9" y2="10.01"/><line x1="15" y1="10" x2="15" y2="10.01"/><line x1="9" y1="14" x2="9" y2="14.01"/><line x1="15" y1="14" x2="15" y2="14.01"/><line x1="9" y1="18" x2="15" y2="18"/>`;
const SVG_FIRE = `<path d="M8.5 14.5A2.5 2.5 0 0011 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 11-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 002.5 2.5z"/>`;

/** Build an icon with zoom-adaptive size. Below zoom-threshold it's a tiny dot. */
function makeZoomIcon(color: string, svgPath: string, zoom: number): L.DivIcon {
  const sz = zoom >= 17 ? 34 : zoom >= 15 ? 26 : zoom >= 13 ? 18 : zoom >= 11 ? 12 : 7;
  const bw = sz >= 24 ? 2.5 : sz >= 14 ? 2 : 1;
  const svgSz = Math.max(Math.round(sz * 0.48), 6);
  if (sz <= 10) {
    return L.divIcon({
      className: "",
      html: `<div style="background:${color};width:${sz}px;height:${sz}px;border-radius:50%;border:${bw}px solid rgba(255,255,255,.85);box-shadow:0 1px 3px rgba(0,0,0,.3);transition:width .15s,height .15s"></div>`,
      iconSize: [sz, sz], iconAnchor: [sz / 2, sz / 2],
    });
  }
  return L.divIcon({
    className: "",
    html: `<div style="display:flex;align-items:center;justify-content:center;width:${sz}px;height:${sz}px;border-radius:50%;background:${color};border:${bw}px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,.38);transition:width .15s,height .15s">
      <svg xmlns="http://www.w3.org/2000/svg" width="${svgSz}" height="${svgSz}" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">${svgPath}</svg>
    </div>`,
    iconSize: [sz, sz], iconAnchor: [sz / 2, sz / 2],
  });
}

/** Simple colored circle for start/end markers (no zoom scaling needed) */
const makeIcon = (color: string) =>
  L.divIcon({
    className: "",
    html: `<div style="background:${color};width:18px;height:18px;border-radius:50%;border:2.5px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,.35)"></div>`,
    iconSize: [18, 18], iconAnchor: [9, 9],
  });

/** Static icons for route endpoints */
const safeIconNew = makeIcon("#22c55e");
const destIconNew = makeIcon("#f43f5e");

/* â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ Helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
function resolveLocation2(input: string): DemoLocation | null {
  const n = input.trim().toLowerCase();
  if (!n) return null;
  // exact match
  const exact = demoLocations.find((l) => l.name.toLowerCase() === n);
  if (exact) return exact;
  // starts-with
  const sw = demoLocations.find((l) => l.name.toLowerCase().startsWith(n));
  if (sw) return sw;
  // any-word contains
  const words = n.split(/\s+/);
  const partial = demoLocations.find((l) =>
    words.some((w) => l.name.toLowerCase().includes(w))
  );
  if (partial) return partial;
  // fallback: synthesise coords near Pune from a UTF hash so it's consistent
  let h = 0;
  for (let i = 0; i < input.length; i++) h = (h * 31 + input.charCodeAt(i)) & 0xffff;
  return {
    name: input.trim(),
    lat: 18.52 + ((h & 0xff) - 127) * 0.0003,
    lng: 73.85 + (((h >> 8) & 0xff) - 127) * 0.0003,
  };
}

function filterLocations(q: string): DemoLocation[] {
  const n = q.trim().toLowerCase();
  if (!n) return demoLocations.slice(0, 6);
  const words = n.split(/\s+/);
  return demoLocations
    .filter((l) => words.some((w) => l.name.toLowerCase().includes(w)))
    .slice(0, 6);
}

type Suggestion =
  | { kind: "local"; loc: DemoLocation; distKm?: number }
  | { kind: "google"; label: string; placeId: string };

/* ─── LocationInput with Google Places autocomplete ─────────────────────── */
function LocationInput({
  value,
  onChange,
  onSelect,
  placeholder,
  dotColor,
  userLoc,
}: {
  value: string;
  onChange: (v: string) => void;
  onSelect: (loc: DemoLocation) => void;
  placeholder: string;
  dotColor: string;
  userLoc?: { lat: number; lng: number } | null;
}) {
  const [open, setOpen] = useState(false);
  const [focused, setFocused] = useState(false);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const wrapRef = useRef<HTMLDivElement>(null);
  const acRef = useRef<google.maps.places.AutocompleteService | null>(null);
  const showDrop = focused && suggestions.length > 0;

  // Initialise Google Places service via the new functional API
  useEffect(() => {
    if (window.google?.maps?.places && !acRef.current) {
      acRef.current = new window.google.maps.places.AutocompleteService();
      return;
    }
    if (!acRef.current) {
      importLibrary("places").then(() => {
        if (window.google?.maps?.places)
          acRef.current = new window.google.maps.places.AutocompleteService();
      }).catch(() => {});
    }
  }, []);

  const fetchSuggestions = useCallback((q: string) => {
    const local: Suggestion[] = filterLocations(q).map((loc) => ({
      kind: "local" as const,
      loc,
      distKm: userLoc ? haversineKm(userLoc.lat, userLoc.lng, loc.lat, loc.lng) : undefined,
    }));
    if (!acRef.current || q.trim().length < 2) {
      setSuggestions(local.slice(0, 6));
      return;
    }
    acRef.current.getPlacePredictions(
      {
        input: q + (q.toLowerCase().includes("pune") ? "" : " Pune"),
        componentRestrictions: { country: "IN" },
        location: new window.google.maps.LatLng(18.5204, 73.8567),
        radius: 35000,
      },
      (predictions, status) => {
        const google_sugg: Suggestion[] =
          status === window.google.maps.places.PlacesServiceStatus.OK && predictions
            ? predictions.slice(0, 4).map((p) => ({
                kind: "google" as const,
                label: p.description,
                placeId: p.place_id,
              }))
            : [];
        // merge: local first, then google extras not already in local
        const localNames = new Set(local.map((s) => s.loc.name.toLowerCase()));
        const filtered = google_sugg.filter(
          (g) => !localNames.has(g.label.split(",")[0].trim().toLowerCase())
        );
        setSuggestions([...local.slice(0, 3), ...filtered].slice(0, 7));
      }
    );
  }, []);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setFocused(false); setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleSelect = (s: Suggestion) => {
    if (s.kind === "local") {
      onChange(s.loc.name);
      onSelect(s.loc);
      setFocused(false); setOpen(false);
    } else {
      // Geocode the Google Place to get lat/lng
      importLibrary("geocoding").then(() => {
        const geocoder = new window.google.maps.Geocoder();
        geocoder.geocode({ placeId: s.placeId }, (results, status) => {
        if (status === "OK" && results?.[0]) {
          const g = results[0].geometry.location;
          const name = s.label.split(",")[0].trim();
          onChange(name);
          onSelect({ name, lat: g.lat(), lng: g.lng() });
        } else {
          const fallback = resolveLocation2(s.label.split(",")[0]);
          const name = s.label.split(",")[0].trim();
          onChange(name);
          if (fallback) onSelect(fallback);
        }
        setFocused(false); setOpen(false);
      });
      }).catch(() => {
        const fallback = resolveLocation2(s.label.split(",")[0]);
        const name = s.label.split(",")[0].trim();
        onChange(name);
        if (fallback) onSelect(fallback);
        setFocused(false); setOpen(false);
      });
    }
  };

  return (
    <div ref={wrapRef} className="relative">
      <span
        className="absolute left-3 top-1/2 -translate-y-1/2 h-2.5 w-2.5 rounded-full border-2 border-background z-10"
        style={{ background: dotColor }}
      />
      <input
        type="text"
        value={value}
        placeholder={placeholder}
        autoComplete="off"
        className="flex h-9 w-full rounded-xl border border-input bg-background px-3 py-1 pl-9 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        onChange={(e) => {
          onChange(e.target.value);
          setFocused(true); setOpen(true);
          fetchSuggestions(e.target.value);
        }}
        onFocus={() => {
          setFocused(true); setOpen(true);
          fetchSuggestions(value);
        }}
        onKeyDown={(e) => {
          if (e.key === "Escape") { setFocused(false); setOpen(false); }
          if (e.key === "Enter") {
            const match = resolveLocation2(value);
            if (match) { onSelect(match); setFocused(false); setOpen(false); }
          }
        }}
      />
      <AnimatePresence>
        {showDrop && open && (
          <motion.ul
            key="drop"
            initial={{ opacity: 0, y: -4, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.98 }}
            transition={{ duration: 0.13 }}
            className="absolute left-0 right-0 top-full mt-1 z-[900] rounded-xl border border-border bg-card/97 backdrop-blur-xl shadow-elevated overflow-y-auto max-h-60"
          >
            {suggestions.map((s, i) => (
              <li key={s.kind === "local" ? s.loc.name : s.placeId + i}>
                <button
                  type="button"
                  className="flex w-full items-center gap-2.5 px-3 py-2 text-sm hover:bg-muted transition-colors text-left"
                  onMouseDown={(e) => { e.preventDefault(); handleSelect(s); }}
                >
                  {s.kind === "google" ? (
                    <img src="https://maps.gstatic.com/mapfiles/api-3/images/autocomplete-icons.png"
                      alt="G" className="h-3.5 w-3.5 shrink-0 object-none"
                      style={{ objectPosition: "-1px -161px" }} />
                  ) : (
                    <MapPin className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                  )}
                  <span className="truncate">
                    {s.kind === "local" ? s.loc.name : s.label}
                  </span>
                  {s.kind === "local" && typeof s.distKm === "number" && (
                    <span className="ml-auto text-[10px] text-muted-foreground/70 shrink-0 tabular-nums">
                      {s.distKm < 1 ? `${Math.round(s.distKm * 1000)} m` : `${s.distKm.toFixed(1)} km`}
                    </span>
                  )}
                  {s.kind === "google" && (
                    <span className="ml-auto text-[9px] text-muted-foreground/60 shrink-0">Google</span>
                  )}
                </button>
              </li>
            ))}
          </motion.ul>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ── OSRM helper: fetch a single real-road route between waypoints ── */
async function osrmFetch(
  waypoints: { lat: number; lng: number }[],
  alternatives: boolean = false,
  profile: string = "foot",
): Promise<any[]> {
  const coords = waypoints.map((w) => `${w.lng},${w.lat}`).join(";");
  const url =
    `https://router.project-osrm.org/route/v1/${profile}/${coords}` +
    `?overview=full&geometries=geojson&steps=true${alternatives ? "&alternatives=true" : ""}`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12000);
  try {
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timeout);
    if (!res.ok) return [];
    const data = await res.json();
    if (data.code !== "Ok" || !data.routes?.length) return [];
    return data.routes;
  } catch {
    clearTimeout(timeout);
    return [];
  }
}

/* ── Generate offset waypoints to force OSRM to produce distinct real-road routes ── */
function offsetWaypoint(
  s: { lat: number; lng: number },
  e: { lat: number; lng: number },
  factor: number,
): { lat: number; lng: number } {
  const midLat = (s.lat + e.lat) / 2;
  const midLng = (s.lng + e.lng) / 2;
  const dLat = e.lat - s.lat;
  const dLng = e.lng - s.lng;
  // perpendicular offset
  return {
    lat: midLat + dLng * factor,
    lng: midLng - dLat * factor,
  };
}

/* ── Haversine ── */
function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  return 2 * R * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/* ── Extract turn-by-turn steps from OSRM response ── */
function extractSteps(route: any): Array<{ instruction: string; distance: number; duration: number; location: [number, number] }> {
  const steps: Array<{ instruction: string; distance: number; duration: number; location: [number, number] }> = [];
  if (!route?.legs) return steps;
  for (const leg of route.legs) {
    for (const step of leg.steps || []) {
      const maneuver = step.maneuver || {};
      const mod = maneuver.modifier ? ` ${maneuver.modifier}` : "";
      const name = step.name ? ` onto ${step.name}` : "";
      const instruction = `${(maneuver.type || "continue").replace(/_/g, " ")}${mod}${name}`;
      steps.push({
        instruction: instruction.charAt(0).toUpperCase() + instruction.slice(1),
        distance: step.distance || 0,
        duration: step.duration || 0,
        location: maneuver.location || [0, 0],
      });
    }
  }
  return steps.filter((s) => s.distance > 5); // skip degenerate micro-steps
}

/* ── Generate checkpoints along a route from nearby safe infrastructure ── */
function generateCheckpoints(
  coords: [number, number][],
  stationData: typeof policeStations,
  speedKmH = 5,
): RouteCheckpoint[] {
  if (coords.length < 2) return [];

  // Pre-compute cumulative distance along the route (km)
  const cumDist: number[] = [0];
  for (let i = 1; i < coords.length; i++) {
    cumDist.push(
      cumDist[i - 1] +
        haversineKm(coords[i - 1][1], coords[i - 1][0], coords[i][1], coords[i][0]),
    );
  }
  const totalKm = cumDist[cumDist.length - 1];

  // Build a list of nearby POIs (safe zones + police stations)
  type POI = { name: string; lat: number; lng: number; type: RouteCheckpoint["type"]; distAlongRoute: number };
  const candidates: POI[] = [];

  const step = Math.max(1, Math.floor(coords.length / 120));

  // Check safe zones
  safeZones.forEach((sz) => {
    let bestDist = Infinity;
    let bestIdx = 0;
    for (let i = 0; i < coords.length; i += step) {
      const d = haversineKm(coords[i][1], coords[i][0], sz.lat, sz.lng);
      if (d < bestDist) { bestDist = d; bestIdx = i; }
    }
    if (bestDist <= 0.5) {
      candidates.push({
        name: sz.name,
        lat: sz.lat,
        lng: sz.lng,
        type: sz.type === "hospital" ? "hospital" : sz.type === "police" ? "police" : "commercial",
        distAlongRoute: cumDist[Math.min(bestIdx, cumDist.length - 1)],
      });
    }
  });

  // Check police stations
  stationData.forEach((ps) => {
    let bestDist = Infinity;
    let bestIdx = 0;
    for (let i = 0; i < coords.length; i += step) {
      const d = haversineKm(coords[i][1], coords[i][0], ps.lat, ps.lng);
      if (d < bestDist) { bestDist = d; bestIdx = i; }
    }
    if (bestDist <= 0.6) {
      candidates.push({
        name: ps.name,
        lat: ps.lat,
        lng: ps.lng,
        type: "police",
        distAlongRoute: cumDist[Math.min(bestIdx, cumDist.length - 1)],
      });
    }
  });

  // Deduplicate (same name within 200m)
  const unique: POI[] = [];
  candidates.sort((a, b) => a.distAlongRoute - b.distAlongRoute);
  for (const c of candidates) {
    if (!unique.some((u) => u.name === c.name || haversineKm(u.lat, u.lng, c.lat, c.lng) < 0.2)) {
      unique.push(c);
    }
  }

  // Limit to 5 spread-out checkpoints (skip if too close to start or end)
  const minDist = totalKm * 0.05;
  const filtered = unique.filter(
    (p) => p.distAlongRoute > minDist && p.distAlongRoute < totalKm - minDist,
  );
  const picked = filtered.slice(0, 5);

  return picked.map((p) => ({
    name: p.name,
    type: p.type,
    lat: p.lat,
    lng: p.lng,
    eta: `${Math.max(1, Math.round((p.distAlongRoute / speedKmH) * 60))} min`,
    passed: false,
  }));
}

/* ── OSRM real-road routing — ALWAYS returns real road geometries, never bezier curves ── */
async function fetchRealRoutes(
  s: { lat: number; lng: number },
  e: { lat: number; lng: number },
  incidentData: Array<{ lat: number; lng: number; severity: number; areaRating?: number }> = [],
  mode: TravelMode = "foot",
): Promise<RouteOption[]> {
  const computeRoutePenalty = (coords: [number, number][]) => {
    if (!incidentData.length || !coords.length) return 0;
    const step = Math.max(1, Math.floor(coords.length / 80));
    let penalty = 0;
    incidentData.forEach((incident) => {
      let minDist = Infinity;
      for (let i = 0; i < coords.length; i += step) {
        const [lng, lat] = coords[i];
        const dist = haversineKm(lat, lng, incident.lat, incident.lng);
        if (dist < minDist) minDist = dist;
      }
      if (minDist <= 1.2) {
        const ratingRisk = typeof incident.areaRating === "number" ? Math.max(0, 3 - incident.areaRating) : 0;
        penalty += (incident.severity || 1) * (1.3 - Math.min(minDist, 1)) + ratingRisk * 1.5;
      }
    });
    return Math.min(35, Math.round(penalty));
  };

  const COLOR = ["#22c55e", "#f59e0b", "#ef4444"];
  const NAMES = ["Safest via Main Roads", "Balanced Route", "Fastest Direct"];
  const TYPES = ["safest", "moderate", "fastest"] as const;
  const BASE_RSI = [88, 72, 54];
  const REASONS = [
    ["Better-lit segments", "Lower incident density", "More support points nearby"],
    ["Balanced time and safety", "Mixed main + inner roads", "Moderate CCTV coverage"],
    ["Lowest ETA", "Direct road geometry", "Avoid if you prefer higher safety score"],
  ];

  const toRoute = (raw: any, i: number): RouteOption => {
    const coords = raw.geometry.coordinates as [number, number][];
    const routePenalty = computeRoutePenalty(coords);
    const adjustedRsi = Math.max(20, BASE_RSI[Math.min(i, 2)] - routePenalty);
    const reasons = [...REASONS[Math.min(i, 2)]];
    if (routePenalty >= 5) reasons.push("Community reports near this area lowered RSI");
    return {
      id: `r${i + 1}`,
      name: NAMES[Math.min(i, 2)],
      type: TYPES[Math.min(i, 2)],
      rsi: adjustedRsi,
      duration: `${Math.max(1, Math.round(raw.duration / 60))} min`,
      distance: `${(raw.distance / 1000).toFixed(1)} km`,
      color: COLOR[Math.min(i, 2)],
      reasons,
      coordinates: coords,
      steps: extractSteps(raw),
      checkpoints: generateCheckpoints(coords, policeStations, MODE_SPEED_KMH[mode]),
    } as RouteOption & { steps?: any[] };
  };

  const profile = OSRM_PROFILE[mode];

  // Step 1: Try direct OSRM call with alternatives
  const directRoutes = await osrmFetch([s, e], true, profile);
  const collected: any[] = [...directRoutes];

  // Step 2: If we don't have 3 routes yet, generate waypoint-offset routes on real roads
  if (collected.length < 3) {
    const offsets = [0.35, -0.35, 0.6, -0.6];
    for (const factor of offsets) {
      if (collected.length >= 3) break;
      const via = offsetWaypoint(s, e, factor);
      const viaRoutes = await osrmFetch([s, via, e], false, profile);
      if (viaRoutes.length > 0) {
        // Check it's actually different from existing routes (> 200m divergence)
        const isDifferent = collected.every((existing) => {
          const eMid = existing.geometry.coordinates[Math.floor(existing.geometry.coordinates.length / 2)];
          const nMid = viaRoutes[0].geometry.coordinates[Math.floor(viaRoutes[0].geometry.coordinates.length / 2)];
          return haversineKm(eMid[1], eMid[0], nMid[1], nMid[0]) > 0.2;
        });
        if (isDifferent) collected.push(viaRoutes[0]);
      }
    }
  }

  // Step 3: If we still don't have 3 (edge case: very short route), duplicate with slight variation
  while (collected.length < 3 && collected.length > 0) {
    collected.push(collected[collected.length - 1]);
  }

  if (collected.length === 0) {
    // Absolute last resort: return a straight-line route so the app doesn't break
    const fallbackCoords: [number, number][] = [[s.lng, s.lat], [e.lng, e.lat]];
    return TYPES.map((type, i) => ({
      id: `r${i + 1}`,
      name: NAMES[i],
      type,
      rsi: BASE_RSI[i],
      duration: `${Math.max(1, Math.round(haversineKm(s.lat, s.lng, e.lat, e.lng) / MODE_SPEED_KMH[mode] * 60))} min`,
      distance: `${haversineKm(s.lat, s.lng, e.lat, e.lng).toFixed(1)} km`,
      color: COLOR[i],
      reasons: REASONS[i],
      coordinates: fallbackCoords,
    }));
  }

  // Sort: longest first (safest tends to go around), shortest last (fastest)
  collected.sort((a, b) => b.distance - a.distance);
  return collected.slice(0, 3).map((raw, i) => toRoute(raw, i));
}

/* ── Gemini 2.5 Flash route safety analysis ── */
const GEMINI_API_KEY = "AIzaSyBobtdTj_dANiuRX1UNjKFFsA295cQNwes";
const GEMINI_ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`;

interface AIRouteAnalysis {
  rsi: number;
  risk: "safe" | "moderate" | "risky";
  name: string;
  reasons: string[];
}

async function analyzeRoutesWithAI(
  routes: Array<{
    distance: string;
    duration: string;
    nearbyIncidents: number;
    highSeverityCount: number;
    nearestPoliceStation: number;
  }>,
  origin: string,
  destination: string,
  modeLabel: string = "walking",
): Promise<AIRouteAnalysis[]> {
  const prompt = `You are a women's safety routing AI for Pune, India.
Analyze these ${routes.length} ${modeLabel} route alternatives from "${origin}" to "${destination}" and return a safety score for each.

Route data:
${routes.map((r, i) =>
  `Route ${i + 1}: distance=${r.distance}, duration=${r.duration}, ` +
  `incidents_within_500m=${r.nearbyIncidents}, high_severity_incidents=${r.highSeverityCount}, ` +
  `nearest_police_station=${r.nearestPoliceStation.toFixed(2)}km`
).join("\n")}

Scoring logic:
- Start each route at RSI 85
- Subtract 4 per incident within 500m (max -28)
- Subtract 8 per high-severity incident (max -24)
- Add 6 if nearest police station < 0.5km, add 3 if < 1km
- Longer routes that avoid incidents should score HIGHER than short direct ones
- Final RSI must be between 10 and 97 and must differ between routes by at least 8 points
- rsi 80-97 = safe, 55-79 = moderate, 10-54 = risky

Return ONLY a valid JSON array, no markdown, no explanation:
[
  {"rsi": <number>, "risk": "<safe|moderate|risky>", "name": "<descriptive route name>", "reasons": ["<reason1>", "<reason2>", "<reason3>"]},
  {"rsi": <number>, "risk": "<safe|moderate|risky>", "name": "<descriptive route name>", "reasons": ["<reason1>", "<reason2>", "<reason3>"]},
  {"rsi": <number>, "risk": "<safe|moderate|risky>", "name": "<descriptive route name>", "reasons": ["<reason1>", "<reason2>", "<reason3>"]}
]

Names must be distinct and descriptive (e.g. "Safest via Main Roads", "Balanced Route", "Fastest Direct").
Reasons must be short, specific, safety-focused (e.g. street lighting, police proximity, incident density).`;

  try {
    const res = await fetch(GEMINI_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.2, maxOutputTokens: 700 },
      }),
    });
    if (!res.ok) {
      const errBody = await res.text().catch(() => "");
      throw new Error(`Gemini ${res.status}: ${errBody}`);
    }
    const data = await res.json();
    const text: string = data.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
    const match = text.match(/\[[\s\S]*?\]/);
    if (!match) throw new Error("No JSON array in Gemini response");
    const parsed: AIRouteAnalysis[] = JSON.parse(match[0]);
    if (!Array.isArray(parsed) || parsed.length === 0) throw new Error("Empty Gemini response");
    // Ensure exactly 3 entries
    while (parsed.length < 3) parsed.push(parsed[parsed.length - 1]);
    return parsed.slice(0, 3);
  } catch (err) {
    console.warn("[Gemini] AI analysis failed, using heuristic fallback:", err);
    return [];
  }
}

/* ── Smart safe-route scoring: OSRM geometry + Gemini 2.5 Flash safety analysis ── */
async function fetchGoogleMapsRoutes(
  s: { lat: number; lng: number },
  e: { lat: number; lng: number },
  incidentData: Array<{ lat: number; lng: number; severity: number }> = [],
  mode: TravelMode = "foot",
): Promise<RouteOption[]> {
  const COLOR_MAP = { safe: "#22c55e", moderate: "#f59e0b", risky: "#ef4444" };
  const FALLBACK_COLOR = ["#22c55e", "#f59e0b", "#ef4444"];
  const FALLBACK_NAMES = ["Safest via Main Roads", "Balanced Route", "Fastest Direct"];
  const FALLBACK_TYPES = ["safest", "moderate", "fastest"] as const;
  const FALLBACK_RSI = [88, 72, 54];
  const FALLBACK_REASONS = [
    ["Better-lit main roads", "Lower incident density", "More police coverage nearby"],
    ["Balanced time and safety", "Mixed main + inner roads", "Moderate risk level"],
    ["Lowest travel time", "Direct road geometry", "Higher risk — use with caution"],
  ];

  /* ── Helper: count incidents near a route ── */
  const countNearby = (coords: [number, number][], radiusKm: number) => {
    if (!incidentData.length) return { total: 0, high: 0 };
    const step = Math.max(1, Math.floor(coords.length / 60));
    let total = 0, high = 0;
    incidentData.forEach((inc) => {
      let minDist = Infinity;
      for (let i = 0; i < coords.length; i += step) {
        const d = haversineKm(coords[i][1], coords[i][0], inc.lat, inc.lng);
        if (d < minDist) minDist = d;
      }
      if (minDist <= radiusKm) { total++; if (inc.severity >= 3) high++; }
    });
    return { total, high };
  };

  const nearestPolice = (coords: [number, number][]) => {
    if (!policeStations.length || !coords.length) return 999;
    const mid = coords[Math.floor(coords.length / 2)];
    return Math.min(...policeStations.map((ps) => haversineKm(mid[1], mid[0], ps.lat, ps.lng)));
  };

  // Step 1 — Get real OSRM road geometry
  let rawRoutes = await fetchRealRoutes(s, e, incidentData, mode);

  // Step 2 — Build stats per route for AI
  const routeStats = rawRoutes.map((r) => {
    const { total, high } = countNearby(r.coordinates, 0.5);
    return {
      distance: r.distance,
      duration: r.duration,
      nearbyIncidents: total,
      highSeverityCount: high,
      nearestPoliceStation: nearestPolice(r.coordinates),
    };
  });

  // Step 3 — Ask AI to analyze and score
  // Reverse-geocode origin & destination for AI context (non-blocking)
  let originName = `${s.lat.toFixed(4)},${s.lng.toFixed(4)}`;
  let destName   = `${e.lat.toFixed(4)},${e.lng.toFixed(4)}`;
  try {
    const [oName, dName] = await Promise.all([
      reverseGeocode(s.lat, s.lng),
      reverseGeocode(e.lat, e.lng),
    ]);
    if (oName) originName = oName;
    if (dName) destName = dName;
  } catch { /* keep coordinate fallback */ }
  const aiResults  = await analyzeRoutesWithAI(routeStats, originName, destName, MODE_LABELS[mode]);

  // Step 4 — Merge AI analysis back into routes
  return rawRoutes.map((r, i) => {
    const ai = aiResults[i];
    if (ai) {
      const riskType = ai.risk === "safe" ? "safest" : ai.risk === "moderate" ? "moderate" : "fastest";
      return {
        ...r,
        id: `r${i + 1}`,
        name: ai.name || FALLBACK_NAMES[i],
        type: riskType as RouteOption["type"],
        rsi: Math.min(100, Math.max(10, Math.round(ai.rsi))),
        color: COLOR_MAP[ai.risk] ?? FALLBACK_COLOR[i],
        reasons: ai.reasons?.length ? ai.reasons : FALLBACK_REASONS[i],
      };
    }
    // AI didn't return enough results — keep OSRM fallback values
    return {
      ...r,
      id: `r${i + 1}`,
      name: FALLBACK_NAMES[i],
      type: FALLBACK_TYPES[i],
      rsi: FALLBACK_RSI[i],
      color: FALLBACK_COLOR[i],
      reasons: FALLBACK_REASONS[i],
    };
  });
}

function computeBearing(prev: { lat: number; lng: number }, next: { lat: number; lng: number }) {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const toDeg = (rad: number) => (rad * 180) / Math.PI;
  const lat1 = toRad(prev.lat);
  const lat2 = toRad(next.lat);
  const dLon = toRad(next.lng - prev.lng);
  const y = Math.sin(dLon) * Math.cos(lat2);
  const x =
    Math.cos(lat1) * Math.sin(lat2) -
    Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon);
  const brng = toDeg(Math.atan2(y, x));
  return (brng + 360) % 360;
}

function getRouteSummary(route: RouteOption) {
  if (route.reasons?.length) return route.reasons;
  if (route.type === "safest") return ["Better lighting", "More public activity", "Higher confidence score"];
  if (route.type === "moderate") return ["Balanced ETA and safety", "Mixed road profile", "Stable traffic confidence"];
  return ["Lowest ETA", "Most direct option", "Lower overall safety score"];
}

function makeUserArrowIcon(heading: number) {
  return L.divIcon({
    className: "",
    html: `<div style="position:relative;width:24px;height:24px;transform:rotate(${heading}deg)"><div style="position:absolute;left:7px;top:2px;width:0;height:0;border-left:5px solid transparent;border-right:5px solid transparent;border-bottom:12px solid #2563eb"></div><div style="position:absolute;left:8px;bottom:2px;width:8px;height:8px;border-radius:50%;background:#2563eb;border:2px solid white;box-shadow:0 0 0 4px rgba(37,99,235,.2)"></div></div>`,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
  });
}

/* ── Map controller: centers on a point OR fits the full route in view ── */
function MapController({
  center,
  routeCoords,
  userLoc: mapUserLoc,
}: {
  center: [number, number];
  routeCoords?: [number, number][];
  userLoc?: { lat: number; lng: number } | null;
}) {
  const map = useMap();
  useEffect(() => {
    if (routeCoords && routeCoords.length >= 2) {
      const latlngs = routeCoords.map(([lng, lat]) => L.latLng(lat, lng));
      map.fitBounds(L.latLngBounds(latlngs), { padding: [60, 60], maxZoom: 16 });
    } else {
      map.setView(center, 13);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [routeCoords, center]);

  /* Expose recenter-to-user via window for the Locate button */
  useEffect(() => {
    (window as any).__mapGoToUser = () => {
      if (mapUserLoc) map.setView([mapUserLoc.lat, mapUserLoc.lng], 15, { animate: true });
    };
    return () => { delete (window as any).__mapGoToUser; };
  }, [mapUserLoc, map]);

  return null;
}

const rsiColor2 = (v: number) => v >= 80 ? "text-emerald-500" : v >= 60 ? "text-amber-500" : "text-red-500";
const rsiBg2   = (v: number) =>
  v >= 80 ? "bg-emerald-500/10 border-emerald-500/30"
  : v >= 60 ? "bg-amber-500/10 border-amber-500/30"
  : "bg-red-500/10 border-red-500/30";

/* ─── Star Rating helper ─────────────────────────────────────────────────── */
function StarRating({ value, onChange }: { value: number; onChange: (n: number) => void }) {
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((n) => (
        <button key={n} type="button" onClick={() => onChange(n)}
          className={`text-xl transition-colors ${n <= value ? "text-amber-400" : "text-muted-foreground/30"}`}>
          ★
        </button>
      ))}
    </div>
  );
}

/* ─── Emergency Modal ────────────────────────────────────────────────────── */
function EmergencyModal({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-[9000] flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <motion.div initial={{ scale: 0.85, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
        className="relative w-full max-w-sm mx-4 rounded-3xl bg-gradient-to-br from-red-900/90 to-red-700/90 border border-red-500/40 p-8 text-white shadow-2xl">
        <button onClick={onClose} className="absolute top-4 right-4 text-white/70 hover:text-white text-2xl font-bold">×</button>
        <div className="flex items-center gap-3 mb-6">
          <div className="h-12 w-12 rounded-full bg-red-500/30 flex items-center justify-center">
            <Siren className="h-6 w-6 text-red-300" />
          </div>
          <div>
            <h2 className="text-xl font-bold">🚨 EMERGENCY ACTIVATED</h2>
            <p className="text-sm text-red-200/80">Authorities have been notified</p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3 mb-6">
          {[
            { num: "100",  label: "Police Emergency" },
            { num: "108",  label: "Ambulance" },
            { num: "1091", label: "Women Helpline" },
            { num: "181",  label: "Women Safety" },
          ].map(({ num, label }) => (
            <a key={num} href={`tel:${num}`}
              className="flex flex-col items-center p-4 rounded-2xl bg-white/10 border border-white/20 hover:bg-white/20 transition-colors text-center">
              <Phone className="h-4 w-4 mb-1 text-red-300" />
              <span className="text-2xl font-bold">{num}</span>
              <span className="text-xs text-red-200/80 mt-0.5">{label}</span>
            </a>
          ))}
        </div>
        <ul className="text-sm space-y-1 text-red-100/90 mb-6">
          <li>📍 Location shared with emergency contacts</li>
          <li>🔔 Local authorities have been notified</li>
          <li>🚨 Stay calm and seek immediate help</li>
        </ul>
        <Button onClick={onClose} variant="outline"
          className="w-full rounded-xl border-white/30 text-white bg-white/10 hover:bg-white/20">
          Close Emergency Panel
        </Button>
      </motion.div>
    </div>
  );
}

/* ─── Report Incident Modal ──────────────────────────────────────────────── */
function ReportModal({ onClose }: { onClose: () => void }) {
  const [type, setType] = useState("");
  const [loc, setLoc] = useState("");
  const [details, setDetails] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    setTimeout(onClose, 2000);
  };

  return (
    <div className="fixed inset-0 z-[9000] flex items-center justify-center bg-black/75 backdrop-blur-sm">
      <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
        className="relative w-full max-w-md mx-4 rounded-3xl bg-card border border-border p-6 shadow-2xl">
        <button onClick={onClose} className="absolute top-4 right-4 text-muted-foreground hover:text-foreground">
          <X className="h-5 w-5" />
        </button>
        <div className="flex items-center gap-3 mb-5">
          <div className="h-10 w-10 rounded-full bg-amber-500/15 flex items-center justify-center">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
          </div>
          <h2 className="text-lg font-bold">⚠️ Report Safety Incident</h2>
        </div>
        {submitted ? (
          <div className="py-8 text-center">
            <ShieldCheck className="h-12 w-12 text-emerald-500 mx-auto mb-3" />
            <p className="font-semibold text-emerald-500">Report Submitted!</p>
            <p className="text-sm text-muted-foreground mt-1">Thank you for making Pune safer.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-1 block">Incident Type</label>
              <select required value={type} onChange={(e) => setType(e.target.value)}
                className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring">
                <option value="">Select type...</option>
                <option>Poor street lighting</option>
                <option>Suspicious activity observed</option>
                <option>Harassment incident</option>
                <option>Unsafe area conditions</option>
                <option>Broken streetlight / infrastructure</option>
                <option>Other safety concern</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Location / Landmark</label>
              <input required value={loc} onChange={(e) => setLoc(e.target.value)}
                placeholder="Describe location or landmark"
                className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring" />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Details (optional)</label>
              <textarea value={details} onChange={(e) => setDetails(e.target.value)}
                placeholder="Add any extra details..." rows={3}
                className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-ring" />
            </div>
            <div className="flex gap-2 pt-1">
              <Button type="button" variant="outline" className="flex-1 rounded-xl" onClick={onClose}>Cancel</Button>
              <Button type="submit" className="flex-1 rounded-xl bg-amber-500 hover:bg-amber-600 text-white">Submit Report</Button>
            </div>
          </form>
        )}
      </motion.div>
    </div>
  );
}

/* ─── Review Route Modal ─────────────────────────────────────────────────── */
function ReviewModal({ routeName, onClose }: { routeName: string; onClose: () => void }) {
  const [safety, setSafety] = useState(0);
  const [lighting, setLighting] = useState(0);
  const [crowd, setCrowd] = useState(0);
  const [comment, setComment] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    setTimeout(onClose, 2000);
  };

  return (
    <div className="fixed inset-0 z-[9000] flex items-center justify-center bg-black/75 backdrop-blur-sm">
      <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
        className="relative w-full max-w-md mx-4 rounded-3xl bg-card border border-border p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
        <button onClick={onClose} className="absolute top-4 right-4 text-muted-foreground hover:text-foreground">
          <X className="h-5 w-5" />
        </button>
        <div className="flex items-center gap-3 mb-5">
          <Star className="h-6 w-6 text-amber-400" />
          <div>
            <h2 className="text-lg font-bold">⭐ Review Route Safety</h2>
            <p className="text-xs text-muted-foreground truncate max-w-[220px]">{routeName}</p>
          </div>
        </div>
        {submitted ? (
          <div className="py-8 text-center">
            <Star className="h-12 w-12 text-amber-400 mx-auto mb-3" />
            <p className="font-semibold text-amber-500">Review Submitted!</p>
            <p className="text-sm text-muted-foreground mt-1">Your feedback helps keep Pune safe.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {[
              { label: "Overall Safety Rating", value: safety, fn: setSafety },
              { label: "Street Lighting Quality", value: lighting, fn: setLighting },
              { label: "Crowd / Traffic Level", value: crowd, fn: setCrowd },
            ].map(({ label, value, fn }) => (
              <div key={label}>
                <label className="text-sm font-medium mb-2 block">{label}</label>
                <StarRating value={value} onChange={fn} />
              </div>
            ))}
            <div>
              <label className="text-sm font-medium mb-1 block">Additional Comments</label>
              <textarea value={comment} onChange={(e) => setComment(e.target.value)}
                placeholder="Share your experience about this route's safety, lighting, crowd levels..."
                rows={3}
                className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-ring" />
            </div>
            <div className="flex gap-2 pt-1">
              <Button type="button" variant="outline" className="flex-1 rounded-xl" onClick={onClose}>Cancel</Button>
              <Button type="submit" className="flex-1 rounded-xl">Submit Review</Button>
            </div>
          </form>
        )}
      </motion.div>
    </div>
  );
}

/* ─── Share Location Modal ───────────────────────────────────────────────── */
function ShareModal({ origin, destination, onClose }: { origin: string; destination: string; onClose: () => void }) {
  const [copied, setCopied] = useState(false);
  const shareText = `📍 I'm travelling from ${origin} to ${destination} via SafeRoute Pune. Track my journey: https://nirbhaya.app/track/demo123`;

  const copyLink = () => {
    navigator.clipboard.writeText(shareText).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    });
  };

  return (
    <div className="fixed inset-0 z-[9000] flex items-center justify-center bg-black/75 backdrop-blur-sm">
      <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
        className="relative w-full max-w-sm mx-4 rounded-3xl bg-card border border-border p-6 shadow-2xl">
        <button onClick={onClose} className="absolute top-4 right-4 text-muted-foreground hover:text-foreground">
          <X className="h-5 w-5" />
        </button>
        <div className="flex items-center gap-3 mb-5">
          <div className="h-10 w-10 rounded-full bg-blue-500/15 flex items-center justify-center">
            <Share2 className="h-5 w-5 text-blue-500" />
          </div>
          <h2 className="text-lg font-bold">📍 Share My Location</h2>
        </div>
        <p className="text-sm text-muted-foreground mb-4">Share your route with trusted contacts so they can track your journey in real-time.</p>
        <div className="rounded-xl bg-muted/60 border border-border p-3 mb-4">
          <p className="text-xs text-muted-foreground leading-relaxed break-words">{shareText}</p>
        </div>
        <div className="space-y-2">
          <Button onClick={copyLink} className="w-full rounded-xl" variant={copied ? "outline" : "default"}>
            {copied ? "✅ Copied to clipboard!" : "📋 Copy Sharing Link"}
          </Button>
          <Button variant="outline" className="w-full rounded-xl" onClick={onClose}>Close</Button>
        </div>
      </motion.div>
    </div>
  );
}

/* \u2500\u2500 Navigation Map Controller: follows user location during nav mode \u2500\u2500 */
/* ── Returns current map zoom level, updates on every zoom change ── */
function useMapZoom() {
  const map = useMap();
  const [zoom, setZoom] = useState(() => map.getZoom());
  useEffect(() => {
    const handler = () => setZoom(map.getZoom());
    map.on("zoomend", handler);
    return () => { map.off("zoomend", handler); };
  }, [map]);
  return zoom;
}

/* ── Police cluster layer — hidden when zoomed out, icons scale with zoom ── */
function PoliceClusterLayer({
  stations,
  onNavigateTo,
}: {
  stations: typeof policeStations;
  onNavigateTo: (name: string, lat: number, lng: number) => void;
}) {
  const zoom = useMapZoom();
  if (zoom < 10) return null;
  const icon = useMemo(() => makeZoomIcon("#1d4ed8", SVG_SHIELD, zoom), [zoom]);
  return (
    <MarkerClusterGroup
      chunkedLoading
      maxClusterRadius={50}
      iconCreateFunction={(cluster: { getChildCount: () => number }) => {
        const count = cluster.getChildCount();
        const size = count < 10 ? 36 : count < 20 ? 42 : 48;
        return L.divIcon({
          html: `<div style="width:${size}px;height:${size}px;border-radius:50%;background:linear-gradient(135deg,#1d4ed8,#3b82f6);display:flex;align-items:center;justify-content:center;color:#fff;font-weight:700;font-size:${size < 40 ? 13 : 15}px;box-shadow:0 2px 8px rgba(59,130,246,0.55);border:2px solid #fff;">${count}</div>`,
          className: "", iconSize: [size, size], iconAnchor: [size / 2, size / 2],
        });
      }}
    >
      {stations.map((ps) => (
        <Marker key={ps.id} position={[ps.lat, ps.lng]} icon={icon}>
          <Popup>
            <div className="p-1 min-w-[160px]">
              <p className="font-semibold text-blue-700 text-sm">{ps.name}</p>
              <p className="text-xs text-gray-500 mt-0.5">{ps.address}</p>
              {ps.phone && <p className="text-xs mt-1">📞 {ps.phone}</p>}
              <button
                onClick={() => onNavigateTo(ps.name, ps.lat, ps.lng)}
                className="mt-2 w-full text-xs bg-blue-600 hover:bg-blue-700 text-white font-medium py-1 px-2 rounded transition-colors"
              >
                🗺 Get Directions
              </button>
            </div>
          </Popup>
        </Marker>
      ))}
    </MarkerClusterGroup>
  );
}

/* ── Zoom-aware incident markers ── */
function IncidentMarkerLayer({ reports }: { reports: MapReport[] }) {
  const zoom = useMapZoom();
  const icon = useMemo(() => makeZoomIcon("#ef4444", SVG_WARNING, zoom), [zoom]);
  if (zoom < 9) return null;
  return (
    <>
      {reports.map((r) => (
        <Marker key={`report-${r._id}`} position={[r.latitude, r.longitude]} icon={icon}>
          <Popup>
            <strong className="block text-sm capitalize">{r.incidentType?.replace(/_/g, " ") || "Report"}</strong>
            <span className="text-xs">{r.description || "No description"}</span><br />
            <span className={`text-xs font-semibold ${r.severity === "High" ? "text-red-500" : r.severity === "Medium" ? "text-amber-500" : "text-emerald-500"}`}>{r.severity}</span>
            <span className="text-xs text-gray-400 ml-2">{r.timestamp ? new Date(r.timestamp).toLocaleDateString() : ""}</span>
          </Popup>
        </Marker>
      ))}
    </>
  );
}

/* ── Zoom-aware safe zone markers — different icons per type ── */
function SafeZoneLayer({ zones }: { zones: typeof safeZones }) {
  const zoom = useMapZoom();
  const icons = useMemo(() => ({
    police: makeZoomIcon("#3b82f6", SVG_SHIELD, zoom),
    hospital: makeZoomIcon("#22c55e", SVG_HOSPITAL, zoom),
    commercial: makeZoomIcon("#f59e0b", SVG_BUILDING, zoom),
    default: makeZoomIcon("#22c55e", SVG_CHECK, zoom),
  }), [zoom]);
  if (zoom < 10) return null;
  return (
    <>
      {zones.map((z, i) => (
        <Marker key={`sz-${i}`} position={[z.lat, z.lng]} icon={icons[z.type as keyof typeof icons] || icons.default}>
          <Popup>
            <strong className="block text-sm">{z.name}</strong>
            <span className="text-xs capitalize">{z.type}</span>
            <br /><span className="text-xs text-emerald-600 font-medium">Safety Score: {z.safety}/100</span>
          </Popup>
        </Marker>
      ))}
    </>
  );
}

/* ── Zoom gate helper — hides children below minZoom ── */
function ZoomGate({ minZoom, children }: { minZoom: number; children: React.ReactNode }) {
  const zoom = useMapZoom();
  if (zoom < minZoom) return null;
  return <>{children}</>;
}
function NavMapController({
  userLoc,
}: {
  userLoc: { lat: number; lng: number } | null;
}) {
  const map = useMap();
  const followRef = useRef(true);
  useEffect(() => {
    if (!userLoc || !followRef.current) return;
    map.setView([userLoc.lat, userLoc.lng], Math.max(map.getZoom(), 16), { animate: true });
  }, [userLoc, map]);

  useEffect(() => {
    const onDrag = () => { followRef.current = false; };
    map.on("dragstart", onDrag);
    return () => { map.off("dragstart", onDrag); };
  }, [map]);

  useEffect(() => {
    const recenter = () => {
      followRef.current = true;
      if (userLoc) map.setView([userLoc.lat, userLoc.lng], 17, { animate: true });
    };
    (window as any).__navRecenter = recenter;
    return () => { delete (window as any).__navRecenter; };
  }, [userLoc, map]);

  return null;
}

/* \u2500\u2500 Navigation Mode Panel (Google Maps-like bottom sheet) \u2500\u2500 */
function NavigationPanel({
  route,
  userLoc,
  destination,
  onEndNavigation,
  onSOS,
}: {
  route: RouteOption;
  userLoc: { lat: number; lng: number } | null;
  destination: string;
  onEndNavigation: () => void;
  onSOS: () => void;
}) {
  const steps = route.steps;
  const [currentStepIdx, setCurrentStepIdx] = useState(0);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    if (!steps?.length || !userLoc) return;
    let closestIdx = 0;
    let closestDist = Infinity;
    steps.forEach((step, idx) => {
      const dist = haversineKm(userLoc.lat, userLoc.lng, step.location[1], step.location[0]);
      if (dist < closestDist) {
        closestDist = dist;
        closestIdx = idx;
      }
    });
    setCurrentStepIdx(closestIdx);
  }, [userLoc, steps]);

  const remainingDistance = useMemo(() => {
    if (!steps?.length) return route.distance;
    const remaining = steps.slice(currentStepIdx).reduce((sum, s) => sum + s.distance, 0);
    return remaining >= 1000 ? `${(remaining / 1000).toFixed(1)} km` : `${Math.round(remaining)} m`;
  }, [steps, currentStepIdx, route.distance]);

  const remainingTime = useMemo(() => {
    if (!steps?.length) return route.duration;
    const remaining = steps.slice(currentStepIdx).reduce((sum, s) => sum + s.duration, 0);
    return `${Math.max(1, Math.round(remaining / 60))} min`;
  }, [steps, currentStepIdx, route.duration]);

  const etaText = useMemo(() => {
    if (!steps?.length) return "";
    const remaining = steps.slice(currentStepIdx).reduce((sum, s) => sum + s.duration, 0);
    const eta = new Date(Date.now() + remaining * 1000);
    return eta.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }, [steps, currentStepIdx]);

  const currentStep = steps?.[currentStepIdx];
  const nextStep = steps?.[currentStepIdx + 1];
  const formatDist = (m: number) => m >= 1000 ? `${(m / 1000).toFixed(1)} km` : `${Math.round(m)} m`;

  return (
    <>
      {/* Top bar \u2014 next maneuver */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="absolute top-0 left-0 right-0 z-[700] bg-primary text-primary-foreground shadow-lg"
      >
        <div className="flex items-center gap-3 px-4 py-3">
          <div className="h-10 w-10 rounded-lg bg-white/20 flex items-center justify-center shrink-0">
            <CornerUpRight className="h-5 w-5" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold truncate">
              {currentStep?.instruction || "Follow the route"}
            </p>
            {currentStep && (
              <p className="text-xs opacity-80">{formatDist(currentStep.distance)}</p>
            )}
          </div>
          <div className="text-right shrink-0">
            <p className="text-lg font-bold">{remainingTime}</p>
            <p className="text-[10px] opacity-80">{remainingDistance}</p>
          </div>
        </div>
        {nextStep && (
          <div className="px-4 pb-2">
            <p className="text-[11px] opacity-70">Then: {nextStep.instruction}</p>
          </div>
        )}
      </motion.div>

      {/* Bottom sheet */}
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        className="absolute bottom-0 left-0 right-0 z-[700] bg-card border-t border-border shadow-elevated rounded-t-2xl"
      >
        <div className="h-1 bg-muted mx-4 mt-3 mb-2 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{
              width: steps?.length ? `${Math.round(((currentStepIdx + 1) / steps.length) * 100)}%` : "0%",
              background: route.color,
            }}
          />
        </div>

        <div className="px-4 pb-2">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-sm font-bold">{destination}</p>
              <p className="text-xs text-muted-foreground">ETA {etaText} \u00b7 {remainingDistance}</p>
            </div>
            <div className={`text-xs font-bold px-2.5 py-1 rounded-full border ${rsiBg2(route.rsi)}`}>
              <span className={rsiColor2(route.rsi)}>RSI {route.rsi}</span>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 mb-2">
            <button
              onClick={() => (window as any).__navRecenter?.()}
              className="flex items-center justify-center gap-1.5 py-2 rounded-xl bg-muted hover:bg-muted/80 text-xs font-medium transition-colors"
            >
              <Crosshair className="h-3.5 w-3.5" /> Re-center
            </button>
            <button
              onClick={onSOS}
              className="flex items-center justify-center gap-1.5 py-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-500 text-xs font-medium transition-colors"
            >
              <Siren className="h-3.5 w-3.5" /> SOS
            </button>
            <button
              onClick={onEndNavigation}
              className="flex items-center justify-center gap-1.5 py-2 rounded-xl bg-muted hover:bg-muted/80 text-xs font-medium transition-colors"
            >
              <X className="h-3.5 w-3.5" /> End
            </button>
          </div>

          {/* Checkpoint progress */}
          {route.checkpoints && route.checkpoints.length > 0 && (
            <div className="bg-muted/30 rounded-xl p-2.5 mb-2 space-y-1.5">
              <div className="flex items-center justify-between">
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Checkpoints</p>
                <p className="text-[10px] font-bold text-primary">
                  {route.checkpoints.filter((c) => c.passed).length}/{route.checkpoints.length}
                </p>
              </div>
              <div className="flex gap-1">
                {route.checkpoints.map((cp, i) => (
                  <div
                    key={i}
                    className={`h-1.5 flex-1 rounded-full transition-colors ${
                      cp.passed ? "bg-emerald-500" : "bg-muted-foreground/20"
                    }`}
                  />
                ))}
              </div>
              <div className="space-y-1 max-h-24 overflow-y-auto">
                {route.checkpoints.map((cp, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <div className={`h-2 w-2 rounded-full flex-shrink-0 ${
                      cp.passed ? "bg-emerald-500" :
                      cp.type === "police" ? "bg-blue-500" :
                      cp.type === "hospital" ? "bg-red-400" : "bg-amber-400"
                    }`} />
                    <span className={`text-[10px] flex-1 truncate ${cp.passed ? "line-through text-muted-foreground" : "font-medium"}`}>{cp.name}</span>
                    {cp.passed ? (
                      <span className="text-[9px] text-emerald-500 font-semibold">✓</span>
                    ) : (
                      <span className="text-[9px] text-muted-foreground">~{cp.eta}</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {steps && steps.length > 0 && (
            <>
              <button
                onClick={() => setExpanded((v) => !v)}
                className="flex items-center justify-center w-full py-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                {expanded ? <ChevronDown className="h-3 w-3 mr-1" /> : <ChevronUp className="h-3 w-3 mr-1" />}
                {expanded ? "Hide steps" : `${steps.length} steps`}
              </button>
              <AnimatePresence>
                {expanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden max-h-48 overflow-y-auto"
                  >
                    <div className="space-y-1 py-2">
                      {steps.map((step, idx) => (
                        <div
                          key={idx}
                          className={`flex items-start gap-2 px-2 py-1.5 rounded-lg text-xs ${
                            idx === currentStepIdx ? "bg-primary/10 font-semibold" : "text-muted-foreground"
                          }`}
                        >
                          <ArrowUp className="h-3 w-3 mt-0.5 shrink-0" />
                          <span className="flex-1">{step.instruction}</span>
                          <span className="shrink-0">{formatDist(step.distance)}</span>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </>
          )}
        </div>
      </motion.div>
    </>
  );
}

/* â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ Vertical icon sidebar â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
const NAV_ITEMS2 = [
  { to: "/",          icon: Home,        label: "Home" },
  { to: "/dashboard", icon: Map,         label: "Map" },
  { to: "/sos",       icon: Siren,       label: "SOS" },
  { to: "/report",    icon: FileWarning, label: "Report" },
  { to: "/police",    icon: Shield,      label: "Police" },
  { to: "/settings",  icon: Settings,    label: "Settings" },
];

function VerticalSidebar2() {
  const { theme, toggle } = useTheme();
  const { user, logout } = useAuth();
  const { pathname } = useLocation();

  const NavBtn = ({
    to, icon: Icon, label, onClick,
  }: { to?: string; icon: ElementType; label: string; onClick?: () => void }) => {
    const active = to ? pathname === to : false;
    const cls = `flex flex-col items-center justify-center gap-0.5 w-full py-2 rounded-xl transition-all text-[9px] font-semibold leading-none tracking-wide ${
      active
        ? "bg-primary text-primary-foreground shadow-md"
        : "text-muted-foreground hover:bg-muted hover:text-foreground"
    }`;
    if (to) {
      return (
        <Link to={to} aria-label={label} className={cls}>
          <Icon className="h-[17px] w-[17px] shrink-0" />
          <span>{label}</span>
        </Link>
      );
    }
    return (
      <button type="button" onClick={onClick} aria-label={label} className={cls}>
        <Icon className="h-[17px] w-[17px] shrink-0" />
        <span>{label}</span>
      </button>
    );
  };

  return (
    <aside
      className="z-[600] flex h-screen w-[68px] shrink-0 flex-col items-center border-r border-border bg-card py-2 gap-0.5"
      style={{ boxShadow: "2px 0 8px rgba(0,0,0,.08)" }}
    >
      {/* Logo */}
      <Link
        to="/"
        className="mb-2 flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 hover:bg-primary/20 transition-colors shrink-0"
        title="Nirbhaya"
      >
        <img
          src="/nirbhaya.png" alt="N"
          className="h-8 w-8 rounded-lg object-cover"
          onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
        />
      </Link>

      <nav className="flex flex-col items-center gap-0.5 w-full px-1">
        {NAV_ITEMS2.map(({ to, icon, label }) => (
          <NavBtn key={to} to={to} icon={icon} label={label} />
        ))}
      </nav>

      <div className="flex-1" />

      <div className="flex flex-col items-center gap-0.5 w-full px-1 pb-1">
        <NavBtn
          icon={theme === "dark" ? Sun : Moon}
          label={theme === "dark" ? "Light" : "Dark"}
          onClick={toggle}
        />
        {user ? (
          <NavBtn icon={LogOut} label="Logout" onClick={logout} />
        ) : (
          <NavBtn to="/login" icon={User} label="Login" />
        )}
      </div>
    </aside>
  );
}

/* â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ Dashboard â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
export default function Dashboard() {
  const [origin, setOrigin] = useState("");
  const [originLoc, setOriginLoc] = useState<DemoLocation | null>(null);
  const [destination, setDestination] = useState("");
  const [destLoc, setDestLoc] = useState<DemoLocation | null>(null);
  const [routes, setRoutes] = useState<RouteOption[]>([]);
  const [hasSearched, setHasSearched] = useState(false);
  const [selectedRoute, setSelectedRoute] = useState<RouteOption | null>(null);
  const [travelMode, setTravelMode] = useState<TravelMode>("foot");
  const [panelOpen, setPanelOpen] = useState(true);
  const [showPolice, setShowPolice] = useState(true);
  const [showIncidents, setShowIncidents] = useState(true);
  const [showHeatmap, setShowHeatmap] = useState(false);
  const [showSafeZones, setShowSafeZones] = useState(false);
  const [showHotspots, setShowHotspots] = useState(false);
  const [deviationAlert, setDeviationAlert] = useState(false);
  const [proximityAlert, setProximityAlert] = useState(false);
  const [searchError, setSearchError] = useState("");

  const [isSearching, setIsSearching] = useState(false);
  // Modals
  const [showEmergencyModal, setShowEmergencyModal] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [navMode, setNavMode] = useState(false);
  const [expandedRouteId, setExpandedRouteId] = useState<string | null>(null);
  const [userLoc, setUserLoc] = useState<{ lat: number; lng: number; accuracy?: number } | null>(null);
  const [userHeading, setUserHeading] = useState(0);
  const lastUserLocRef = useRef<{ lat: number; lng: number } | null>(null);
  const [batteryLevel, setBatteryLevel] = useState<number | null>(null);
  const [batteryCharging, setBatteryCharging] = useState(false);
  const [lowBatteryDismissed, setLowBatteryDismissed] = useState(false);

  const { data: overview } = useQuery({
    queryKey: ["map-overview"],
    queryFn: getMapOverview,
    staleTime: 5 * 60 * 1000,
  });

  const crowdQueryLat = userLoc?.lat ?? originLoc?.lat ?? PUNE_CENTER[1];
  const crowdQueryLng = userLoc?.lng ?? originLoc?.lng ?? PUNE_CENTER[0];
  const currentHour = new Date().getHours();

  const { data: crowdHeat } = useQuery({
    queryKey: ["crowd-heatmap", crowdQueryLat.toFixed(3), crowdQueryLng.toFixed(3), currentHour],
    queryFn: () => getCrowdHeatmap({
      lat: crowdQueryLat,
      lng: crowdQueryLng,
      radiusKm: 8,
      hour: currentHour,
    }),
    staleTime: 2 * 60 * 1000,
  });

  // Real user reports for the map (no mock data)
  const { data: realReports = [] } = useQuery({
    queryKey: ["map-real-reports"],
    queryFn: getAllReportsForMap,
    staleTime: 2 * 60 * 1000,
  });

  // Hex zones — fetched from backend
  const [showHexLayer, setShowHexLayer] = useState(true);
  const hexQueryLat = userLoc?.lat ?? PUNE_CENTER[1];
  const hexQueryLng = userLoc?.lng ?? PUNE_CENTER[0];
  const { data: hexZones = [] } = useQuery({
    queryKey: ["hex-zones", hexQueryLat.toFixed(3), hexQueryLng.toFixed(3)],
    queryFn: () => getHexZones(hexQueryLat, hexQueryLng),
    staleTime: 3 * 60 * 1000,
  });

  // Convert hex IDs to polygon boundaries — show ALL hexes (green=safe, colored=danger)
  const hexPolygons = useMemo(() => {
    return hexZones
      .map((h) => {
        try {
          const boundary = cellToBoundary(h.hexId, true); // [lng, lat][]
          const positions = boundary.map((c) => [c[1], c[0]] as [number, number]); // swap to [lat, lng] for Leaflet
          return { hexId: h.hexId, dangerScore: h.dangerScore, positions };
        } catch { return null; }
      })
      .filter(Boolean) as Array<{ hexId: string; dangerScore: number; positions: [number, number][] }>;
  }, [hexZones]);

  // Area safety rating near user
  const nearbyRating = useMemo(() => {
    if (!realReports.length) return null;
    const lat = userLoc?.lat ?? PUNE_CENTER[1];
    const lng = userLoc?.lng ?? PUNE_CENTER[0];
    const nearby = realReports.filter((r) => {
      const d = Math.sqrt((r.latitude - lat) ** 2 + (r.longitude - lng) ** 2);
      return d < 0.02; // ~2km
    });
    if (!nearby.length) return { score: 5, label: "Safe", count: 0 };
    const avgRating = nearby.reduce((s, r) => s + (r.areaRating || 3), 0) / nearby.length;
    const highCount = nearby.filter((r) => r.severity === "High").length;
    const score = Math.max(1, Math.round(avgRating - highCount * 0.5));
    return {
      score,
      label: score >= 4 ? "Safe" : score >= 3 ? "Moderate" : "Unsafe",
      count: nearby.length,
    };
  }, [realReports, userLoc]);

  const mapIncidents = overview?.incidents ?? [];
  const mapClusters = overview?.clusters ?? [];
  const mapHeat = overview?.heatmap ?? [];
  const stationData  = overview?.policeStations?.length ? overview.policeStations : policeStations;
  const userArrowIcon = useMemo(() => makeUserArrowIcon(userHeading), [userHeading]);

  const mapCenter = useMemo<[number, number]>(() =>
    selectedRoute
      ? [selectedRoute.coordinates[0][1], selectedRoute.coordinates[0][0]]
      : userLoc
      ? [userLoc.lat, userLoc.lng]
      : originLoc
      ? [originLoc.lat, originLoc.lng]
      : [PUNE_CENTER[1], PUNE_CENTER[0]],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [selectedRoute?.id, userLoc?.lat, userLoc?.lng, originLoc?.lat, originLoc?.lng]
  );

  useEffect(() => {
    if (!("geolocation" in navigator)) return;
    let lastTs = 0;
    const watcher = navigator.geolocation.watchPosition(
      (pos) => {
        const { latitude, longitude, accuracy, heading: rawHeading } = pos.coords;
        const now = Date.now();

        // Filter 1: reject readings with accuracy worse than 120 m
        if (typeof accuracy === "number" && accuracy > 120) return;

        // Filter 2: anti-teleportation — reject jumps > 500 m in < 3 s
        if (lastUserLocRef.current && now - lastTs < 3000) {
          const jumpKm = haversineKm(lastUserLocRef.current.lat, lastUserLocRef.current.lng, latitude, longitude);
          if (jumpKm > 0.5) return; // 500 m jump in < 3 s → GPS glitch
        }

        // Filter 3: Smooth with exponential moving average when accuracy is mediocre
        let lat = latitude;
        let lng = longitude;
        if (lastUserLocRef.current && typeof accuracy === "number" && accuracy > 30) {
          const alpha = Math.max(0.3, 1 - accuracy / 200); // lower accuracy → more smoothing
          lat = lastUserLocRef.current.lat + alpha * (latitude - lastUserLocRef.current.lat);
          lng = lastUserLocRef.current.lng + alpha * (longitude - lastUserLocRef.current.lng);
        }

        const next = { lat, lng, accuracy };
        setUserLoc(next);
        lastTs = now;

        if (typeof rawHeading === "number" && !Number.isNaN(rawHeading) && rawHeading !== 0) {
          setUserHeading(rawHeading);
        } else if (lastUserLocRef.current) {
          const dist = haversineKm(lastUserLocRef.current.lat, lastUserLocRef.current.lng, lat, lng);
          if (dist > 0.005) { // only update heading if moved > 5 m
            setUserHeading(computeBearing(lastUserLocRef.current, { lat, lng }));
          }
        }

        lastUserLocRef.current = { lat, lng };

        // Auto-tick checkpoints during navigation when user passes within 100m
        if (navMode && selectedRoute?.checkpoints) {
          let ticked = false;
          selectedRoute.checkpoints.forEach((cp) => {
            if (!cp.passed && haversineKm(lat, lng, cp.lat, cp.lng) < 0.1) {
              cp.passed = true;
              ticked = true;
            }
          });
          if (ticked) setSelectedRoute({ ...selectedRoute });
        }
      },
      () => {
        // Keep app working even if permission denied
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 3000 }
    );
    return () => navigator.geolocation.clearWatch(watcher);
  }, []);

  /* Battery monitoring */
  useEffect(() => {
    let battery: any = null;
    const update = () => {
      if (!battery) return;
      setBatteryLevel(Math.round(battery.level * 100));
      setBatteryCharging(battery.charging);
    };
    (navigator as any).getBattery?.().then((b: any) => {
      battery = b;
      update();
      b.addEventListener("levelchange", update);
      b.addEventListener("chargingchange", update);
    }).catch(() => {});
    return () => {
      if (battery) {
        battery.removeEventListener("levelchange", update);
        battery.removeEventListener("chargingchange", update);
      }
    };
  }, []);

  /* Sync location to backend — 10s interval + immediate on nav changes */
  const navStartTimeRef = useRef<Date | null>(null);

  const buildLocationPayload = useCallback((overrideNavMode?: boolean) => {
    const loc = lastUserLocRef.current;
    if (!loc) return null;
    const isNav = overrideNavMode ?? navMode;
    return {
      lat: loc.lat,
      lng: loc.lng,
      accuracy: userLoc?.accuracy,
      batteryLevel: batteryLevel ?? undefined,
      isNavigating: isNav,
      currentRoute: isNav && selectedRoute
        ? {
            origin: origin || "Current Location",
            destination: destination || "",
            rsi: selectedRoute.rsi,
            eta: selectedRoute.duration,
            distance: selectedRoute.distance,
          }
        : undefined,
      checkpointsPassed: isNav ? selectedRoute?.checkpoints?.filter((c) => c.passed).length : 0,
      checkpointsTotal: isNav ? selectedRoute?.checkpoints?.length : 0,
      checkpoints: isNav ? selectedRoute?.checkpoints?.map((c) => ({
        name: c.name,
        type: c.type,
        lat: c.lat,
        lng: c.lng,
        eta: c.eta,
        passed: !!c.passed,
      })) : [],
    };
  }, [navMode, selectedRoute, origin, destination, batteryLevel, userLoc]);

  // Track checkpoint count separately for stable dependency
  const cpPassedCount = selectedRoute?.checkpoints?.filter((c) => c.passed).length ?? 0;

  // Send immediately when navMode changes or checkpoints are ticked
  useEffect(() => {
    const payload = buildLocationPayload();
    if (payload) updateLocation(payload).catch(() => {});
    // Track nav start time
    if (navMode) navStartTimeRef.current = new Date();
  }, [navMode, cpPassedCount]);

  // Periodic sync every 10 seconds
  useEffect(() => {
    const iv = setInterval(() => {
      const payload = buildLocationPayload();
      if (payload) updateLocation(payload).catch(() => {});
    }, 10000);
    return () => clearInterval(iv);
  }, [buildLocationPayload]);

  // End navigation handler — saves trip + clears state + sends update
  const handleEndNavigation = useCallback(() => {
    // Save trip history if there was a route
    if (selectedRoute) {
      saveTripHistory({
        origin: origin || "Current Location",
        destination: destination || "",
        rsi: selectedRoute.rsi,
        eta: selectedRoute.duration,
        distance: selectedRoute.distance,
        checkpoints: selectedRoute.checkpoints?.map((c) => ({
          name: c.name, type: c.type, passed: !!c.passed,
        })),
        startedAt: navStartTimeRef.current?.toISOString(),
      }).catch(() => {});
    }

    // Clear nav state and immediately push to backend
    setNavMode(false);
    // Explicit immediate update with isNavigating: false
    const loc = lastUserLocRef.current;
    if (loc) {
      updateLocation({
        lat: loc.lat,
        lng: loc.lng,
        accuracy: userLoc?.accuracy,
        batteryLevel: batteryLevel ?? undefined,
        isNavigating: false,
      }).catch(() => {});
    }
    navStartTimeRef.current = null;
  }, [selectedRoute, origin, destination, userLoc, batteryLevel]);

  /* Real deviation check: if user is > 150m from closest point on the selected route */
  useEffect(() => {
    if (!selectedRoute || !userLoc || !navMode) {
      setDeviationAlert(false);
      return;
    }
    const coords = selectedRoute.coordinates;
    if (!coords.length) return;
    const step = Math.max(1, Math.floor(coords.length / 60));
    let minDist = Infinity;
    for (let i = 0; i < coords.length; i += step) {
      const d = haversineKm(userLoc.lat, userLoc.lng, coords[i][1], coords[i][0]);
      if (d < minDist) minDist = d;
    }
    if (minDist > 0.15) {
      setDeviationAlert(true);
    } else {
      setDeviationAlert(false);
    }
  }, [selectedRoute, userLoc, navMode]);

  /* Proximity alert: warn when approaching a known hotspot */
  useEffect(() => {
    if (!userLoc || !navMode) { setProximityAlert(false); return; }
    const nearHotspot = crimeHotspots.some((h) => haversineKm(userLoc.lat, userLoc.lng, h.lat, h.lng) < 0.35);
    const nearIncident = mapIncidents.some((inc) => inc.severity >= 3 && haversineKm(userLoc.lat, userLoc.lng, inc.lat, inc.lng) < 0.25);
    setProximityAlert(nearHotspot || nearIncident);
  }, [userLoc, navMode, mapIncidents]);

  const handleSearch = async () => {
    const s = originLoc || resolveLocation2(origin);
    const e = destLoc   || resolveLocation2(destination);
    if (!s || !e) { setSearchError("Type an origin and destination."); return; }
    if (s.lat === e.lat && s.lng === e.lng) { setSearchError("Origin and destination must differ."); return; }
    setIsSearching(true);
    setSearchError("");
    try {
      const gen = await fetchGoogleMapsRoutes(s, e, mapIncidents, travelMode);
      setRoutes(gen);
      setSelectedRoute(gen[0]);
      setHasSearched(true);
      setExpandedRouteId(gen[0].id);
      setDeviationAlert(false);
      setProximityAlert(false);
    } finally {
      setIsSearching(false);
    }
  };

  const navigateToStation = useCallback(async (name: string, lat: number, lng: number) => {
    const loc: DemoLocation = { name, lat, lng };
    setDestination(name);
    setDestLoc(loc);
    const s = originLoc || (userLoc ? { name: "My Location", lat: userLoc.lat, lng: userLoc.lng } : resolveLocation2(origin));
    if (!s) { setSearchError("Enable location or set an origin first."); return; }
    setIsSearching(true);
    setSearchError("");
    try {
      const gen = await fetchGoogleMapsRoutes(s, loc, mapIncidents, travelMode);
      setRoutes(gen);
      setSelectedRoute(gen[0]);
      setHasSearched(true);
      setExpandedRouteId(gen[0]?.id ?? null);
      setDeviationAlert(false);
      setProximityAlert(false);
    } finally {
      setIsSearching(false);
    }
  }, [originLoc, userLoc, origin, mapIncidents, travelMode]);

  const pickRoute = (r: RouteOption) => {
    setSelectedRoute(r);
    setExpandedRouteId((prev) => (prev === r.id ? null : r.id));
    setDeviationAlert(false);
    setProximityAlert(false);
  };

  return (
    <div className="flex h-[100dvh] w-screen overflow-hidden">
      {/* â”€â”€ Google-Maps-style vertical icon sidebar â”€â”€ */}
      <DashboardNav />

      {/* â”€â”€ Full-screen map area â”€â”€ */}
      <div className="relative flex-1 overflow-hidden pb-16 md:pb-0">
        <MapContainer
          center={mapCenter}
          zoom={13}
          minZoom={3}
          maxZoom={18}
          className="h-full w-full"
          zoomControl={false}
          scrollWheelZoom
          style={{ background: "#e8e4dc" }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <MapController
            center={mapCenter}
            routeCoords={selectedRoute?.coordinates}
            userLoc={userLoc}
          />
          {navMode && <NavMapController userLoc={userLoc} />}

          {/* Live location arrow + accuracy */}
          {userLoc && (
            <>
              <Marker position={[userLoc.lat, userLoc.lng]} icon={userArrowIcon}>
                <Popup>
                  <strong className="block text-sm">Your Live Location</strong>
                  <span className="text-xs text-muted-foreground">
                    Heading: {Math.round(userHeading)}°
                  </span>
                </Popup>
              </Marker>
              {typeof userLoc.accuracy === "number" && (
                <Circle
                  center={[userLoc.lat, userLoc.lng]}
                  radius={Math.min(Math.max(userLoc.accuracy, 20), 160)}
                  pathOptions={{ color: "#2563eb", fillColor: "#2563eb", fillOpacity: 0.08, weight: 1 }}
                />
              )}
            </>
          )}

          {/* Heatmap visualization — hidden below zoom 11 to prevent opacity stacking */}
          {showHeatmap && (
            <ZoomGate minZoom={11}>
              {mapIncidents.map((inc) => {
                const color = inc.severity === 3 ? "#ef4444" : inc.severity === 2 ? "#f97316" : "#f59e0b";
                const radius = inc.severity === 3 ? 260 : inc.severity === 2 ? 200 : 150;
                return (
                  <Circle
                    key={`heat-inc-${inc.id}`}
                    center={[inc.lat, inc.lng]}
                    radius={radius}
                    pathOptions={{ color, fillColor: color, fillOpacity: 0.12, weight: 0 }}
                  />
                );
              })}
              {mapHeat.map((point, i) => {
                const radius = Math.round(130 + point.weight * 260);
                return (
                  <Circle
                    key={`heat-live-${i}`}
                    center={[point.lat, point.lng]}
                    radius={radius}
                    pathOptions={{ color: "#dc2626", fillColor: "#dc2626", fillOpacity: 0.06, weight: 0 }}
                  />
                );
              })}
              {mapClusters.map((cluster) => (
                <Circle
                  key={`heat-cluster-${cluster.id}`}
                  center={[cluster.lat, cluster.lng]}
                  radius={Math.round(180 + Math.min(cluster.count, 25) * 22)}
                  pathOptions={{ color: "#b91c1c", fillColor: "#b91c1c", fillOpacity: 0.1, weight: 0 }}
                >
                  <Popup>
                    <strong className="block text-sm">SafeCity Cluster</strong>
                    <span className="text-xs text-muted-foreground">Incidents in area: {cluster.count}</span>
                  </Popup>
                </Circle>
              ))}
              {(crowdHeat?.points || []).map((point) => {
                const color = point.busyPct >= 70 ? "#dc2626" : point.busyPct >= 45 ? "#f97316" : "#2563eb";
                const radius = Math.round(140 + point.weight * 300);
                return (
                  <Circle
                    key={`heat-crowd-${point.id}`}
                    center={[point.lat, point.lng]}
                    radius={radius}
                    pathOptions={{ color, fillColor: color, fillOpacity: 0.11, weight: 0 }}
                  >
                    <Popup>
                      <strong className="block text-sm">Crowd (hour {crowdHeat?.hour}:00)</strong>
                      <span className="text-xs text-muted-foreground">Estimated busy: {point.busyPct}%</span>
                    </Popup>
                  </Circle>
                );
              })}
              {crimeHotspots.map((h, i) => (
                <Circle
                  key={`heat-hot-${i}`}
                  center={[h.lat, h.lng]}
                  radius={420}
                  pathOptions={{
                    color: h.danger >= 90 ? "#ef4444" : h.danger >= 80 ? "#f97316" : "#f59e0b",
                    fillColor: h.danger >= 90 ? "#ef4444" : h.danger >= 80 ? "#f97316" : "#f59e0b",
                    fillOpacity: 0.08,
                    weight: 0,
                  }}
                />
              ))}
            </ZoomGate>
          )}

          {/* H3 Hexagon Safety Layer — visible from zoom 10+ */}
          {showHexLayer && (
            <ZoomGate minZoom={10}>
              {hexPolygons.map((hex) => {
                const maxScore = 15;
                const norm = hex.dangerScore <= 0 ? 0 : Math.min(hex.dangerScore / maxScore, 1);
                const color = norm === 0 ? "#22c55e" : norm > 0.7 ? "#ef4444" : norm > 0.4 ? "#f97316" : norm > 0.15 ? "#fbbf24" : "#86efac";
                const ratingLabel = norm === 0 ? "Safe Zone" : norm > 0.7 ? "High Risk" : norm > 0.4 ? "Moderate Risk" : norm > 0.15 ? "Low Risk" : "Safe";
                const fillOpacity = norm === 0 ? 0.08 : 0.15 + norm * 0.25;
                return (
                  <Polygon
                    key={`hex-${hex.hexId}`}
                    positions={hex.positions}
                    pathOptions={{
                      color,
                      fillColor: color,
                      fillOpacity,
                      weight: 1,
                      opacity: norm === 0 ? 0.3 : 0.5,
                    }}
                  >
                    <Popup>
                      <strong className="block text-sm">{ratingLabel}</strong>
                      <span className="text-xs text-muted-foreground">Danger Score: {hex.dangerScore}</span>
                    </Popup>
                  </Polygon>
                );
              })}
            </ZoomGate>
          )}

          {/* Real user-reported incidents on map — zoom-aware */}
          {showIncidents && <IncidentMarkerLayer reports={realReports} />}

          {/* Police stations — clustered, hidden when zoomed out */}
          {showPolice && <PoliceClusterLayer stations={stationData} onNavigateTo={navigateToStation} />}

          {/* Safe zones — zoom-aware with type-specific icons */}
          {showSafeZones && <SafeZoneLayer zones={safeZones} />}

          {/* Crime hotspots — pulsing circles, hidden below zoom 11 */}
          {showHotspots && (
            <ZoomGate minZoom={11}>
              {crimeHotspots.map((h, i) => (
                <Circle key={`hs-${i}`}
                  center={[h.lat, h.lng]}
                  radius={350}
                  pathOptions={{
                    color: h.danger >= 90 ? "#ef4444" : h.danger >= 80 ? "#f97316" : "#f59e0b",
                    fillColor: h.danger >= 90 ? "#ef4444" : h.danger >= 80 ? "#f97316" : "#f59e0b",
                    fillOpacity: 0.25,
                    weight: 2,
                    dashArray: "6 4",
                  }}
                >
                  <Popup>
                    <strong className="block text-sm text-red-600">⚠️ {h.name}</strong>
                    <p className="text-xs">Danger: {h.danger}/100 · Incidents: {h.incidents}</p>
                    <ul className="text-xs mt-1 space-y-0.5">{h.issues.map((iss) => <li key={iss}>• {iss}</li>)}</ul>
                  </Popup>
                </Circle>
              ))}
            </ZoomGate>
          )}

          {/* Old mock incidents removed — using realReports above */}

          {/* All routes (dim inactive, bright active) */}
          {routes.map((r) => (
            <Polyline
              key={r.id}
              positions={r.coordinates.map((c) => [c[1], c[0]])}
              pathOptions={{
                color: r.color,
                weight: selectedRoute?.id === r.id ? 6 : 3,
                opacity: selectedRoute?.id === r.id ? 0.9 : 0.3,
                dashArray: selectedRoute?.id === r.id ? undefined : "6 6",
              }}
              eventHandlers={{ click: () => pickRoute(r) }}
            />
          ))}

          {/* Start / end markers */}
          {selectedRoute && (
            <>
              <Marker position={[selectedRoute.coordinates[0][1], selectedRoute.coordinates[0][0]]} icon={safeIconNew}>
                <Popup><strong>Start</strong>: {origin}</Popup>
              </Marker>
              <Marker
                position={[
                  selectedRoute.coordinates[selectedRoute.coordinates.length - 1][1],
                  selectedRoute.coordinates[selectedRoute.coordinates.length - 1][0],
                ]}
                icon={destIconNew}
              >
                <Popup><strong>Destination</strong>: {destination}</Popup>
              </Marker>

              {/* Checkpoint markers on map */}
              {selectedRoute.checkpoints?.map((cp, cpIdx) => (
                <Marker
                  key={`cp-${cpIdx}`}
                  position={[cp.lat, cp.lng]}
                  icon={L.divIcon({
                    className: "",
                    html: `<div style="width:22px;height:22px;border-radius:50%;display:flex;align-items:center;justify-content:center;border:2px solid white;box-shadow:0 1px 4px rgba(0,0,0,.3);font-size:10px;font-weight:700;color:white;background:${
                      cp.passed ? "#22c55e" : cp.type === "police" ? "#3b82f6" : cp.type === "hospital" ? "#f87171" : "#f59e0b"
                    }">${cpIdx + 1}</div>`,
                    iconSize: [22, 22],
                    iconAnchor: [11, 11],
                  })}
                >
                  <Popup>
                    <strong>{cp.name}</strong><br />
                    <span style={{fontSize:11,color:"#888"}}>ETA ~{cp.eta} • {cp.type}</span>
                  </Popup>
                </Marker>
              ))}
            </>
          )}
        </MapContainer>

        {/* â”€â”€ Floating search + routes panel (top-left, Ã  la Google Maps) â”€â”€ */}
        {/* Navigation Mode UI */}
        {navMode && selectedRoute && (
          <NavigationPanel
            route={selectedRoute}
            userLoc={userLoc}
            destination={destination}
            onEndNavigation={handleEndNavigation}
            onSOS={() => setShowEmergencyModal(true)}
          />
        )}

        {!navMode && <div
          className="absolute left-2 right-2 md:left-3 md:right-auto top-2 md:top-3 z-[500] flex flex-col gap-2 md:w-[340px]"
          style={{ maxHeight: "calc(100dvh - 80px)", overflowY: "visible", overflowX: "visible" }}
        >
          {/* Search card */}
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl bg-card/95 backdrop-blur-xl border border-border shadow-elevated overflow-hidden"
          >
            <button
              onClick={() => setPanelOpen((p) => !p)}
              className="flex w-full items-center justify-between px-4 py-3 hover:bg-muted/40 transition-colors"
            >
              <span className="flex items-center gap-2 font-display font-semibold text-sm">
                <Navigation className="h-4 w-4 text-primary" />
                Safe Route Finder
              </span>
              {panelOpen
                ? <ChevronUp className="h-4 w-4 text-muted-foreground" />
                : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
            </button>

            <AnimatePresence initial={false}>
              {panelOpen && (
                <motion.div
                  key="search-body"
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.18 }}
                  className="overflow-hidden"
                >
                  <div className="px-4 pb-4 space-y-2.5 border-t border-border">
                    {/* Origin */}
                    <div className="pt-3 space-y-1.5">
                      <LocationInput
                        value={origin}
                        onChange={(v) => { setOrigin(v); setOriginLoc(null); }}
                        onSelect={(loc) => { setOrigin(loc.name); setOriginLoc(loc); setSearchError(""); }}
                        placeholder="From — e.g. Pune Station"
                        dotColor="#22c55e"
                        userLoc={userLoc}
                      />
                      {!originLoc && (
                        <button
                          type="button"
                          className="flex items-center gap-1.5 text-[11px] text-primary font-medium hover:underline pl-1"
                          onClick={async () => {
                            if (userLoc) {
                              setOrigin("Detecting location…");
                              setSearchError("");
                              try {
                                const placeName = await reverseGeocode(userLoc.lat, userLoc.lng);
                                setOrigin(placeName);
                                setOriginLoc({ name: placeName, lat: userLoc.lat, lng: userLoc.lng });
                              } catch {
                                setOrigin("Your Location");
                                setOriginLoc({ name: "Your Location", lat: userLoc.lat, lng: userLoc.lng });
                              }
                            } else {
                              setSearchError("Getting your location…");
                            }
                          }}
                        >
                          <LocateFixed className="h-3 w-3" /> Use my current location
                        </button>
                      )}
                    </div>

                    <div className="pl-3.5">
                      <div className="h-3.5 w-px bg-border ml-0.5" />
                    </div>

                    {/* Destination */}
                    <LocationInput
                      value={destination}
                      onChange={(v) => { setDestination(v); setDestLoc(null); }}
                      onSelect={(loc) => { setDestination(loc.name); setDestLoc(loc); setSearchError(""); }}
                      placeholder="To — e.g. Kothrud"
                      dotColor="#ef4444"
                      userLoc={userLoc}
                    />

                    {/* Travel mode selector */}
                    <div className="flex items-center gap-1.5">
                      <span className="text-[11px] text-muted-foreground font-medium shrink-0">Mode:</span>
                      {([
                        { mode: "foot" as TravelMode, label: "Walking", Icon: Footprints },
                        { mode: "bike" as TravelMode, label: "Bike",    Icon: Bike },
                        { mode: "car"  as TravelMode, label: "Car",     Icon: Car },
                      ]).map(({ mode, label, Icon }) => (
                        <button
                          key={mode}
                          onClick={() => setTravelMode(mode)}
                          className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border transition-all ${
                            travelMode === mode
                              ? "bg-primary text-primary-foreground border-primary shadow-sm"
                              : "bg-muted text-muted-foreground border-border hover:border-primary/50"
                          }`}
                        >
                          <Icon className="h-3 w-3" /> {label}
                        </button>
                      ))}
                    </div>

                    {searchError && (
                      <p className="text-xs text-red-500 flex items-center gap-1">
                        <AlertTriangle className="h-3 w-3 shrink-0" /> {searchError}
                      </p>
                    )}

                    <Button
                      className="w-full rounded-xl text-sm h-9"
                      onClick={handleSearch}
                      disabled={isSearching}
                    >
                      {isSearching ? (
                        <><span className="mr-2 h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />Finding Routes…</>
                      ) : (
                        <><Search className="h-3.5 w-3.5 mr-2" />Find Safe Routes</>
                      )}
                    </Button>

                    {/* Layer chips */}
                    <div className="flex flex-wrap gap-1.5">
                      {([
                        { label: "Hex Zones",  Icon: Layers,        on: showHexLayer,  fn: () => setShowHexLayer ((v) => !v) },
                        { label: "Heatmap",    Icon: Layers,        on: showHeatmap,   fn: () => setShowHeatmap  ((v) => !v) },
                        { label: "Incidents",  Icon: AlertTriangle, on: showIncidents, fn: () => setShowIncidents((v) => !v) },
                        { label: "Police",     Icon: Shield,        on: showPolice,    fn: () => setShowPolice   ((v) => !v) },
                        { label: "Safe Zones", Icon: ShieldCheck,   on: showSafeZones, fn: () => setShowSafeZones((v) => !v) },
                        { label: "Hotspots",   Icon: Activity,      on: showHotspots,  fn: () => setShowHotspots ((v) => !v) },
                      ] as const).map(({ label, Icon, on, fn }) => (
                        <button
                          key={label}
                          onClick={fn}
                          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border transition-all ${
                            on
                              ? "bg-primary text-primary-foreground border-primary"
                              : "bg-muted text-muted-foreground border-border hover:border-primary/50"
                          }`}
                        >
                          <Icon className="h-3 w-3" /> {label}
                        </button>
                      ))}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>

          {/* Routes list card — only shown after search */}
          {hasSearched && routes.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.07 }}
            className="rounded-2xl bg-card/95 backdrop-blur-xl border border-border shadow-elevated overflow-y-auto"
            style={{ maxHeight: "calc(100dvh - 320px)" }}
          >
            <div className="px-4 pt-3 pb-1 border-b border-border flex items-center justify-between">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Route Options
              </p>
              <span className="text-[10px] font-medium text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                {MODE_LABELS[travelMode]}
              </span>
            </div>

            <div className="px-3 py-2 space-y-1.5">
              {routes.map((route, i) => (
                <motion.div
                  key={route.id}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.04 }}
                  className={`rounded-xl border transition-all overflow-hidden ${
                    selectedRoute?.id === route.id
                      ? "border-primary bg-primary/5"
                      : "border-transparent bg-muted/40 hover:bg-muted hover:border-border"
                  }`}
                >
                  {/* Clickable header row */}
                  <button
                    onClick={() => pickRoute(route)}
                    className="w-full text-left p-3"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ background: route.color }} />
                        <span className="font-semibold text-sm leading-tight">{route.name}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full border shrink-0 ${rsiBg2(route.rsi)}`}>
                          <span className={rsiColor2(route.rsi)}>RSI {route.rsi}</span>
                        </span>
                        <ChevronDown className={`h-3.5 w-3.5 text-muted-foreground transition-transform ${
                          expandedRouteId === route.id ? "rotate-180" : ""
                        }`} />
                      </div>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground ml-4">
                      <span className="flex items-center gap-1"><Navigation className="h-3 w-3" />{route.distance}</span>
                      <span>{route.duration}</span>
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-bold uppercase"
                        style={{ background: route.color + "22", color: route.color }}>{route.type}</span>
                    </div>
                    <p className="mt-1.5 ml-4 text-[11px] text-muted-foreground truncate">
                      {getRouteSummary(route)[0]}
                    </p>
                  </button>

                  {/* Inline expandable details */}
                  <AnimatePresence>
                    {expandedRouteId === route.id && (
                      <motion.div
                        key="inline-detail"
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden border-t border-border/60"
                      >
                        <div className="px-3 py-3 space-y-2.5">
                          <div className="grid grid-cols-3 gap-2 text-center">
                            <div className="p-2 rounded-lg bg-background/60 border border-border">
                              <div className={`text-base font-bold ${rsiColor2(route.rsi)}`}>{route.rsi}</div>
                              <div className="text-[10px] text-muted-foreground">RSI Score</div>
                            </div>
                            <div className="p-2 rounded-lg bg-background/60 border border-border">
                              <div className="text-sm font-bold">{route.distance}</div>
                              <div className="text-[10px] text-muted-foreground">Distance</div>
                            </div>
                            <div className="p-2 rounded-lg bg-background/60 border border-border">
                              <div className="text-sm font-bold">{route.duration}</div>
                              <div className="text-[10px] text-muted-foreground">Est. Time</div>
                            </div>
                          </div>
                          <div className="bg-muted/40 rounded-lg p-2.5 space-y-1">
                            {getRouteSummary(route).map((reason) => (
                              <p key={reason} className="text-[11px] text-muted-foreground">• {reason}</p>
                            ))}
                          </div>

                          {/* Checkpoints along route */}
                          {route.checkpoints && route.checkpoints.length > 0 && (
                            <div className="bg-muted/30 rounded-lg p-2.5 space-y-1.5">
                              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Safety Checkpoints</p>
                              <div className="space-y-1">
                                {route.checkpoints.map((cp, cpIdx) => (
                                  <div key={cpIdx} className="flex items-center gap-2">
                                    <div className={`h-2.5 w-2.5 rounded-full flex-shrink-0 ${
                                      cp.passed ? "bg-emerald-500" :
                                      cp.type === "police" ? "bg-blue-500" :
                                      cp.type === "hospital" ? "bg-red-400" : "bg-amber-400"
                                    }`} />
                                    <span className="text-[11px] font-medium truncate flex-1">{cp.name}</span>
                                    <span className="text-[10px] text-muted-foreground flex-shrink-0">~{cp.eta}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          <Button
                            className="w-full rounded-xl h-8 text-xs"
                            onClick={() => { pickRoute(route); setNavMode(true); }}
                          >
                            <Navigation className="h-3.5 w-3.5 mr-1.5" /> Start Navigation
                          </Button>
                          <div className="grid grid-cols-3 gap-1.5">
                            <Button variant="outline" className="rounded-xl h-7 text-xs" onClick={() => { setSelectedRoute(route); setShowReviewModal(true); }}>
                              <Star className="h-3 w-3 mr-1" /> Review
                            </Button>
                            <Button variant="outline" className="rounded-xl h-7 text-xs" onClick={() => { setSelectedRoute(route); setShowShareModal(true); }}>
                              <Share2 className="h-3 w-3 mr-1" /> Share
                            </Button>
                            <Button variant="outline" className="rounded-xl h-7 text-xs text-red-500 hover:text-red-500" onClick={() => setShowEmergencyModal(true)}>
                              <Siren className="h-3 w-3 mr-1" /> SOS
                            </Button>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              ))}
            </div>
          </motion.div>
          )}
        </div>}

        {/* Recenter / My Location button */}
        {!navMode && (
          <button
            onClick={() => { (window as any).__mapGoToUser?.(); }}
            className="absolute bottom-20 md:bottom-6 right-3 z-[500] h-10 w-10 rounded-full bg-card/95 backdrop-blur-xl border border-border shadow-elevated flex items-center justify-center hover:bg-muted transition-colors"
            title="Go to my location"
          >
            <Locate className="h-5 w-5 text-primary" />
          </button>
        )}

        {/* ── Area RSI Panel (right side) ───────────────────────────────── */}
        {!navMode && userLoc && (() => {
          // Compute dynamic area RSI from nearby reports, hotspots, safe zones
          const nearReports   = realReports.filter((r) => haversineKm(userLoc.lat, userLoc.lng, r.latitude, r.longitude) < 2);
          const nearIncidents = mapIncidents.filter((inc) => haversineKm(userLoc.lat, userLoc.lng, inc.lat, inc.lng) < 2);
          const nearHotspots  = crimeHotspots.filter((h) => haversineKm(userLoc.lat, userLoc.lng, h.lat, h.lng) < 2);
          const nearSafe      = safeZones.filter((z) => haversineKm(userLoc.lat, userLoc.lng, z.lat, z.lng) < 2);
          const nearPolice    = stationData.filter((ps) => haversineKm(userLoc.lat, userLoc.lng, ps.lat, ps.lng) < 2);

          const reportPenalty  = nearReports.reduce((s, r) => s + (r.severity === "High" ? 5 : r.severity === "Medium" ? 3 : 1), 0);
          const incidentPenalty = nearIncidents.reduce((s, inc) => s + (inc.severity || 1) * 2, 0);
          const hotspotPenalty  = nearHotspots.reduce((s, h) => s + h.danger / 25, 0);
          const safeBonus       = nearSafe.length * 3 + nearPolice.length * 4;
          const rawScore        = Math.max(10, Math.min(100, 75 - reportPenalty - incidentPenalty - hotspotPenalty + safeBonus));
          const areaRsi         = Math.round(rawScore);

          const areaName = (() => {
            // Try to get a meaningful name from the nearest known location
            const nearest = demoLocations.reduce<{ loc: DemoLocation; dist: number } | null>((best, loc) => {
              const d = haversineKm(userLoc.lat, userLoc.lng, loc.lat, loc.lng);
              if (!best || d < best.dist) return { loc, dist: d };
              return best;
            }, null);
            return nearest && nearest.dist < 3 ? nearest.loc.name : `${userLoc.lat.toFixed(4)}°N`;
          })();

          return (
            <motion.div
              initial={{ opacity: 0, x: 16 }}
              animate={{ opacity: 1, x: 0 }}
              className="absolute bottom-20 md:bottom-4 right-2 md:right-3 z-[490] w-48 md:w-52 rounded-2xl bg-card/95 backdrop-blur-xl border border-border shadow-elevated"
            >
              <div className="px-2.5 pt-2 pb-1 border-b border-border">
                <p className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">Your Area</p>
              </div>
              <div className="px-2.5 py-2 space-y-2">
                {/* Area name + RSI */}
                <div className="flex items-center justify-between">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold truncate">{areaName}</p>
                    <p className="text-[10px] text-muted-foreground">Live safety score</p>
                  </div>
                  <div className={`px-2.5 py-1.5 rounded-xl border text-center ${rsiBg2(areaRsi)}`}>
                    <div className={`text-lg font-bold leading-none ${rsiColor2(areaRsi)}`}>{areaRsi}</div>
                    <div className="text-[9px] text-muted-foreground mt-0.5">RSI</div>
                  </div>
                </div>

                {/* Stats grid */}
                <div className="grid grid-cols-2 gap-1.5">
                  <div className="p-1.5 rounded-lg bg-muted/50 text-center">
                    <div className="text-xs font-bold">{nearReports.length}</div>
                    <div className="text-[9px] text-muted-foreground">Reports</div>
                  </div>
                  <div className="p-1.5 rounded-lg bg-muted/50 text-center">
                    <div className="text-xs font-bold">{nearPolice.length}</div>
                    <div className="text-[9px] text-muted-foreground">Police Stn</div>
                  </div>
                  <div className="p-1.5 rounded-lg bg-muted/50 text-center">
                    <div className="text-xs font-bold">{nearSafe.length}</div>
                    <div className="text-[9px] text-muted-foreground">Safe Zones</div>
                  </div>
                  <div className="p-1.5 rounded-lg bg-muted/50 text-center">
                    <div className="text-xs font-bold text-red-500">{nearHotspots.length}</div>
                    <div className="text-[9px] text-muted-foreground">Hotspots</div>
                  </div>
                </div>

                {/* Quick status */}
                <div className={`flex items-center gap-1.5 text-[11px] font-medium px-2 py-1.5 rounded-lg ${
                  areaRsi >= 70 ? "bg-emerald-500/10 text-emerald-600" : areaRsi >= 50 ? "bg-amber-500/10 text-amber-600" : "bg-red-500/10 text-red-600"
                }`}>
                  <span className={`h-1.5 w-1.5 rounded-full ${areaRsi >= 70 ? "bg-emerald-500" : areaRsi >= 50 ? "bg-amber-500" : "bg-red-500"} animate-pulse`} />
                  {areaRsi >= 70 ? "Generally safe area" : areaRsi >= 50 ? "Exercise caution" : "High-risk area — stay alert"}
                </div>
              </div>
            </motion.div>
          );
        })()}



        {/* Deviation/proximity alerts */}
        <AnimatePresence>
          {deviationAlert && (
            <motion.div key="dev"
              initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }}
              className="absolute top-14 right-3 z-[500] w-72 p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 shadow-elevated backdrop-blur-md"
            >
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="font-semibold text-sm">Path Deviation Detected</p>
                  <p className="text-xs text-muted-foreground mt-0.5">You've deviated from the safe route. Are you okay?</p>
                  <div className="flex gap-2 mt-2">
                    <Button size="sm" variant="outline" className="text-xs h-7 rounded-full" onClick={() => setDeviationAlert(false)}>I'm Fine</Button>
                    <Button size="sm" className="text-xs h-7 rounded-full bg-red-500 hover:bg-red-600 text-white">Send Alert</Button>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
          {proximityAlert && !deviationAlert && (
            <motion.div key="prox"
              initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }}
              className="absolute top-14 right-3 z-[500] w-72 p-4 rounded-2xl bg-red-500/10 border border-red-500/30 shadow-elevated backdrop-blur-md"
            >
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="font-semibold text-sm">âš ï¸ Proximity Warning</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Approaching area with reported incidents.</p>
                  <Button size="sm" variant="outline" className="text-xs h-7 rounded-full mt-2" onClick={() => setProximityAlert(false)}>Acknowledged</Button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Low battery alert */}
        <AnimatePresence>
          {batteryLevel !== null && batteryLevel <= 20 && !batteryCharging && !lowBatteryDismissed && (
            <motion.div key="bat"
              initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 16 }}
              className="absolute bottom-28 md:bottom-14 right-3 z-[500] w-64 p-3 rounded-2xl bg-orange-500/10 border border-orange-500/30 shadow-elevated backdrop-blur-md"
            >
              <div className="flex items-start gap-2.5">
                <BatteryLow className="h-5 w-5 text-orange-500 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="font-semibold text-xs">Low Battery — {batteryLevel}%</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    {batteryLevel <= 10
                      ? "Critical! Location sharing may stop soon. Charge your phone."
                      : "Consider charging soon to keep safety features active."}
                  </p>
                  <div className="flex gap-2 mt-2">
                    <Button size="sm" variant="outline" className="text-[10px] h-6 rounded-full px-2.5" onClick={() => setLowBatteryDismissed(true)}>Dismiss</Button>
                    {batteryLevel <= 10 && userLoc && (
                      <Button size="sm" className="text-[10px] h-6 rounded-full px-2.5 bg-red-500 hover:bg-red-600 text-white"
                        onClick={() => setShowEmergencyModal(true)}>Send SOS</Button>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Legend bottom-left */}
        <div className="absolute bottom-20 md:bottom-4 left-2 md:left-3 z-[500] flex flex-wrap items-center gap-2 md:gap-3 px-2 md:px-3 py-1 md:py-1.5 rounded-xl bg-card/90 backdrop-blur-md border border-border shadow-soft text-[10px] md:text-xs text-muted-foreground max-w-[260px] md:max-w-xs">
          <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-blue-500" />Police</span>
          <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-red-500" />Incident</span>
          {showSafeZones && <>
            <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />Hospital</span>
            <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-amber-400" />Commercial</span>
          </>}
          {showHotspots && <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full border-2 border-red-400 bg-red-400/20" />Hotspot</span>}
        </div>



        <SOSButton />

        {/* Modals */}
        <AnimatePresence>
          {showEmergencyModal && <EmergencyModal onClose={() => setShowEmergencyModal(false)} />}
          {showReportModal    && <ReportModal    onClose={() => setShowReportModal(false)} />}
          {showReviewModal && selectedRoute && (
            <ReviewModal routeName={selectedRoute.name} onClose={() => setShowReviewModal(false)} />
          )}
          {showShareModal && (
            <ShareModal origin={origin} destination={destination} onClose={() => setShowShareModal(false)} />
          )}
        </AnimatePresence>

        {/* AI Safety Assistant chatbot */}
        <AISafetyAssistant />
      </div>
    </div>
  );
}

