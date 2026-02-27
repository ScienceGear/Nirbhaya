const SAFECITY_BASE_URL = "https://webapp.safecity.in";

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

  return {
    id: String(item?.id ?? `sc-incident-${index}`),
    type: "unsafe_area",
    description: String(item?.description || item?.incident_text || "Reported incident"),
    lat,
    lng,
    timestamp: item?.created_at || item?.timestamp || new Date().toISOString(),
    anonymous: true,
    severity: Math.min(3, Math.max(1, Math.round(severity))),
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
  return items.filter((item) => {
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

  const clusters = dedupeByCoordinate(
    rawClusters
      .map((item, index) => normalizeCluster(item, index))
      .filter(Boolean)
  );

  const incidents = dedupeByCoordinate(
    rawIncidents
      .map((item, index) => normalizeIncident(item, index))
      .filter(Boolean)
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

  return {
    incidents,
    clusters,
    heatmap,
  };
}
