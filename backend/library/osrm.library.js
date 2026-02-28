/**
 * OSRM (Open Source Routing Machine) client library.
 * Uses the public OSRM demo server by default.
 * For production, host your own: https://github.com/Project-OSRM/osrm-backend
 *
 * API: http://router.project-osrm.org/route/v1/{profile}/{coords}?options
 * Profile: "foot" (walking) | "driving" | "cycling"
 */

const OSRM_BASE = process.env.OSRM_URL || "http://router.project-osrm.org";
const DEFAULT_PROFILE = "foot"; // safest default for women's safety navigation
const REQUEST_TIMEOUT_MS = 8000;

/**
 * Fetch up to `maxAlternatives` routes between two points from OSRM.
 *
 * @param {object} params
 * @param {number} params.startLat
 * @param {number} params.startLng
 * @param {number} params.endLat
 * @param {number} params.endLng
 * @param {string} [params.profile="foot"]
 * @param {number} [params.maxAlternatives=3]
 * @returns {Promise<OsrmRoute[]>}
 */
export async function fetchOsrmRoutes({
  startLat,
  startLng,
  endLat,
  endLng,
  profile = DEFAULT_PROFILE,
  maxAlternatives = 3,
}) {
  const coords = `${startLng},${startLat};${endLng},${endLat}`;
  const url =
    `${OSRM_BASE}/route/v1/${profile}/${coords}` +
    `?alternatives=${maxAlternatives - 1}` + // OSRM alternatives = extra routes beyond 1
    `&geometries=geojson` +
    `&overview=full` +
    `&steps=false` +
    `&annotations=false`;

  let raw;
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timer);

    if (!res.ok) throw new Error(`OSRM HTTP ${res.status}`);
    raw = await res.json();
  } catch (err) {
    throw new Error(`OSRM request failed: ${err.message}`);
  }

  if (raw.code !== "Ok" || !raw.routes?.length) {
    throw new Error(`OSRM returned code=${raw.code}`);
  }

  return raw.routes.map((r, idx) => ({
    id: `osrm-${idx}`,
    distanceM: r.distance,           // metres
    durationS: r.duration,           // seconds
    distanceKm: r.distance / 1000,
    durationMin: Math.round(r.duration / 60),
    /** [[lng, lat], ...] */
    coordinates: r.geometry.coordinates,
  }));
}

/**
 * Build display-friendly duration string.
 * @param {number} minutes
 */
export function formatDuration(minutes) {
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m ? `${h}h ${m}m` : `${h}h`;
}
