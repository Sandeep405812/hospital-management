import express from 'express';
import { addMetric, getMetrics } from '../controllers/metricController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.route('/')
  .post(protect, addMetric)
  .get(protect, getMetrics);

export default router;
