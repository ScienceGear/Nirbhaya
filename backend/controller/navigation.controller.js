import PoliceStation from "../model/policestations.model.js";
import Report from "../model/report.model.js";
import { getSafeCityMapData, getSafeCityNear } from "../library/safecity.library.js";
import { findHybridRoutes, invalidateSafetyCache } from "../library/hybrid-router.js";

const contactsStore = new Map();
const userPointsStore = new Map();

const defaultCenter = [73.8567, 18.5204];

const fallbackRoutes = [
  {
    id: "r1",
    name: "Via FC Road & University",
    type: "safest",
    rsi: 92,
    duration: "28 min",
    distance: "8.2 km",
    color: "#22c55e",
    coordinates: [
      [73.8567, 18.5204], [73.8500, 18.5250], [73.8446, 18.5314],
      [73.8413, 18.5350], [73.8380, 18.5400], [73.8350, 18.5450],
    ],
  },
  {
    id: "r2",
    name: "Via JM Road",
    type: "moderate",
    rsi: 74,
    duration: "22 min",
    distance: "6.8 km",
    color: "#f59e0b",
    coordinates: [
      [73.8567, 18.5204], [73.8520, 18.5180], [73.8460, 18.5167],
      [73.8413, 18.5200], [73.8380, 18.5300], [73.8350, 18.5450],
    ],
  },
  {
    id: "r3",
    name: "Via Swargate Direct",
    type: "fastest",
    rsi: 51,
    duration: "16 min",
    distance: "5.1 km",
    color: "#ef4444",
    coordinates: [
      [73.8567, 18.5204], [73.8600, 18.5150], [73.8636, 18.5018],
      [73.8550, 18.5100], [73.8450, 18.5300], [73.8350, 18.5450],
    ],
  },
];

const fallbackIncidents = [
  { id: "i1", type: "unsafe_area", description: "Low visibility near bus stop", lat: 18.5250, lng: 73.8500, timestamp: new Date().toISOString(), anonymous: true, severity: 2 },
  { id: "i2", type: "stalking", description: "Suspicious activity reported", lat: 18.5100, lng: 73.8700, timestamp: new Date().toISOString(), anonymous: true, severity: 3 },
];

const severityScore = {
  Low: 1,
  Medium: 2,
  High: 3,
};

const typeToSeverity = {
  harassment: "Medium",
  stalking: "High",
  assault: "High",
  theft: "Medium",
  unsafe_area: "Low",
};

