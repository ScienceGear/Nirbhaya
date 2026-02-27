import express from 'express';
import { getReports,createReport } from '../controller/report.controller.js';
import { protectedRoute } from '../middleware/auth.middleware.js';

const reportRouter = express.Router();

reportRouter.post('/create', protectedRoute,createReport);
reportRouter.get('/myreports', protectedRoute,getReports);

export default reportRouter;