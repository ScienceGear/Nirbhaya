/**
 * Google Maps Crowd Estimator
 * Uses Google Places Nearby Search to estimate crowd/activity levels
 * based on place density, types, ratings, and time-of-day factors.
 *
 * Data source: Google Places API (nearby search)
 * Approach: Dense clusters of open businesses = crowded = safer for women
 */

const GMAPS_API_KEY = process.env.GMAPS_API_KEY || "AIzaSyBHQJgdFNDxvNZeeDp9sbQGWW7eFn1arm0";

/* ── In-memory cache (5 min TTL per grid cell) ── */
const _placeCache = new Map();
const CACHE_TTL = 5 * 60 * 1000;

/* ── Time-of-day crowd multipliers (India patterns) ── */
function getTimeFactor(hour) {
  // Morning rush: 8-10
  if (hour >= 8 && hour <= 10) return 1.1;
  // Midday busy: 11-14
  if (hour >= 11 && hour <= 14) return 1.2;
  // Evening rush: 17-21
  if (hour >= 17 && hour <= 21) return 1.3;
  // Late night (unsafe): 22-5
  if (hour >= 22 || hour <= 5) return 0.4;
  // Early morning: 6-7
  if (hour >= 6 && hour <= 7) return 0.6;
  // Afternoon lull: 15-16
  return 0.9;
}

/* ── Place type to safety weight mapping ── */
const SAFETY_WEIGHTS = {
  police: 3.0,
  hospital: 2.5,
  fire_station: 2.5,
  shopping_mall: 2.0,
  restaurant: 1.5,
  cafe: 1.5,
  convenience_store: 1.3,
  supermarket: 1.5,
  bank: 1.5,
  atm: 1.2,
  bus_station: 1.3,
  train_station: 1.5,
  subway_station: 1.5,
  gas_station: 1.2,
  pharmacy: 1.3,
  hotel: 1.3,
  lodging: 1.0,
  parking: 0.8,
  park: 0.6, // parks can be unsafe at night
  cemetery: 0.3,
  storage: 0.4,
};

function getPlaceSafetyWeight(types) {
  if (!Array.isArray(types)) return 1.0;
  let maxWeight = 1.0;
  for (const t of types) {
    if (SAFETY_WEIGHTS[t] && SAFETY_WEIGHTS[t] > maxWeight) {
      maxWeight = SAFETY_WEIGHTS[t];
    }
  }
  return maxWeight;
}

/**
 * Fetch nearby places from Google Maps Places API
 */
async function fetchNearbyPlaces(lat, lng, radiusM = 1500, type = "") {
  const cacheKey = `${lat.toFixed(3)},${lng.toFixed(3)},${radiusM},${type}`;
  const cached = _placeCache.get(cacheKey);
  if (cached && Date.now() - cached.ts < CACHE_TTL) {
    return cached.data;
  }

  const url = new URL("https://maps.googleapis.com/maps/api/place/nearbysearch/json");
  url.searchParams.set("location", `${lat},${lng}`);
  url.searchParams.set("radius", String(radiusM));
  url.searchParams.set("key", GMAPS_API_KEY);
  if (type) url.searchParams.set("type", type);

  try {
    const res = await fetch(url.toString(), { signal: AbortSignal.timeout(8000) });
    if (!res.ok) return [];
    const data = await res.json();
    const results = data.results || [];
    _placeCache.set(cacheKey, { data: results, ts: Date.now() });
    return results;
  } catch (err) {
    console.error("[GMaps-Crowd] Fetch error:", err.message || err);
    return [];
  }
}

/**
 * Build crowd/activity heatmap points from Google Maps places data.
 *
 * @param {number} centerLat
 * @param {number} centerLng
 * @param {number} radiusKm - search radius
 * @param {number} hour - current hour (0-23)
 * @returns {Promise<Array<{id:string, lat:number, lng:number, busyPct:number, weight:number, source:string, placeName?:string}>>}
 */
export async function getGMapsCrowdData({ centerLat, centerLng, radiusKm = 5, hour }) {
  const currentHour = typeof hour === "number" ? hour : new Date().getHours();
  const timeFactor = getTimeFactor(currentHour);

  // Search multiple focused types that indicate human activity
  const searchTypes = ["restaurant", "shopping_mall", "hospital", "police", "bus_station", "cafe", "atm"];

  // Also do a general search (no type filter) to catch everything
  const queries = [
    fetchNearbyPlaces(centerLat, centerLng, Math.min(radiusKm * 1000, 5000)),
    ...searchTypes.slice(0, 3).map((t) =>
      fetchNearbyPlaces(centerLat, centerLng, Math.min(radiusKm * 1000, 5000), t)
    ),
  ];

  const resultsArr = await Promise.allSettled(queries);
  const allPlaces = new Map(); // dedup by place_id

  for (const result of resultsArr) {
    if (result.status !== "fulfilled") continue;
    for (const place of result.value) {
      if (!place.geometry?.location?.lat || !place.geometry?.location?.lng) continue;
      allPlaces.set(place.place_id, place);
    }
  }

  // Group places into ~500m grid cells
  const gridCells = new Map();

  for (const place of allPlaces.values()) {
    const plat = place.geometry.location.lat;
    const plng = place.geometry.location.lng;
    const gridKey = `${plat.toFixed(2)},${plng.toFixed(2)}`;

    const cell = gridCells.get(gridKey) || {
      lat: 0,
      lng: 0,
      count: 0,
      totalRating: 0,
      totalWeight: 0,
      names: [],
    };

    cell.lat = (cell.lat * cell.count + plat) / (cell.count + 1);
    cell.lng = (cell.lng * cell.count + plng) / (cell.count + 1);
    cell.count += 1;
    cell.totalRating += place.rating || 3;
    cell.totalWeight += getPlaceSafetyWeight(place.types);
    if (place.name && cell.names.length < 3) cell.names.push(place.name);

    gridCells.set(gridKey, cell);
  }

  const points = [];
  let idx = 0;

  for (const [, cell] of gridCells) {
    const avgRating = cell.totalRating / cell.count;
    const avgSafetyWeight = cell.totalWeight / cell.count;

    // Base busy percentage: more places & higher safety weight = busier/safer
    const baseBusy = Math.min(100, Math.round(
      (cell.count * 8 + avgRating * 5 + avgSafetyWeight * 10) * timeFactor
    ));

    points.push({
      id: `gmaps-crowd-${idx++}`,
      lat: cell.lat,
      lng: cell.lng,
      busyPct: Math.min(100, Math.max(5, baseBusy)),
      weight: Math.min(1, Math.max(0.1, baseBusy / 100)),
      source: "google-maps",
      placeName: cell.names.join(", "),
      placeCount: cell.count,
    });
  }

  console.log(`[GMaps-Crowd] ${allPlaces.size} places → ${points.length} grid cells (hour=${currentHour}, factor=${timeFactor})`);
  return points;
}