function toNumber(value, fallback = null) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function haversineKm(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function routeCenter(route) {
  const midpoint = route.coordinates[Math.floor(route.coordinates.length / 2)] || route.coordinates[0];
  return { lat: midpoint[1], lng: midpoint[0] };
}

function buildAreaStats(reports) {
  const stats = new Map();
  reports.forEach((report) => {
    const lat = toNumber(report.latitude, defaultCenter[1]);
    const lng = toNumber(report.longitude, defaultCenter[0]);
    const areaKey = `${lat.toFixed(2)},${lng.toFixed(2)}`;
    const prev = stats.get(areaKey) || {
      areaKey,
      lat,
      lng,
      reports: 0,
      severityTotal: 0,
      ratingTotal: 0,
    };
    prev.reports += 1;
    prev.severityTotal += severityScore[report.severity] || 1;
    prev.ratingTotal += Math.min(5, Math.max(1, toNumber(report.areaRating, 3)));
    stats.set(areaKey, prev);
  });

  return Array.from(stats.values()).map((item) => ({
    areaKey: item.areaKey,
    lat: item.lat,
    lng: item.lng,
    reports: item.reports,
    avgSeverity: item.severityTotal / item.reports,
    avgRating: item.ratingTotal / item.reports,
    rsiPenalty: Math.min(
      30,
      Math.round(item.reports * 1.8 + item.severityTotal * 0.8 + Math.max(0, 3 - item.ratingTotal / item.reports) * 5)
    ),
  }));
}

function applyAreaPenaltyToRoutes(routes, areaStats) {
  return routes.map((route) => {
    const center = routeCenter(route);
    let penalty = 0;
    areaStats.forEach((area) => {
      const dist = haversineKm(center.lat, center.lng, area.lat, area.lng);
      if (dist <= 2.5) {
        penalty += area.rsiPenalty * (1 - dist / 3);
      }
    });

    const adjustedRsi = Math.max(20, Math.round(route.rsi - Math.min(35, penalty)));
    const reasons = Array.isArray(route.reasons) ? [...route.reasons] : [];
    if (penalty >= 5) {
      reasons.push("Community reports in this area reduced the RSI");
    }

    return {
      ...route,
      rsi: adjustedRsi,
      reasons,
    };
  });
}

function getTimeCrowdFactor(hour) {
  if ((hour >= 8 && hour <= 11) || (hour >= 17 && hour <= 21)) return 1.25;
  if (hour >= 22 || hour <= 5) return 0.55;
  if (hour >= 12 && hour <= 16) return 0.95;
  return 0.8;
}

export const getMapOverview = async (_req, res) => {
  try {
    // Accept user location from query params, fallback to default center (Pune)
    const userLat = parseFloat(_req.query.lat) || defaultCenter[1];
    const userLng = parseFloat(_req.query.lng) || defaultCenter[0];
    const radiusKm = parseFloat(_req.query.radiusKm) || 10;

    const recentReports = await Report.find({}).sort({ timestamp: -1 }).limit(300);
    const areaStats = buildAreaStats(recentReports);

    const stations = await PoliceStation.find({}).limit(20);

    const policeStations = stations.map((station, index) => ({
      id: `ps-${index + 1}`,
      name: station.policeStationName || "Police Station",
      address: station.address || "",
      phone: "100",
      lat: station.latitude,
      lng: station.longitude,
      jurisdiction: station.cityName || "Pune",
      distance: "Nearby",
    }));

    // Fetch SafeCity incidents near the USER, not hardcoded center
    let safeCityIncidents = [];
    let safeCityHeatmap = [];
    try {
      safeCityIncidents = await getSafeCityNear({
        lat: userLat,
        lng: userLng,
        radiusKm,
        limit: 300,
        city: "Pune",
      });
      safeCityHeatmap = safeCityIncidents.map((inc) => ({
        lat: inc.lat,
        lng: inc.lng,
        weight: Math.min(1, Math.max(0.2, inc.severity / 3)),
      }));
      console.log(`[SafeCity] Loaded ${safeCityIncidents.length} incidents near [${userLat}, ${userLng}]`);
    } catch (error) {
      console.error("[SafeCity] Error:", error.message || error);
    }

    const localIncidents = recentReports.slice(0, 120).map((report) => ({
      id: String(report._id),
      type: report.incidentType || "unsafe_area",
      description: report.description || "Community report",
      lat: toNumber(report.latitude, defaultCenter[1]),
      lng: toNumber(report.longitude, defaultCenter[0]),
      timestamp: report.timestamp || new Date().toISOString(),
      anonymous: report.anonymous !== false,
      severity: severityScore[report.severity] || 1,
      areaRating: Math.min(5, Math.max(1, toNumber(report.areaRating, 3))),
      imageUrl: report.imageUrl || "",
      locationText: report.locationText || "",
    }));

    const incidents = safeCityIncidents.length
      ? [...localIncidents, ...safeCityIncidents]
      : localIncidents.length ? localIncidents : fallbackIncidents;

    const mergedIncidents = incidents;
    const adjustedRoutes = applyAreaPenaltyToRoutes(fallbackRoutes, areaStats);

    return res.json({
      center: [userLng, userLat],
      policeStations: policeStations.length ? policeStations : [],
      incidents: mergedIncidents,
      clusters: [],
      routes: adjustedRoutes,
      areaStats,
      heatmap: safeCityHeatmap.length
        ? safeCityHeatmap
        : mergedIncidents.map((incident) => ({
            lat: incident.lat,
            lng: incident.lng,
            weight: incident.severity / 3,
          })),
    });
  } catch (error) {
    return res.json({
      center: defaultCenter,
      policeStations: [],
      incidents: fallbackIncidents,
      clusters: [],
      routes: fallbackRoutes,
      heatmap: fallbackIncidents.map((incident) => ({
        lat: incident.lat,
        lng: incident.lng,
        weight: incident.severity / 3,
      })),
    });
  }
};

export const getReportsCompat = async (_req, res) => {
  try {
    const reports = await Report.find({}).sort({ timestamp: -1 }).limit(50);
    const payload = reports.map((report) => ({
      id: String(report._id),
      type: report.incidentType || "unsafe_area",
      description: report.description || "Community report",
      lat: report.latitude || defaultCenter[1],
      lng: report.longitude || defaultCenter[0],
      timestamp: report.timestamp || new Date(),
      anonymous: report.anonymous !== false,
      severity: report.severity === "High" ? 3 : report.severity === "Medium" ? 2 : 1,
      areaRating: Math.min(5, Math.max(1, toNumber(report.areaRating, 3))),
      imageUrl: report.imageUrl || "",
      locationText: report.locationText || "",
      pointsAwarded: toNumber(report.pointsAwarded, 0),
    }));

    return res.json(payload.length ? payload : fallbackIncidents);
  } catch (error) {
    return res.json(fallbackIncidents);
  }
};

export const createReportCompat = async (req, res) => {
  const {
    description,
    location,
    type,
    anonymous,
    lat,
    lng,
    areaRating,
    imageUrl,
    reporterId,
  } = req.body || {};

  if (!description || !String(description).trim()) {
    return res.status(400).json({ success: false, message: "Description is required" });
  }

  const latitude = toNumber(lat, defaultCenter[1]);
  const longitude = toNumber(lng, defaultCenter[0]);
  const cleanRating = Math.min(5, Math.max(1, Math.round(toNumber(areaRating, 3))));
  const severity = typeToSeverity[type] || "Low";
  const reporterKey = String(reporterId || "guest").trim() || "guest";
  const pointsAwarded = 5 + cleanRating;

  try {
    const report = new Report({
      description: String(description).trim(),
      latitude,
      longitude,
      severity,
      incidentType: type || "unsafe_area",
      locationText: String(location || ""),
      anonymous: anonymous !== false,
      areaRating: cleanRating,
      imageUrl: typeof imageUrl === "string" ? imageUrl : "",
      pointsAwarded,
      reporterKey,
    });
    await report.save();
    invalidateSafetyCache(); // new data → force safety cache refresh
    const totalPoints = (userPointsStore.get(reporterKey) || 0) + pointsAwarded;
    userPointsStore.set(reporterKey, totalPoints);

    return res.status(201).json({
      success: true,
      message: "Report submitted",
      location: location || "",
      pointsAwarded,
      totalPoints,
      areaRating: cleanRating,
    });
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message || "Unable to submit report" });
  }
};

