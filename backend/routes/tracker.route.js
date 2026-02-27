import express from 'express';
import { SafePath, searchLocation, showPoliceStations } from '../controller/tracker.controller.js';
const trackerRouter = express.Router();

trackerRouter.post('/search', searchLocation);
trackerRouter.post('/safePath',SafePath );
trackerRouter.get('/policeStations', showPoliceStations);
export default trackerRouter; 