import express from "express";
import { getHospitalsNear, getAllHospitals } from "../controller/hospital.controller.js";

const hospitalRouter = express.Router();

hospitalRouter.get("/near", getHospitalsNear);
hospitalRouter.get("/all", getAllHospitals);

export default hospitalRouter;