export const getUserPointsCompat = (req, res) => {
  const userId = String(req.query.userId || "guest").trim() || "guest";
  const totalPoints = userPointsStore.get(userId) || 0;
  return res.json({ userId, totalPoints });
};

export const getCrowdHeatmapCompat = async (req, res) => {
  const centerLat = toNumber(req.query.lat, defaultCenter[1]);
  const centerLng = toNumber(req.query.lng, defaultCenter[0]);
  const radiusKm = Math.min(20, Math.max(2, toNumber(req.query.radiusKm, 8)));
  const hour = Math.min(23, Math.max(0, Math.round(toNumber(req.query.hour, new Date().getHours()))));

  try {
    const safeCity = await getSafeCityMapData({
      centerLat,
      centerLng,
      radiusKm,
      mapZoom: 11,
      city: "Pune",
    });

    const localReports = await Report.find({}).sort({ timestamp: -1 }).limit(400);
    const areaStats = buildAreaStats(localReports);
    const factor = getTimeCrowdFactor(hour);

    const crowdPoints = [];

    // From SafeCity clusters
    safeCity.clusters.forEach((cluster) => {
      const base = Math.min(100, 25 + cluster.count * 7);
      crowdPoints.push({
        id: `cluster-${cluster.id}`,
        lat: cluster.lat,
        lng: cluster.lng,
        busyPct: Math.min(100, Math.round(base * factor)),
        weight: Math.min(1, Math.max(0.2, (base * factor) / 100)),
        source: "cluster",
      });
    });

    // From SafeCity individual incidents (generate crowd from incident density)
    // Group nearby incidents into synthetic crowd points
    const incidentGrid = new Map();
    safeCity.incidents.forEach((inc) => {
      const key = `${inc.lat.toFixed(2)},${inc.lng.toFixed(2)}`;
      incidentGrid.set(key, (incidentGrid.get(key) || 0) + 1);
    });
    let incIdx = 0;
    incidentGrid.forEach((count, key) => {
      const [latStr, lngStr] = key.split(",");
      const lat = parseFloat(latStr);
      const lng = parseFloat(lngStr);
      const base = Math.min(100, Math.round(15 + count * 4));
      crowdPoints.push({
        id: `sc-inc-${incIdx++}`,
        lat,
        lng,
        busyPct: Math.min(100, Math.round(base * factor)),
        weight: Math.min(1, Math.max(0.15, (base * factor) / 100)),
        source: "safecity-incidents",
      });
    });

    // From local community reports
    areaStats.forEach((area, index) => {
      const base = Math.min(100, Math.round(area.reports * 6 + area.avgSeverity * 12));
      crowdPoints.push({
        id: `reports-${index}`,
        lat: area.lat,
        lng: area.lng,
        busyPct: Math.min(100, Math.round(base * factor)),
        weight: Math.min(1, Math.max(0.2, (base * factor) / 100)),
        source: "reports",
      });
    });

    const deduped = [];
    const seen = new Set();
    crowdPoints.forEach((point) => {
      const key = `${point.lat.toFixed(4)}:${point.lng.toFixed(4)}`;
      if (seen.has(key)) return;
      seen.add(key);
      deduped.push(point);
    });

    return res.json({
      center: [centerLng, centerLat],
      hour,
      points: deduped,
      summary: {
        totalPoints: deduped.length,
        averageBusyPct: deduped.length
          ? Math.round(deduped.reduce((sum, item) => sum + item.busyPct, 0) / deduped.length)
          : 0,
      },
    });
  } catch (error) {
    console.error("[CrowdHeatmap] Error:", error.message || error);
    return res.json({ center: [centerLng, centerLat], hour, points: [], summary: { totalPoints: 0, averageBusyPct: 0 } });
  }
};

