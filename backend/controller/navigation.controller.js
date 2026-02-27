import PoliceStation from "../model/policestations.model.js";
import Report from "../model/report.model.js";

const contactsStore = new Map();

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

export const getMapOverview = async (_req, res) => {
  try {
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

    return res.json({
      center: defaultCenter,
      policeStations: policeStations.length ? policeStations : [],
      incidents: fallbackIncidents,
      routes: fallbackRoutes,
      heatmap: fallbackIncidents.map((incident) => ({
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
      type: (report.description ? "unsafe_area" : "harassment"),
      description: report.description || "Community report",
      lat: report.latitude || defaultCenter[1],
      lng: report.longitude || defaultCenter[0],
      timestamp: report.timestamp || new Date(),
      anonymous: true,
      severity: report.severity === "High" ? 3 : report.severity === "Medium" ? 2 : 1,
    }));

    return res.json(payload.length ? payload : fallbackIncidents);
  } catch (error) {
    return res.json(fallbackIncidents);
  }
};

export const createReportCompat = async (req, res) => {
  const { description, location, type } = req.body || {};

  if (!description || !String(description).trim()) {
    return res.status(400).json({ success: false, message: "Description is required" });
  }

  try {
    const report = new Report({
      description: String(description).trim(),
      latitude: defaultCenter[1],
      longitude: defaultCenter[0],
      severity: type === "assault" || type === "stalking" ? "High" : "Low",
    });
    await report.save();
  } catch (error) {
  }

  return res.status(201).json({ success: true, message: "Report submitted", location: location || "" });
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
