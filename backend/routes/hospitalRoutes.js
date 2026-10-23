import express from 'express';
import { getHospitals, createHospital } from '../controllers/hospitalController.js';
import { protect, authorize } from '../middleware/authMiddleware.js';

const router = express.Router();

router.route('/')
  .get(getHospitals)
  .post(protect, authorize('admin'), createHospital);

export default router;
