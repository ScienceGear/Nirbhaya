/**
 * Hybrid Router — combines OSRM road routing with H3 safety scoring.
 *
 * Flow:
 *   1. Load crime/police/hospital data from DB (cached in memory, TTL 10 min)
 *   2. Call OSRM for up to 3 road-network alternatives
 *   3. Score each route with SafetyAStarRouter.scoreCoordPath()
 *   4. Optionally run H3 A* for a "pure safest hex path" overlay
 *   5. Re-rank by safetyScore and return enriched route objects
 */

import PoliceStation from "../model/policestations.model.js";
import Hospital from "../model/hospital.model.js";
import Report from "../model/report.model.js";
import SafeCityIncident from "../model/safecityIncident.model.js";
import { SafetyAStarRouter, haversineKm } from "./safety-router.js";
import { fetchOsrmRoutes, formatDuration } from "./osrm.library.js";
import { latLngToCell, cellToLatLng } from "h3-js";

// ─── In-memory data cache (avoid repeated DB hits) ───────────────────────────
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes
let _cachedData = null;
let _cacheExpiry = 0;

async function loadSafetyData() {
  const now = Date.now();
  if (_cachedData && now < _cacheExpiry) return _cachedData;

  console.log("[HybridRouter] Loading safety data from DB…");

  const [stations, hospitals, reports, scIncidents] = await Promise.all([
    PoliceStation.find({}).lean(),
    Hospital.find({}).lean(),
    Report.find({}).sort({ timestamp: -1 }).limit(500).lean(),
    // SafeCity incidents model may not exist in every env — guard it
    SafeCityIncident?.find({}).limit(2000).lean().catch(() => []),
  ]);

  const policeStations = stations
    .filter((s) => s.latitude && s.longitude)
    .map((s) => ({ lat: s.latitude, lng: s.longitude, capacity: 1 }));

  const hospitalPoints = hospitals
    .filter((h) => h.location?.coordinates?.length === 2)
    .map((h) => ({
      lat: h.location.coordinates[1],
      lng: h.location.coordinates[0],
      capacity: 1,
    }));

  // Community reports → crimes
  const reportCrimes = reports
    .filter((r) => r.latitude && r.longitude)
    .map((r) => ({
      lat: Number(r.latitude),
      lng: Number(r.longitude),
      severity: r.severity === "High" ? 3 : r.severity === "Medium" ? 2 : 1,
    }));

  // SafeCity incidents → crimes (model uses location.coordinates = [lng, lat])
  const scCrimes = (scIncidents || [])
    .filter((i) => i.location?.coordinates?.length === 2)
    .map((i) => ({
      lat: i.location.coordinates[1],
      lng: i.location.coordinates[0],
      severity: i.severity ?? 2,
    }));

  const crimes = [...reportCrimes, ...scCrimes];

  console.log(
    `[HybridRouter] Loaded: ${crimes.length} crimes, ` +
    `${policeStations.length} police, ${hospitalPoints.length} hospitals`
  );

  _cachedData = { crimes, policeStations, hospitals: hospitalPoints };
  _cacheExpiry = now + CACHE_TTL_MS;
  return _cachedData;
}

/** Invalidate the cache (call after new reports are submitted) */
export function invalidateSafetyCache() {
  _cachedData = null;
  _cacheExpiry = 0;
}

// ─── Route type labels ────────────────────────────────────────────────────────
const ROUTE_LABELS = [
  { type: "safest",   label: "Safest Route",   color: "#22c55e" },
  { type: "moderate", label: "Balanced Route",  color: "#f59e0b" },
  { type: "fastest",  label: "Fastest Route",   color: "#ef4444" },
];

// ─── Main export ──────────────────────────────────────────────────────────────

/**
 * Find the safest road routes between two points.
 *
 * @param {object} params
 * @param {number} params.startLat
 * @param {number} params.startLng
 * @param {number} params.endLat
 * @param {number} params.endLng
 * @param {string} [params.profile="foot"]   OSRM travel mode
 * @param {number} [params.resolution=9]     H3 resolution for scoring
 * @param {boolean}[params.includeHexPath]   Also return H3 A* hex path
 * @returns {Promise<HybridRouteResult>}
 */
