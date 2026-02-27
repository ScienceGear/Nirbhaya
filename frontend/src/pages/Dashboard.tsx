import { useState, useEffect, useRef, useCallback, useMemo, type ElementType } from "react";
import { Link, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search, Navigation, Shield, Layers, AlertTriangle, MapPin, Phone,
  Home, Map, Siren, FileWarning, Settings, Sun, Moon, LogOut, Star,
  User, ChevronDown, ChevronUp, X, Share2, ShieldCheck,
  Activity,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  mockRoutes, policeStations, incidents, PUNE_CENTER, demoLocations,
  safeZones, crimeHotspots,
  type RouteOption, type DemoLocation,
} from "@/lib/mockData";
import { useTheme } from "@/lib/theme";
import { useAuth } from "@/lib/auth";
import SOSButton from "@/components/SOSButton";
import DashboardNav from "@/components/DashboardNav";
import { MapContainer, TileLayer, Marker, Popup, Polyline, Circle, useMap } from "react-leaflet";
import L from "leaflet";
import { useQuery } from "@tanstack/react-query";
import { getCrowdHeatmap, getMapOverview } from "@/lib/api";
import { importLibrary, setOptions } from "@googlemaps/js-api-loader";

/* ─── Google Maps API config ─────────────────────────────────────────────── */
setOptions({ apiKey: "AIzaSyBHQJgdFNDxvNZeeDp9sbQGWW7eFn1arm0", version: "weekly" });

