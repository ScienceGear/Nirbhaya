import SafeCityIncident from "../model/safecityIncident.model.js";

const SAFECITY_BASE_URL = "https://webapp.safecity.in";

/* ── Scrape cooldown: don't re-scrape same area within 30 min ── */
const _scrapedAreas = new Map(); // key → timestamp
const SCRAPE_COOLDOWN_MS = 30 * 60 * 1000;

/* ── In-memory caches for rarely-changing data ── */
let _categoriesCache = null;
let _categoriesCacheTs = 0;
let _incidentDescCache = null;
let _incidentDescCacheTs = 0;
let _safetyDescCache = null;
let _safetyDescCacheTs = 0;

/* ═══════════════════════════════════════════════════════════════
   HELPERS
   ═══════════════════════════════════════════════════════════════ */

function toNumber(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function createBoundsFromCenter(lat, lng, radiusKm) {
  const latDelta = radiusKm / 111;
  const lngDelta = radiusKm / (111 * Math.cos((lat * Math.PI) / 180));
  return {
    ne: { lat: lat + latDelta, lng: lng + lngDelta },
    sw: { lat: lat - latDelta, lng: lng - lngDelta },
    nw: { lat: lat + latDelta, lng: lng - lngDelta },
    se: { lat: lat - latDelta, lng: lng + lngDelta },
  };
}

function toFormBody(params) {
  return new URLSearchParams(
    Object.entries(params).reduce((acc, [key, value]) => {
      acc[key] = String(value);
      return acc;
    }, {})
  );
}

async function postSafeCity(path, params) {
  const response = await fetch(`${SAFECITY_BASE_URL}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
      Accept: "*/*",
      "X-Requested-With": "XMLHttpRequest",
      Referer: "https://webapp.safecity.in/",
    },
    body: toFormBody(params),
  });
  if (!response.ok) throw new Error(`SafeCity ${path} failed: ${response.status}`);
  return response.json();
}

/* ── Area key for cooldown map (rounded to ~1 km grid) ── */
function areaKey(lat, lng, radiusKm) {
  return `${lat.toFixed(2)}:${lng.toFixed(2)}:${radiusKm}`;
}

/* ═══════════════════════════════════════════════════════════════
   SCRAPE  →  MONGO  CACHING
   ═══════════════════════════════════════════════════════════════ */

/** Parse one raw SafeCity item into fields matching our Mongoose schema. */
function parseSafeCityItem(item) {
  const lat = toNumber(item?.lat ?? item?.latitude);
  const lng = toNumber(item?.lng ?? item?.longitude);
  if (lat === null || lng === null) return null;

  const severity =
    toNumber(item?.severity) ||
    (toNumber(item?.count) && toNumber(item?.count) > 8 ? 3 : 2);

  let categories = "";
  if (Array.isArray(item?.categories)) {
    categories = item.categories
      .map((c) => c?.name ?? c?.category_name ?? c)
      .filter(Boolean)
      .join(" | ");
  } else if (typeof item?.categories === "string") {
    categories = item.categories;
  } else if (item?.category) {
    categories = String(item.category);
  } else if (item?.incident_category) {
    categories = String(item.incident_category);
  }

  const scId = String(item?.id ?? item?._id ?? `sc-${lat.toFixed(5)}-${lng.toFixed(5)}`);

  return {
    scId,
    categories,
    description: String(item?.description || item?.incident_text || ""),
    location: { type: "Point", coordinates: [lng, lat] },
    locationText: item?.location || item?.place || item?.city || "",
    dateText: item?.date || item?.incident_date || "",
    timeText: item?.time || item?.incident_time || "",
    age: String(item?.age || item?.person_age || ""),
    gender: String(item?.gender || item?.person_gender || ""),
    severity: Math.min(3, Math.max(1, Math.round(severity))),
    timestamp: item?.created_at || item?.timestamp || new Date().toISOString(),
    raw: item,
  };
}

/**
 * Scrape SafeCity for an area and upsert results into MongoDB.
 * Skips if the same area was scraped within SCRAPE_COOLDOWN_MS.
 */
async function scrapeAndCache({ centerLat, centerLng, radiusKm = 8, mapZoom = 13, city = "Pune" }) {
  const key = areaKey(centerLat, centerLng, radiusKm);
  const lastScrape = _scrapedAreas.get(key);
  if (lastScrape && Date.now() - lastScrape < SCRAPE_COOLDOWN_MS) return;

  const bounds = createBoundsFromCenter(centerLat, centerLng, radiusKm);
  const params = {
    lang_id: 1,
    client_id: 1,
    city,
    map_zoom: mapZoom,
    "map_bound[ne][lat]": bounds.ne.lat,
    "map_bound[ne][lng]": bounds.ne.lng,
    "map_bound[sw][lat]": bounds.sw.lat,
    "map_bound[sw][lng]": bounds.sw.lng,
    "map_bound[nw][lat]": bounds.nw.lat,
    "map_bound[nw][lng]": bounds.nw.lng,
    "map_bound[se][lat]": bounds.se.lat,
    "map_bound[se][lng]": bounds.se.lng,
  };

  let rawIncidents = [];
  try {
    const resp = await postSafeCity("/api/reported-incidents/map-coordinates", params);
    rawIncidents = Array.isArray(resp?.data) ? resp.data : [];
  } catch (err) {
    console.error("[SafeCity] Scrape error:", err.message);
  }

  if (!rawIncidents.length) {
    _scrapedAreas.set(key, Date.now());
    return;
  }

  const ops = rawIncidents
    .map(parseSafeCityItem)
    .filter(Boolean)
    .map((doc) => {
      // Only set coordinates / severity / timestamp unconditionally.
      // Put enrichable fields (categories, description, etc.) in $setOnInsert
      // so a fresh scrape never overwrites already-enriched data.
      const { categories, description, locationText, dateText, timeText, age, gender, raw, ...core } = doc;
      const enrichable = { categories, description, locationText, dateText, timeText, age, gender, raw };
      return {
        updateOne: {
          filter: { scId: doc.scId },
          update: {
            $set: { ...core, scrapedAt: new Date() },
            $setOnInsert: enrichable,
          },
          upsert: true,
        },
      };
    });

  if (ops.length) {
    try {
      await SafeCityIncident.bulkWrite(ops, { ordered: false });
      console.log(`[SafeCity] Cached ${ops.length} incidents for area ${key}`);
    } catch (err) {
      console.error("[SafeCity] DB upsert error:", err.message);
    }
  }

  _scrapedAreas.set(key, Date.now());

  // Fire-and-forget: enrich unenriched incidents in background
  enrichUnenrichedIncidents().catch(() => {});
}

/* ═══════════════════════════════════════════════════════════════
   BACKGROUND ENRICHMENT — fetch full details for bare records
   ═══════════════════════════════════════════════════════════════ */

let _enriching = false;
const ENRICH_BATCH = 15; // fetch details for this many per round
const ENRICH_DELAY_MS = 400; // ms between API calls to avoid rate-limiting

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

/**
 * Find incidents that have no categories/description (bare coordinate-only
 * records) and fetch their full details from the SafeCity API, then update
 * the MongoDB record so future reads have the rich data.
 */
async function enrichUnenrichedIncidents() {
  if (_enriching) return; // only one round at a time
  _enriching = true;
  try {
    const bare = await SafeCityIncident.find({
      $or: [
        { categories: "" },
        { categories: { $exists: false } },
      ],
      description: "",
    })
      .sort({ scrapedAt: -1 })
      .limit(ENRICH_BATCH)
      .lean();

    if (!bare.length) return;
    console.log(`[SafeCity] Enriching ${bare.length} bare incidents…`);

    let enriched = 0;
    for (const doc of bare) {
      try {
        const data = await postSafeCity("/api/reported-incident/details", { incident_id: doc.scId });
        const raw = data?.data ?? data ?? {};
        const updates = parseDetailResponse(raw);

        await SafeCityIncident.updateOne({ _id: doc._id }, {
          $set: { ...updates, raw },
        });
        enriched++;
      } catch {
        /* skip failed detail fetches */
      }
      await sleep(ENRICH_DELAY_MS);
    }
    if (enriched) console.log(`[SafeCity] Enriched ${enriched}/${bare.length} incidents`);
  } finally {
    _enriching = false;
  }
}

/* ═══════════════════════════════════════════════════════════════
   PARSE DETAIL RESPONSE  (shared by enrichment + getIncidentDetails)
   ═══════════════════════════════════════════════════════════════ */

/** Map raw SafeCity /reported-incident/details response to our DB fields. */
function parseDetailResponse(raw) {
  // Categories can be a pipe-separated string like "Stalking | Online Harassment"
  let categories = "";
  if (typeof raw?.categories === "string" && raw.categories.trim()) {
    categories = raw.categories.trim();
  } else if (Array.isArray(raw?.categories)) {
    categories = raw.categories.map((c) => c?.name ?? c?.category_name ?? c).filter(Boolean).join(" | ");
  } else if (raw?.category) {
    categories = String(raw.category);
  }

  // Build location text from area + city
  const locParts = [raw?.area, raw?.city, raw?.state].filter(Boolean);
  const locationText = locParts.join(", ") || raw?.location || raw?.place || "";

  // Build date text from incident_date
  let dateText = "";
  if (raw?.incident_date) {
    try {
      const d = new Date(raw.incident_date);
      if (!isNaN(d.getTime())) {
        dateText = d.toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" });
      } else {
        dateText = raw.incident_date;
      }
    } catch {
      dateText = raw.incident_date;
    }
  } else if (raw?.date) {
    dateText = raw.date;
  }

  // Build time text from time_from / time_to
  let timeText = "";
  const tfrom = raw?.time_from ?? raw?.answers?.primary?.time_from?.answer ?? "";
  const tto   = raw?.time_to   ?? raw?.answers?.primary?.time_to?.answer   ?? "";
  if (tfrom && tto) {
    timeText = `${tfrom} - ${tto}`;
  } else if (tfrom) {
    timeText = tfrom;
  } else if (raw?.time) {
    timeText = raw.time;
  }

  return {
    categories,
    description: String(raw?.description ?? raw?.incident_text ?? ""),
    locationText,
    dateText,
    timeText,
    age: String(raw?.age ?? raw?.person_age ?? ""),
    gender: String(raw?.gender ?? ""),
  };
}

/* ═══════════════════════════════════════════════════════════════
   DB DOCUMENT  →  API RESPONSE FORMAT
   ═══════════════════════════════════════════════════════════════ */

function docToIncident(doc) {
  const [lng, lat] = doc.location?.coordinates ?? [0, 0];
  return {
    id: doc.scId,
    type: "safecity",
    description: doc.description || "",
    lat,
    lng,
    timestamp: doc.timestamp?.toISOString?.() ?? doc.timestamp ?? "",
    anonymous: true,
    severity: doc.severity || 2,
    categories: doc.categories || "",
    location: doc.locationText || "",
    dateText: doc.dateText || "",
    timeText: doc.timeText || "",
    age: doc.age || "",
    gender: doc.gender || "",
  };
}

/* ═══════════════════════════════════════════════════════════════
   PUBLIC API — called by controllers
   ═══════════════════════════════════════════════════════════════ */

/**
 * Get SafeCity incidents near a point.
 * Fires background scrape if area hasn't been scraped recently,
 * then returns whatever is in MongoDB.
 */
export async function getSafeCityNear({
  lat,
  lng,
  radiusKm = 8,
  limit = 200,
  mapZoom = 13,
  city = "Pune",
}) {
  // Fire-and-forget scrape (does not block the response)
  scrapeAndCache({ centerLat: lat, centerLng: lng, radiusKm, mapZoom, city }).catch(() => {});

  // Also fire-and-forget enrichment on every query (idempotent, skips if already running)
  enrichUnenrichedIncidents().catch(() => {});

  const docs = await SafeCityIncident.find({
    location: {
      $near: {
        $geometry: { type: "Point", coordinates: [lng, lat] },
        $maxDistance: radiusKm * 1000, // metres
      },
    },
  })
    .limit(limit)
    .lean();

  return docs.map(docToIncident);
}

/**
 * Get SafeCity incidents along a polyline route.
 * @param {Array<[number,number]>} coords  Array of [lng, lat] pairs
 * @param {number} corridorKm  Search width around the route (default 1 km)
 */
export async function getSafeCityAlongRoute({
  coords,
  corridorKm = 1,
  limit = 300,
  city = "Pune",
}) {
  if (!coords?.length) return [];

  // Sample ≤20 points along the route for scraping
  const step = Math.max(1, Math.floor(coords.length / 20));
  const samples = [];
  for (let i = 0; i < coords.length; i += step) samples.push(coords[i]);
  if (coords.length > 1) samples.push(coords[coords.length - 1]);

  // Trigger scrapes along the route (fire-and-forget)
  for (const [sLng, sLat] of samples) {
    scrapeAndCache({ centerLat: sLat, centerLng: sLng, radiusKm: corridorKm + 1, mapZoom: 14, city }).catch(() => {});
  }

  // Query near each sampled point, dedupe
  const seenIds = new Set();
  const results = [];

  for (const [sLng, sLat] of samples) {
    const docs = await SafeCityIncident.find({
      location: {
        $near: {
          $geometry: { type: "Point", coordinates: [sLng, sLat] },
          $maxDistance: corridorKm * 1000,
        },
      },
    })
      .limit(50)
      .lean();

    for (const doc of docs) {
      if (!seenIds.has(doc.scId)) {
        seenIds.add(doc.scId);
        results.push(docToIncident(doc));
      }
    }
    if (results.length >= limit) break;
  }

  return results.slice(0, limit);
}

/**
 * Full map-data endpoint — backwards-compatible drop-in.
 * Scrape → cache → serve from MongoDB.
 */
export async function getSafeCityMapData({
  centerLat,
  centerLng,
  radiusKm = 12,
  mapZoom = 11,
  city = "Pune",
}) {
  const incidents = await getSafeCityNear({
    lat: centerLat,
    lng: centerLng,
    radiusKm,
    limit: 500,
    mapZoom,
    city,
  });

  const heatmap = incidents.map((inc) => ({
    lat: inc.lat,
    lng: inc.lng,
    weight: Math.min(1, Math.max(0.2, inc.severity / 3)),
  }));

  return { incidents, clusters: [], heatmap };
}

/**
 * Incident details — check MongoDB first, then fall back to SafeCity API.
 * If fetched from the API the result is also persisted into MongoDB.
 */
export async function getIncidentDetails(incidentId) {
  if (!incidentId) throw new Error("Incident ID is required");

  // 1. Try the local DB — but only use it if it has enriched data
  const doc = await SafeCityIncident.findOne({ scId: String(incidentId) }).lean();
  const isBare = !doc?.categories && !doc?.description;

  if (doc && !isBare) {
    // Enriched record — return from DB
    const inc = docToIncident(doc);
    return {
      ...inc,
      category: doc.categories,
      createdAt: doc.timestamp,
      verified: false,
      raw: doc.raw || {},
    };
  }

  // 2. No record or bare record — fetch from SafeCity API
  try {
    const data = await postSafeCity("/api/reported-incident/details", { incident_id: incidentId });
    const raw = data?.data ?? data ?? {};
    const updates = parseDetailResponse(raw);
    const lat = toNumber(raw.latitude ?? raw.lat);
    const lng = toNumber(raw.longitude ?? raw.lng);

    // Persist / update the MongoDB record
    if (lat !== null && lng !== null) {
      SafeCityIncident.updateOne(
        { scId: String(incidentId) },
        {
          $set: {
            ...updates,
            location: { type: "Point", coordinates: [lng, lat] },
            raw,
            scrapedAt: new Date(),
          },
        },
        { upsert: true }
      ).catch(() => {});
    }

    return {
      id: String(incidentId),
      description: updates.description,
      category: updates.categories,
      categories: updates.categories,
      lat: lat ?? doc?.location?.coordinates?.[1] ?? 0,
      lng: lng ?? doc?.location?.coordinates?.[0] ?? 0,
      location: updates.locationText,
      dateText: updates.dateText,
      timeText: updates.timeText,
      age: updates.age,
      gender: updates.gender,
      createdAt: raw.created_on ?? raw.created_at ?? null,
      verified: false,
      anonymous: true,
      raw,
    };
  } catch (err) {
    // If API fails but we have a bare DB record, return that
    if (doc) {
      const inc = docToIncident(doc);
      return { ...inc, category: "", createdAt: doc.timestamp, verified: false, raw: doc.raw || {} };
    }
    throw err;
  }
}

/* ── Categories (in-memory, rarely change) ── */
export async function getCategories(langId = 1) {
  const TTL = 60 * 60 * 1000;
  if (_categoriesCache && Date.now() - _categoriesCacheTs < TTL) return _categoriesCache;

  const response = await fetch(`${SAFECITY_BASE_URL}/api/get-categories?lang_id=${langId}`, {
    headers: { Accept: "*/*", "X-Requested-With": "XMLHttpRequest", Referer: SAFECITY_BASE_URL + "/" },
  });
  if (!response.ok) throw new Error(`Categories failed: ${response.status}`);
  const data = await response.json();

  const categories = Array.isArray(data)
    ? data.map((c) => ({
        id: c.id ?? c.category_id ?? c.value,
        name: c.name ?? c.category_name ?? c.label,
        description: c.description ?? "",
      }))
    : [];

  _categoriesCache = categories;
  _categoriesCacheTs = Date.now();
  return categories;
}

/* ── Incident Descriptions ── */
export async function getIncidentDescriptions(clientId = 1, countryId = 101, langId = 1) {
  const TTL = 30 * 60 * 1000;
  if (_incidentDescCache && Date.now() - _incidentDescCacheTs < TTL) return _incidentDescCache;
  const data = await postSafeCity("/getIncDesc", { client_id: clientId, country_id: countryId, lang_id: langId });
  _incidentDescCache = data?.data ?? data ?? [];
  _incidentDescCacheTs = Date.now();
  return _incidentDescCache;
}

/* ── Safety Descriptions ── */
export async function getSafetyDescriptions(clientId = 1, countryId = 101, langId = 1) {
  const TTL = 30 * 60 * 1000;
  if (_safetyDescCache && Date.now() - _safetyDescCacheTs < TTL) return _safetyDescCache;
  const data = await postSafeCity("/getSafetyDesc", { client_id: clientId, country_id: countryId, lang_id: langId });
  _safetyDescCache = data?.data ?? data ?? [];
  _safetyDescCacheTs = Date.now();
  return _safetyDescCache;
}

/* ── All SafeCity data combined ── */
export async function getAllSafeCityData(params) {
  const [mapData, categories, incidentDesc, safetyDesc] = await Promise.allSettled([
    getSafeCityMapData(params),
    getCategories(params?.langId ?? 1),
    getIncidentDescriptions(params?.clientId ?? 1, params?.countryId ?? 101, params?.langId ?? 1),
    getSafetyDescriptions(params?.clientId ?? 1, params?.countryId ?? 101, params?.langId ?? 1),
  ]);
  return {
    mapData: mapData.status === "fulfilled" ? mapData.value : { incidents: [], clusters: [], heatmap: [] },
    categories: categories.status === "fulfilled" ? categories.value : [],
    incidentDescriptions: incidentDesc.status === "fulfilled" ? incidentDesc.value : [],
    safetyDescriptions: safetyDesc.status === "fulfilled" ? safetyDesc.value : [],
  };
}