export async function findHybridRoutes({
  startLat,
  startLng,
  endLat,
  endLng,
  profile = "foot",
  resolution = 9,
  includeHexPath = false,
}) {
  // 1. Load safety data
  const safetyData = await loadSafetyData();

  // 2. Build the router (danger cache is per-request for now; for very high
  //    traffic you'd want a shared singleton keyed on the data version)
  const router = new SafetyAStarRouter({
    resolution,
    ...safetyData,
    dangerThreshold: 0.82,
    influenceRings: 3,
  });

  // 3. Fetch OSRM routes (with fallback to H3-only if OSRM is unavailable)
  let osrmRoutes = [];
  let osrmAvailable = true;

  try {
    osrmRoutes = await fetchOsrmRoutes({
      startLat, startLng, endLat, endLng,
      profile,
      maxAlternatives: 3,
    });
  } catch (err) {
    osrmAvailable = false;
    console.warn("[HybridRouter] OSRM unavailable:", err.message);
  }

  // 4. Score every OSRM route
  const scoredRoutes = osrmRoutes.map((r, i) => {
    const safety = router.scoreCoordPath(r.coordinates, 0.15);
    return {
      ...r,
      safetyScore: safety.safetyScore,
      avgDanger: safety.avgDanger,
      maxDanger: safety.maxDanger,
      _originalIdx: i,
    };
  });

  // 5. Sort by safetyScore descending (safest first)
  scoredRoutes.sort((a, b) => b.safetyScore - a.safetyScore);

  // 6. Assign semantic labels
  const labelledRoutes = scoredRoutes.map((r, i) => {
    const label = ROUTE_LABELS[i] ?? { type: `route-${i + 1}`, label: `Route ${i + 1}`, color: "#6366f1" };
    const durationMin = r.durationMin;
    const reasons = buildReasons(r);

    return {
      id: r.id,
      name: label.label,
      type: label.type,
      rsi: r.safetyScore,
      duration: formatDuration(durationMin),
      distance: `${r.distanceKm.toFixed(1)} km`,
      color: label.color,
      coordinates: r.coordinates, // [[lng,lat],...]
      avgDanger: r.avgDanger,
      maxDanger: r.maxDanger,
      reasons,
    };
  });

  // 7. Optional: run H3 A* for a "pure hex safest path"
  let hexPath = null;
  if (includeHexPath) {
    try {
      const rawHexes = router.findSafestPath(
        { lat: startLat, lng: startLng },
        { lat: endLat,   lng: endLng  }
      );

      if (rawHexes.length) {
        hexPath = {
          hexIds: rawHexes,
          // Convert hex centers back to [lng,lat] for map display
          coordinates: rawHexes.map((h) => {
            const [lat, lng] = cellToLatLng(h);
            return [lng, lat];
          }),
          safetyScore: Math.round(
            rawHexes.reduce((sum, h) => sum + (1 - router.computeDanger(h)), 0) /
            rawHexes.length * 100
          ),
        };
      }
    } catch (err) {
      console.warn("[HybridRouter] H3 A* failed:", err.message);
    }
  }

  // 8. If OSRM was unavailable and we have a hex path, promote it as the only route
  if (!osrmAvailable && hexPath) {
    const hexKm = computePathKm(hexPath.coordinates);
    labelledRoutes.push({
      id: "hex-astar",
      name: "Safest Path (Safety A*)",
      type: "safest",
      rsi: hexPath.safetyScore,
      duration: `~${Math.round(hexKm / 4.5 * 60)} min`,
      distance: `${hexKm.toFixed(1)} km`,
      color: "#22c55e",
      coordinates: hexPath.coordinates,
      avgDanger: 1 - hexPath.safetyScore / 100,
      maxDanger: null,
      reasons: ["Computed by safety-aware hex pathfinding"],
    });
  }

  return {
    routes: labelledRoutes,
    hexPath: includeHexPath ? hexPath : undefined,
    dataSource: {
      osrmAvailable,
      crimeCount:   safetyData.crimes.length,
      policeCount:  safetyData.policeStations.length,
      hospitalCount: safetyData.hospitals.length,
    },
  };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function buildReasons(route) {
  const reasons = [];
  if (route.safetyScore >= 80) reasons.push("High safety score along this corridor");
  if (route.safetyScore < 55)  reasons.push("Lower safety — community reports nearby");
  if (route.maxDanger > 0.7)   reasons.push("Some high-risk spots detected on route");
  if (route.avgDanger < 0.3)   reasons.push("Low danger density along this path");
  if (route.durationMin <= 20) reasons.push("Short travel time reduces exposure");
  return reasons;
}

function computePathKm(coords) {
  let total = 0;
  for (let i = 1; i < coords.length; i++) {
    const [ln1, la1] = coords[i - 1];
    const [ln2, la2] = coords[i];
    total += haversineKm(la1, ln1, la2, ln2);
  }
  return total;
}