/* â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ Leaflet icon fix â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
});
const makeIcon = (color: string) =>
  L.divIcon({
    className: "",
    html: `<div style="background:${color};width:18px;height:18px;border-radius:50%;border:2.5px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,.35)"></div>`,
    iconSize: [18, 18],
    iconAnchor: [9, 9],
  });
const policeIconNew = makeIcon("#3b82f6");
const incidentIconNew = makeIcon("#ef4444");
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
  | { kind: "local"; loc: DemoLocation }
  | { kind: "google"; label: string; placeId: string };

/* ─── LocationInput with Google Places autocomplete ─────────────────────── */
function LocationInput({
  value,
  onChange,
  onSelect,
  placeholder,
  dotColor,
}: {
  value: string;
  onChange: (v: string) => void;
  onSelect: (loc: DemoLocation) => void;
  placeholder: string;
  dotColor: string;
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
    const local: Suggestion[] = filterLocations(q).map((loc) => ({ kind: "local", loc }));
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
            className="absolute left-0 right-0 top-full mt-1 z-[900] rounded-xl border border-border bg-card/97 backdrop-blur-xl shadow-elevated overflow-hidden"
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

/* ── Fallback (offline) routes – simple 4-pt bezier approximation ── */
function buildFallbackRoutes(
  s: { lat: number; lng: number },
  e: { lat: number; lng: number },
): RouteOption[] {
  const pts = (t: number, dx: number, dy: number): [number, number][] => [
    [s.lng, s.lat],
    [s.lng + (e.lng - s.lng) * t + dx,              s.lat + (e.lat - s.lat) * t + dy],
    [s.lng + (e.lng - s.lng) * (t + 0.35) - dx * 0.7, s.lat + (e.lat - s.lat) * (t + 0.35) - dy * 0.7],
    [s.lng + (e.lng - s.lng) * 0.65,               s.lat + (e.lat - s.lat) * 0.65],
    [e.lng, e.lat],
  ];
  return [
    {
      id: "r1",
      name: "Safest via Active Streets",
      type: "safest",
      rsi: 88,
      duration: "28 min",
      distance: "7.8 km",
      color: "#22c55e",
      coordinates: pts(0.28, 0.008, 0.005),
      reasons: ["Better street lighting", "Higher foot traffic", "More police proximity"],
    },
    {
      id: "r2",
      name: "Balanced via Main Road",
      type: "moderate",
      rsi: 72,
      duration: "23 min",
      distance: "6.7 km",
      color: "#f59e0b",
      coordinates: pts(0.38, -0.004, 0.002),
      reasons: ["Good balance of safety and time", "Mostly arterial roads", "Moderate incident density"],
    },
    {
      id: "r3",
      name: "Fastest Direct",
      type: "fastest",
      rsi: 54,
      duration: "17 min",
      distance: "5.3 km",
      color: "#ef4444",
      coordinates: pts(0.5, 0, 0),
      reasons: ["Shortest ETA", "Fewer turns", "Lower safety score after dark"],
    },
  ];
}

/* ── OSRM real-road routing (free public API, falls back to demo if offline) ── */
async function fetchRealRoutes(
  s: { lat: number; lng: number },
  e: { lat: number; lng: number },
  incidentData: Array<{ lat: number; lng: number; severity: number; areaRating?: number }> = [],
): Promise<RouteOption[]> {
  const haversineKm = (lat1: number, lng1: number, lat2: number, lng2: number) => {
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
  };

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

  try {
    // Use OSRM public API – foot profile for pedestrian safety navigation
    const url =
      `https://router.project-osrm.org/route/v1/foot/` +
      `${s.lng},${s.lat};${e.lng},${e.lat}` +
      `?overview=full&geometries=geojson&alternatives=true`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timeout);
    if (!res.ok) throw new Error("osrm-http");
    const data = await res.json();
    if (data.code !== "Ok" || !data.routes?.length) throw new Error("osrm-no-routes");

    const COLOR = ["#22c55e", "#f59e0b", "#ef4444"];
    const NAMES = ["Safest via Main Roads", "Balanced Route", "Fastest Direct"];
    const TYPES = ["safest", "moderate", "fastest"] as const;
    const RSI = [88, 72, 54];
    const REASONS = [
      ["Better-lit segments", "Lower incident density", "More support points nearby"],
      ["Balanced time and safety", "Mixed main + inner roads", "Moderate CCTV coverage"],
      ["Lowest ETA", "Direct road geometry", "Avoid if you prefer higher safety score"],
    ];

    const primary = data.routes.slice(0, 3).map((r: any, i: number) => {
      const coords = r.geometry.coordinates as [number, number][];
      const routePenalty = computeRoutePenalty(coords);
      const adjustedRsi = Math.max(20, RSI[i] - routePenalty);
      const reasons = [...REASONS[i]];
      if (routePenalty >= 5) {
        reasons.push("Community reports near this area lowered RSI");
      }
      return {
      id: `r${i + 1}`,
      name: NAMES[i],
      type: TYPES[i],
      rsi: adjustedRsi,
      duration: `${Math.round(r.duration / 60)} min`,
      distance: `${(r.distance / 1000).toFixed(1)} km`,
      color: COLOR[i],
      reasons,
      coordinates: coords,
    }});

    if (primary.length >= 3) return primary;

    // Ensure users always get 3 choices
    const fallback = buildFallbackRoutes(s, e);
    return [...primary, ...fallback.slice(primary.length, 3)];
  } catch {
    // OSRM unreachable (offline / rate-limited) — fall back to demo curves
    return buildFallbackRoutes(s, e);
  }
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
}: {
  center: [number, number];
  routeCoords?: [number, number][];
}) {
  const map = useMap();
  useEffect(() => {
    if (routeCoords && routeCoords.length >= 2) {
      // Convert [lng,lat] pairs to Leaflet LatLng then fitBounds
      const latlngs = routeCoords.map(([lng, lat]) => L.latLng(lat, lng));
      map.fitBounds(L.latLngBounds(latlngs), { padding: [60, 60], maxZoom: 16 });
    } else {
      map.setView(center, 13);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [routeCoords, center]);
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

/* ─── Floating Feature Panel ─────────────────────────────────────────────── */
function FeaturePanel({
  onEmergency, onReport, onReview, onShare,
}: {
  onEmergency: () => void; onReport: () => void; onReview: () => void; onShare: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9, y: 10 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.9, y: 10 }}
      className="absolute bottom-16 right-3 z-[500] rounded-2xl bg-card/95 backdrop-blur-xl border border-border shadow-elevated"
    >
      <div className="px-3 pt-2.5 pb-1.5 border-b border-border">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Safety Tools</p>
      </div>
      <div className="grid grid-cols-2 gap-1 p-2">
        {[
          { label: "Emergency\nAlert",  icon: Siren,         fn: onEmergency, color: "text-red-500 hover:bg-red-500/10" },
          { label: "Report\nIncident",  icon: AlertTriangle, fn: onReport,    color: "text-amber-500 hover:bg-amber-500/10" },
          { label: "Share\nLocation",   icon: Share2,        fn: onShare,     color: "text-blue-500 hover:bg-blue-500/10" },
          { label: "Review\nRoute",     icon: Star,          fn: onReview,    color: "text-purple-500 hover:bg-purple-500/10" },
        ].map(({ label, icon: Icon, fn, color }) => (
          <button key={label} onClick={fn}
            className={`flex flex-col items-center gap-1.5 rounded-xl p-3 text-xs font-medium transition-colors ${color}`}>
            <Icon className="h-5 w-5" />
            <span className="text-center leading-tight whitespace-pre-wrap">{label}</span>
          </button>
        ))}
      </div>
    </motion.div>
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
  const [origin, setOrigin] = useState("Pune Station");
  const [originLoc, setOriginLoc] = useState<DemoLocation | null>(resolveLocation2("Pune Station"));
  const [destination, setDestination] = useState("FC Road");
  const [destLoc, setDestLoc] = useState<DemoLocation | null>(resolveLocation2("FC Road"));
  const [routes, setRoutes] = useState<RouteOption[]>(mockRoutes);
  const [selectedRoute, setSelectedRoute] = useState<RouteOption | null>(null);
  const [panelOpen, setPanelOpen] = useState(true);
  const [showPolice, setShowPolice] = useState(true);
  const [showIncidents, setShowIncidents] = useState(true);
  const [showHeatmap, setShowHeatmap] = useState(false);
  const [showSafeZones, setShowSafeZones] = useState(false);
  const [showHotspots, setShowHotspots] = useState(false);
  const [deviationAlert, setDeviationAlert] = useState(false);
  const [proximityAlert, setProximityAlert] = useState(false);
  const [searchError, setSearchError] = useState("");
  const [showDetail, setShowDetail] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  // Safety mode & modals
  const [safetyMode, setSafetyMode] = useState(false);
  const [showFeaturePanel, setShowFeaturePanel] = useState(false);
  const [showEmergencyModal, setShowEmergencyModal] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [userLoc, setUserLoc] = useState<{ lat: number; lng: number; accuracy?: number } | null>(null);
  const [userHeading, setUserHeading] = useState(0);
  const lastUserLocRef = useRef<{ lat: number; lng: number } | null>(null);

  const toggleSafetyMode = () => {
    const next = !safetyMode;
    setSafetyMode(next);
    setShowFeaturePanel(next);
    setShowSafeZones(next);
    setShowHotspots(next);
    setShowPolice(true);
    setShowIncidents(next);
  };

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

  const mapIncidents = overview?.incidents || incidents;
  const mapClusters = overview?.clusters || [];
  const mapHeat = overview?.heatmap || [];
  const stationData  = overview?.policeStations || policeStations;
  const userArrowIcon = useMemo(() => makeUserArrowIcon(userHeading), [userHeading]);

  const mapCenter: [number, number] = selectedRoute
    ? [selectedRoute.coordinates[0][1], selectedRoute.coordinates[0][0]]
    : userLoc
    ? [userLoc.lat, userLoc.lng]
    : originLoc
    ? [originLoc.lat, originLoc.lng]
    : [PUNE_CENTER[1], PUNE_CENTER[0]];

  useEffect(() => {
    if (!("geolocation" in navigator)) return;
    const watcher = navigator.geolocation.watchPosition(
      (pos) => {
        const next = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
        };
        setUserLoc(next);

        if (typeof pos.coords.heading === "number" && !Number.isNaN(pos.coords.heading)) {
          setUserHeading(pos.coords.heading);
        } else if (lastUserLocRef.current) {
          setUserHeading(computeBearing(lastUserLocRef.current, next));
        }

        lastUserLocRef.current = { lat: next.lat, lng: next.lng };
      },
      () => {
        // Keep app working even if permission denied
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 5000 }
    );
    return () => navigator.geolocation.clearWatch(watcher);
  }, []);

  useEffect(() => {
    if (!selectedRoute) return;
    const t1 = setTimeout(() => setDeviationAlert(true), 12000);
    const t2 = setTimeout(() => setProximityAlert(true),  6000);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [selectedRoute]);

  const handleSearch = async () => {
    const s = originLoc || resolveLocation2(origin);
    const e = destLoc   || resolveLocation2(destination);
    if (!s || !e) { setSearchError("Type an origin and destination."); return; }
    if (s.lat === e.lat && s.lng === e.lng) { setSearchError("Origin and destination must differ."); return; }
    setIsSearching(true);
    setSearchError("");
    try {
      const gen = await fetchRealRoutes(s, e, mapIncidents);
      setRoutes(gen);
      setSelectedRoute(gen[0]);
      setShowDetail(true);
      setDeviationAlert(false);
      setProximityAlert(false);
    } finally {
      setIsSearching(false);
    }
  };

  const pickRoute = (r: RouteOption) => {
    setSelectedRoute(r);
    setShowDetail(true);
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
          className="h-full w-full"
          zoomControl={false}
          scrollWheelZoom
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <MapController
            center={mapCenter}
            routeCoords={selectedRoute?.coordinates}
          />

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

          {/* Heatmap visualization */}
          {showHeatmap && mapIncidents.map((inc) => {
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
          {showHeatmap && mapHeat.map((point, i) => {
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
          {showHeatmap && mapClusters.map((cluster) => (
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
          {showHeatmap && (crowdHeat?.points || []).map((point) => {
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
          {showHeatmap && crimeHotspots.map((h, i) => (
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

          {/* Police stations */}
          {showPolice && stationData.map((ps) => (
            <Marker key={ps.id} position={[ps.lat, ps.lng]} icon={policeIconNew}>
              <Popup>
                <strong className="block text-sm">{ps.name}</strong>
                <span className="text-xs text-gray-500">{ps.address}</span><br />
                <span className="text-xs font-medium">{ps.phone}</span>
              </Popup>
            </Marker>
          ))}

          {/* Safe zones — police stations, hospitals, commercial */}
          {showSafeZones && safeZones.map((z, i) => {
            const color = z.type === "police" ? "#3b82f6" : z.type === "hospital" ? "#22c55e" : "#f59e0b";
            return (
              <Marker key={`sz-${i}`} position={[z.lat, z.lng]} icon={makeIcon(color)}>
                <Popup>
                  <strong className="block text-sm">{z.name}</strong>
                  <span className="text-xs capitalize">{z.type}</span>
                  <br /><span className="text-xs text-emerald-600 font-medium">Safety Score: {z.safety}/100</span>
                </Popup>
              </Marker>
            );
          })}

          {/* Crime hotspots — pulsing circles */}
          {showHotspots && crimeHotspots.map((h, i) => (
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

          {/* Incidents */}
          {showIncidents && mapIncidents.map((inc) => (
            <Marker key={inc.id} position={[inc.lat, inc.lng]} icon={incidentIconNew}>
              <Popup>
                <strong className="block text-sm capitalize">{inc.type.replace("_", " ")}</strong>
                <span className="text-xs">{inc.description}</span><br />
                <span className="text-xs text-gray-400">{new Date(inc.timestamp).toLocaleDateString()}</span>
              </Popup>
            </Marker>
          ))}

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
            </>
          )}
        </MapContainer>

        {/* â”€â”€ Floating search + routes panel (top-left, Ã  la Google Maps) â”€â”€ */}
        <div
          className="absolute left-2 right-2 md:left-3 md:right-auto top-2 md:top-3 z-[500] flex flex-col gap-2 md:w-[310px]"
          style={{ maxHeight: "calc(100dvh - 16px)", overflow: "hidden" }}
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
                    <div className="pt-3">
                      <LocationInput
                        value={origin}
                        onChange={(v) => { setOrigin(v); setOriginLoc(null); }}
                        onSelect={(loc) => { setOrigin(loc.name); setOriginLoc(loc); setSearchError(""); }}
                        placeholder="From — e.g. Pune Station"
                        dotColor="#22c55e"
                      />
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
                    />

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

          {/* Routes list card */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.07 }}
            className="rounded-2xl bg-card/95 backdrop-blur-xl border border-border shadow-elevated overflow-y-auto"
            style={{ maxHeight: "calc(100dvh - 270px)" }}
          >
            <div className="px-4 pt-3 pb-1 border-b border-border">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Route Options
              </p>
            </div>

            <div className="px-3 py-2 space-y-1.5">
              {routes.map((route, i) => (
                <motion.button
                  key={route.id}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.04 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => pickRoute(route)}
                  className={`w-full text-left p-3 rounded-xl border transition-all ${
                    selectedRoute?.id === route.id
                      ? "border-primary bg-primary/5"
                      : "border-transparent bg-muted/40 hover:bg-muted hover:border-border"
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ background: route.color }} />
                      <span className="font-semibold text-sm leading-tight">{route.name}</span>
                    </div>
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full border shrink-0 ${rsiBg2(route.rsi)}`}>
                      <span className={rsiColor2(route.rsi)}>RSI {route.rsi}</span>
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground ml-4">
                    <span className="flex items-center gap-1"><Navigation className="h-3 w-3" />{route.distance}</span>
                    <span>{route.duration}</span>
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-bold uppercase"
                      style={{ background: route.color + "22", color: route.color }}>{route.type}</span>
                  </div>
                  <p className="mt-1.5 ml-4 text-[11px] text-muted-foreground truncate">
                    Why this route: {getRouteSummary(route)[0]}
                  </p>
                </motion.button>
              ))}
            </div>

            {/* Expandable route detail */}
            <AnimatePresence>
              {selectedRoute && showDetail && (
                <motion.div
                  key="detail"
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="border-t border-border overflow-hidden"
                >
                  <div className="px-4 py-3 space-y-3">
                    <div className="flex items-center justify-between">
                      <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                        Route Details
                      </p>
                      <button onClick={() => setShowDetail(false)} className="text-muted-foreground hover:text-foreground">
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div className="p-2 rounded-lg bg-muted/60 border border-border">
                        <div className={`text-base font-bold ${rsiColor2(selectedRoute.rsi)}`}>{selectedRoute.rsi}</div>
                        <div className="text-[10px] text-muted-foreground">RSI</div>
                      </div>
                      <div className="p-2 rounded-lg bg-muted/60 border border-border">
                        <div className="text-base font-bold">{selectedRoute.distance}</div>
                        <div className="text-[10px] text-muted-foreground">Distance</div>
                      </div>
                      <div className="p-2 rounded-lg bg-muted/60 border border-border">
                        <div className="text-base font-bold">{selectedRoute.duration}</div>
                        <div className="text-[10px] text-muted-foreground">Time</div>
                      </div>
                    </div>
                    <div className="text-xs text-muted-foreground bg-muted/40 rounded-lg p-2.5 space-y-1">
                      {getRouteSummary(selectedRoute).map((reason) => (
                        <p key={reason}>• {reason}</p>
                      ))}
                    </div>
                    <Button className="w-full rounded-xl h-8 text-xs" onClick={handleSearch}>
                      <Navigation className="h-3.5 w-3.5 mr-1.5" /> Start Navigation
                    </Button>
                    <div className="grid grid-cols-3 gap-1.5">
                      <Button variant="outline" className="rounded-xl h-7 text-xs" onClick={() => setShowReviewModal(true)}>
                        <Star className="h-3 w-3 mr-1" /> Review
                      </Button>
                      <Button variant="outline" className="rounded-xl h-7 text-xs" onClick={() => setShowShareModal(true)}>
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
        </div>

        {/* â”€â”€ Deviation / proximity alerts (top-right corner) â”€â”€ */}
        {/* Safety Mode toggle button (top-right) */}
        <div className="absolute top-3 right-3 z-[500]">
          <button
            onClick={toggleSafetyMode}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold shadow-elevated transition-all ${
              safetyMode
                ? "bg-emerald-500 text-white hover:bg-emerald-600"
                : "bg-card/95 backdrop-blur-xl border border-border text-foreground hover:bg-muted"
            }`}
          >
            <ShieldCheck className="h-4 w-4" />
            {safetyMode ? "🚺 Safety Mode ON" : "Activate Safety Mode"}
          </button>
        </div>

        {/* Deviation/proximity alerts (below safety mode toggle) */}
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

        {/* â”€â”€ Legend bottom-left â”€â”€ */}
        {/* Legend bottom-left */}
        <div className="absolute bottom-4 left-3 z-[500] flex flex-wrap items-center gap-3 px-3 py-1.5 rounded-xl bg-card/90 backdrop-blur-md border border-border shadow-soft text-xs text-muted-foreground max-w-xs">
          <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-blue-500" />Police</span>
          <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-red-500" />Incident</span>
          {showSafeZones && <>
            <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />Hospital</span>
            <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-amber-400" />Commercial</span>
          </>}
          {showHotspots && <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full border-2 border-red-400 bg-red-400/20" />Hotspot</span>}
        </div>

        {/* Feature panel floating bottom-right */}
        <AnimatePresence>
          {showFeaturePanel && (
            <FeaturePanel
              onEmergency={() => setShowEmergencyModal(true)}
              onReport={() => setShowReportModal(true)}
              onReview={() => setShowReviewModal(true)}
              onShare={() => setShowShareModal(true)}
            />
          )}
        </AnimatePresence>

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
      </div>
    </div>
  );
}

