import express from 'express';
import { SafePath, searchLocation } from '../controller/tracker.controller.js';
import { showPoliceStations } from '../controller/tracker.controller.js';
const trackerRouter = express.Router();

trackerRouter.post('/search', searchLocation);
trackerRouter.post('/safePath',SafePath );
trackerRouter.get('/policeStations', showPoliceStations);
export default trackerRouter; 