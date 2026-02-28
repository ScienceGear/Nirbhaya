const SAFECITY_BASE_URL = "https://webapp.safecity.in";

/* ── Simple in-memory cache (TTL: 10 minutes) ── */
let _cache = null;
let _cacheTs = 0;
const CACHE_TTL_MS = 10 * 60 * 1000;

/* ── Additional caches for different data types ── */
let _categoriesCache = null;
let _categoriesCacheTs = 0;
let _incidentDescCache = null;
let _incidentDescCacheTs = 0;
let _safetyDescCache = null;
let _safetyDescCacheTs = 0;
let _incidentDetailsCache = {}; // Per-incident cache

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

  if (!response.ok) {
    throw new Error(`SafeCity request failed: ${response.status}`);
  }

  return response.json();
}

function normalizeIncident(item, index) {
  const lat = toNumber(item?.lat ?? item?.latitude);
  const lng = toNumber(item?.lng ?? item?.longitude);
  if (lat === null || lng === null) return null;

  const severity =
    toNumber(item?.severity) ||
    (toNumber(item?.count) && toNumber(item?.count) > 8 ? 3 : 2);

  // Build comma-separated category string from categories array or string
  let categories = "";
  if (Array.isArray(item?.categories)) {
    categories = item.categories.map((c) => c?.name ?? c?.category_name ?? c).filter(Boolean).join(" | ");
  } else if (typeof item?.categories === "string") {
    categories = item.categories;
  } else if (item?.category) {
    categories = String(item.category);
  } else if (item?.incident_category) {
    categories = String(item.incident_category);
  }

  return {
    id: String(item?.id ?? `sc-incident-${index}`),
    type: "unsafe_area",
    description: String(item?.description || item?.incident_text || "Reported incident"),
    lat,
    lng,
    timestamp: item?.created_at || item?.timestamp || new Date().toISOString(),
    anonymous: true,
    severity: Math.min(3, Math.max(1, Math.round(severity))),
    // Rich fields from SafeCity
    categories,
    location: item?.location || item?.place || item?.city || "",
    dateText: item?.date || item?.incident_date || "",
    timeText: item?.time || item?.incident_time || "",
    age: item?.age || item?.person_age || "",
    gender: item?.gender || item?.person_gender || "",
  };
}

function normalizeCluster(item, index) {
  const lat = toNumber(item?.lat ?? item?.latitude);
  const lng = toNumber(item?.lng ?? item?.longitude);
  if (lat === null || lng === null) return null;

  const count = Math.max(1, Math.round(toNumber(item?.count ?? item?.size) || 1));

  return {
    id: String(item?.id ?? `sc-cluster-${index}`),
    lat,
    lng,
    count,
  };
}

