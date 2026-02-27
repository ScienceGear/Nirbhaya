import { Router } from "express";
import {
  createReportCompat,
  getContactsCompat,
  getMapOverview,
  getReportsCompat,
  saveContactsCompat,
  triggerSosCompat,
} from "../controller/navigation.controller.js";

const navigationRouter = Router();

navigationRouter.get("/map/overview", getMapOverview);
navigationRouter.get("/reports", getReportsCompat);
navigationRouter.post("/reports", createReportCompat);
navigationRouter.get("/contacts", getContactsCompat);
navigationRouter.put("/contacts", saveContactsCompat);
navigationRouter.post("/sos", triggerSosCompat);

export default navigationRouter;
