import express from 'express';
import { getDischargeSummaries } from '../controllers/dischargeSummaryController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.route('/')
  .get(protect, getDischargeSummaries);

export default router;