function dedupeByCoordinate(items) {
  const seen = new Set();
-  return items.filter((item) => {
    const key = `${item.lat.toFixed(5)}:${item.lng.toFixed(5)}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export async function getSafeCityMapData({
  centerLat,
  centerLng,
  radiusKm = 12,
  mapZoom = 11,
  city = "Pune",
}) {
  // Return cached data if fresh
  if (_cache && Date.now() - _cacheTs < CACHE_TTL_MS) {
    return _cache;
  }

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

  const [clusterResponse, incidentResponse] = await Promise.allSettled([
    postSafeCity("/api/reported-incidents", params),
    postSafeCity("/api/reported-incidents/map-coordinates", params),
  ]);

  const rawClusters =
    clusterResponse.status === "fulfilled"
      ? Array.isArray(clusterResponse.value?.data)
        ? clusterResponse.value.data
        : []
      : [];

  const rawIncidents =
    incidentResponse.status === "fulfilled"
      ? Array.isArray(incidentResponse.value?.data)
        ? incidentResponse.value.data
        : []
      : [];

  // Geographic filter — only keep points within the requested bounding box
  const inBounds = (lat, lng) =>
    lat >= bounds.sw.lat && lat <= bounds.ne.lat &&
    lng >= bounds.sw.lng && lng <= bounds.ne.lng;

  const clusters = dedupeByCoordinate(
    rawClusters
      .map((item, index) => normalizeCluster(item, index))
      .filter((c) => c !== null && inBounds(c.lat, c.lng))
  );

  const incidents = dedupeByCoordinate(
    rawIncidents
      .map((item, index) => normalizeIncident(item, index))
      .filter((inc) => inc !== null && inBounds(inc.lat, inc.lng))
  );

  const heatmap = [
    ...incidents.map((incident) => ({
      lat: incident.lat,
      lng: incident.lng,
      weight: Math.min(1, Math.max(0.2, incident.severity / 3)),
    })),
    ...clusters.map((cluster) => ({
      lat: cluster.lat,
      lng: cluster.lng,
      weight: Math.min(1, Math.max(0.25, cluster.count / 20)),
    })),
  ];

  const result = {
    incidents,
    clusters,
    heatmap,
  };

  // Cache the result
  _cache = result;
  _cacheTs = Date.now();

  return result;
}

/* ── GET /api/get-categories?lang_id=1 ── */
export async function getCategories(langId = 1) {
  const CATEGORIES_TTL_MS = 60 * 60 * 1000; // 1 hour cache
  
  if (_categoriesCache && Date.now() - _categoriesCacheTs < CATEGORIES_TTL_MS) {
    return _categoriesCache;
  }

  const response = await fetch(`${SAFECITY_BASE_URL}/api/get-categories?lang_id=${langId}`, {
    method: "GET",
    headers: {
      Accept: "*/*",
      "X-Requested-With": "XMLHttpRequest",
      Referer: "https://webapp.safecity.in/",
    },
    credentials: "include",
  });

  if (!response.ok) {
    throw new Error(`SafeCity categories failed: ${response.status}`);
  }

  const data = await response.json();
  
  // Normalize categories
  const categories = Array.isArray(data)
    ? data.map(cat => ({
        id: cat.id ?? cat.category_id ?? cat.value,
        name: cat.name ?? cat.category_name ?? cat.label,
        description: cat.description ?? "",
        icon: cat.icon ?? null,
        color: cat.color ?? null,
      }))
    : [];

  _categoriesCache = categories;
  _categoriesCacheTs = Date.now();

  return categories;
}

/* ── POST /getIncDesc - Incident Descriptions ── */
export async function getIncidentDescriptions(clientId = 1, countryId = 101, langId = 1) {
  const DESC_TTL_MS = 30 * 60 * 1000; // 30 min cache
  
  if (_incidentDescCache && Date.now() - _incidentDescCacheTs < DESC_TTL_MS) {
    return _incidentDescCache;
  }

  const params = { client_id: clientId, country_id: countryId, lang_id: langId };
  const data = await postSafeCity("/getIncDesc", params);

  // Normalize descriptions
  const descriptions = data?.data ?? data ?? [];
  
  _incidentDescCache = descriptions;
  _incidentDescCacheTs = Date.now();

  return descriptions;
}

/* ── POST /getSafetyDesc - Safety Descriptions ── */
export async function getSafetyDescriptions(clientId = 1, countryId = 101, langId = 1) {
  const DESC_TTL_MS = 30 * 60 * 1000; // 30 min cache
  
  if (_safetyDescCache && Date.now() - _safetyDescCacheTs < DESC_TTL_MS) {
    return _safetyDescCache;
  }

  const params = { client_id: clientId, country_id: countryId, lang_id: langId };
  const data = await postSafeCity("/getSafetyDesc", params);

  // Normalize descriptions
  const descriptions = data?.data ?? data ?? [];
  
  _safetyDescCache = descriptions;
  _safetyDescCacheTs = Date.now();

  return descriptions;
}

/* ── POST /api/reported-incident/details - Get Incident Details ── */
export async function getIncidentDetails(incidentId) {
  if (!incidentId) {
    throw new Error("Incident ID is required");
  }

  // Check per-incident cache (5 min TTL)
  const DETAILS_TTL_MS = 5 * 60 * 1000;
  if (_incidentDetailsCache[incidentId] && 
      Date.now() - _incidentDetailsCache[incidentId].ts < DETAILS_TTL_MS) {
    return _incidentDetailsCache[incidentId].data;
  }

  const params = { incident_id: incidentId };
  const data = await postSafeCity("/api/reported-incident/details", params);

  // Normalize incident details
  const details = {
    id: incidentId,
    ...data?.data ?? data,
    // Common fields normalization
    description: data?.data?.description ?? data?.data?.incident_text ?? data?.description ?? "",
    category: data?.data?.category ?? data?.data?.incident_category ?? null,
    lat: toNumber(data?.data?.lat ?? data?.data?.latitude),
    lng: toNumber(data?.data?.lng ?? data?.data?.longitude),
    createdAt: data?.data?.created_at ?? data?.created_at ?? null,
    verified: data?.data?.verified ?? data?.verified ?? false,
    anonymous: data?.data?.anonymous ?? true,
  };

  _incidentDetailsCache[incidentId] = {
    data: details,
    ts: Date.now(),
  };

  return details;
}

/* ── Get all SafeCity data combined ── */
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
