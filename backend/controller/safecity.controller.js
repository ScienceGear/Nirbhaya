import {
  getSafeCityMapData,
  getSafeCityNear,
  getSafeCityAlongRoute,
  getCategories,
  getIncidentDescriptions,
  getSafetyDescriptions,
  getIncidentDetails,
  getAllSafeCityData,
} from "../library/safecity.library.js";

/* ── Get map data with incidents/clusters/heatmap ── */
export const getMapData = async (req, res) => {
  try {
    const { lat, lng, radiusKm, mapZoom, city } = req.query;

    const result = await getSafeCityMapData({
      centerLat: parseFloat(lat) || 18.5204, // Default Pune
      centerLng: parseFloat(lng) || 73.8567,
      radiusKm: parseFloat(radiusKm) || 12,
      mapZoom: parseInt(mapZoom) || 11,
      city: city || "Pune",
    });

    res.json(result);
  } catch (error) {
    console.error("SafeCity map data error:", error);
    res.status(500).json({ error: "Failed to fetch map data", details: error.message });
  }
};

/* ── Get incident categories ── */
export const getCategoriesHandler = async (req, res) => {
  try {
    const { lang_id } = req.query;
    const categories = await getCategories(parseInt(lang_id) || 1);
    res.json({ categories });
  } catch (error) {
    console.error("SafeCity categories error:", error);
    res.status(500).json({ error: "Failed to fetch categories", details: error.message });
  }
};

/* ── Get incident descriptions ── */
export const getIncidentDescHandler = async (req, res) => {
  try {
    const { client_id, country_id, lang_id } = req.body;
    const descriptions = await getIncidentDescriptions(
      parseInt(client_id) || 1,
      parseInt(country_id) || 101,
      parseInt(lang_id) || 1
    );
    res.json({ descriptions });
  } catch (error) {
    console.error("SafeCity incident descriptions error:", error);
    res.status(500).json({ error: "Failed to fetch descriptions", details: error.message });
  }
};

/* ── Get safety descriptions ── */
export const getSafetyDescHandler = async (req, res) => {
  try {
    const { client_id, country_id, lang_id } = req.body;
    const descriptions = await getSafetyDescriptions(
      parseInt(client_id) || 1,
      parseInt(country_id) || 101,
      parseInt(lang_id) || 1
    );
    res.json({ descriptions });
  } catch (error) {
    console.error("SafeCity safety descriptions error:", error);
    res.status(500).json({ error: "Failed to fetch safety descriptions", details: error.message });
  }
};

/* ── Get specific incident details ── */
export const getIncidentDetailsHandler = async (req, res) => {
  try {
    const { incident_id } = req.body;
    if (!incident_id) {
      return res.status(400).json({ error: "Incident ID is required" });
    }
    const details = await getIncidentDetails(incident_id);
    res.json(details);
  } catch (error) {
    console.error("SafeCity incident details error:", error);
    res.status(500).json({ error: "Failed to fetch incident details", details: error.message });
  }
};

/* ── Get nearby SafeCity incidents (geo query) ── */
export const getNearbyIncidents = async (req, res) => {
  try {
    const { lat, lng, radiusKm, limit, city } = req.query;
    const incidents = await getSafeCityNear({
      lat: parseFloat(lat) || 18.5204,
      lng: parseFloat(lng) || 73.8567,
      radiusKm: parseFloat(radiusKm) || 8,
      limit: parseInt(limit) || 200,
      city: city || "Pune",
    });
    res.json({ incidents });
  } catch (error) {
    console.error("SafeCity near error:", error);
    res.status(500).json({ error: "Failed to fetch nearby incidents", details: error.message });
  }
};

/* ── Get SafeCity incidents along a route ── */
export const getAlongRouteIncidents = async (req, res) => {
  try {
    const { coords, corridorKm, limit, city } = req.body;
    if (!coords?.length) {
      return res.status(400).json({ error: "coords array is required" });
    }
    const incidents = await getSafeCityAlongRoute({
      coords,
      corridorKm: parseFloat(corridorKm) || 1,
      limit: parseInt(limit) || 300,
      city: city || "Pune",
    });
    res.json({ incidents });
  } catch (error) {
    console.error("SafeCity along-route error:", error);
    res.status(500).json({ error: "Failed to fetch route incidents", details: error.message });
  }
};

/* ── Get all SafeCity data combined ── */
export const getAllData = async (req, res) => {
  try {
    const { lat, lng, radiusKm, mapZoom, city, client_id, country_id, lang_id } = req.query;

    const result = await getAllSafeCityData({
      centerLat: parseFloat(lat) || 18.5204,
      centerLng: parseFloat(lng) || 73.8567,
      radiusKm: parseFloat(radiusKm) || 12,
      mapZoom: parseInt(mapZoom) || 11,
      city: city || "Pune",
      clientId: parseInt(client_id) || 1,
      countryId: parseInt(country_id) || 101,
      langId: parseInt(lang_id) || 1,
    });

    res.json(result);
  } catch (error) {
    console.error("SafeCity all data error:", error);
    res.status(500).json({ error: "Failed to fetch SafeCity data", details: error.message });
  }
};
