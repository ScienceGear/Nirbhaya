import express from 'express';
import { getReports, createReport, getUserPoints, getAllReports } from '../controller/report.controller.js';
import { protectedRoute, optionalAuth } from '../middleware/auth.middleware.js';

const reportRouter = express.Router();

reportRouter.post('/create', optionalAuth, createReport);
reportRouter.get('/myreports', protectedRoute, getReports);
reportRouter.get('/points', optionalAuth, getUserPoints);
reportRouter.get('/all', getAllReports);

export default reportRouter;