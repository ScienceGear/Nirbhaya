import express from "express";
import {
  getMapData,
  getCategoriesHandler,
  getIncidentDescHandler,
  getSafetyDescHandler,
  getIncidentDetailsHandler,
  getAllData,
} from "../controller/safecity.controller.js";

const safecityRouter = express.Router();

/* ── Map data endpoints ── */
// GET /api/safecity/map?lat=18.52&lng=73.85&radiusKm=12&mapZoom=11&city=Pune
safecityRouter.get("/map", getMapData);

// GET /api/safecity/all?lat=18.52&lng=73.85&radiusKm=12&mapZoom=11&city=Pune&client_id=1&country_id=101&lang_id=1
safecityRouter.get("/all", getAllData);

/* ── Category endpoints ── */
// GET /api/safecity/categories?lang_id=1
safecityRouter.get("/categories", getCategoriesHandler);

/* ── Description endpoints (POST) ── */
// POST /api/safecity/incident-descriptions
safecityRouter.post("/incident-descriptions", getIncidentDescHandler);

// POST /api/safecity/safety-descriptions
safecityRouter.post("/safety-descriptions", getSafetyDescHandler);

/* ── Incident details endpoint (POST) ── */
// POST /api/safecity/incident-details
safecityRouter.post("/incident-details", getIncidentDetailsHandler);

export default safecityRouter;
