import express from 'express';
import { getSurgeries, createSurgery, updateSurgeryStatus } from '../controllers/surgeryController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.route('/')
  .get(protect, getSurgeries)
  .post(protect, createSurgery);

router.route('/:id/status')
  .put(protect, updateSurgeryStatus);

export default router;