export const getContactsCompat = (req, res) => {
  const userId = String(req.query.userId || "demo");
  const contacts = contactsStore.get(userId) || [];
  return res.json(contacts);
};

export const saveContactsCompat = (req, res) => {
  const userId = String(req.body?.userId || "demo");
  const contacts = Array.isArray(req.body?.contacts) ? req.body.contacts : [];
  contactsStore.set(userId, contacts);
  return res.json({ success: true });
};

export const triggerSosCompat = (req, res) => {
  const type = String(req.body?.type || "SOS");
  return res.json({ success: true, message: `${type} alert sent` });
};

/**
 * GET /api/navigation/route
 * Query params: startLat, startLng, endLat, endLng, [profile], [hexPath]
 */
export const getRoute = async (req, res) => {
  const startLat = toNumber(req.query.startLat);
  const startLng = toNumber(req.query.startLng);
  const endLat   = toNumber(req.query.endLat);
  const endLng   = toNumber(req.query.endLng);

  if (!startLat || !startLng || !endLat || !endLng) {
    return res.status(400).json({
      success: false,
      message: "Required query params: startLat, startLng, endLat, endLng",
    });
  }

  const profile      = ["foot", "driving", "cycling"].includes(req.query.profile)
    ? req.query.profile
    : "foot";
  const includeHexPath = req.query.hexPath === "true";

  try {
    const result = await findHybridRoutes({
      startLat, startLng, endLat, endLng,
      profile,
      resolution: 9,
      includeHexPath,
    });

    return res.json({
      success: true,
      ...result,
    });
  } catch (error) {
    console.error("[getRoute] Error:", error.message);
    return res.status(500).json({ success: false, message: error.message });
  }
};

/** POST /api/navigation/safety-cache/invalidate */
export const invalidateCache = (_req, res) => {
  invalidateSafetyCache();
  return res.json({ success: true, message: "Safety cache cleared" });
};
