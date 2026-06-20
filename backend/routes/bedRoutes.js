import express from 'express';
import { getBeds, createBed, admitPatient, dischargePatient } from '../controllers/bedController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.route('/')
  .get(protect, getBeds)
  .post(protect, createBed);

router.route('/admit')
  .put(protect, admitPatient);

router.route('/:id/discharge')
  .put(protect, dischargePatient);

export default router;
