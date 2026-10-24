import express from 'express';
import {
  getBeds,
  createBed,
  admitPatient,
  dischargePatient,
  updateBedStatus,
  deleteBed,
} from '../controllers/bedController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.route('/')
  .get(protect, getBeds)
  .post(protect, createBed);

router.route('/admit')
  .put(protect, admitPatient);

router.route('/:id/discharge')
  .put(protect, dischargePatient);

router.route('/:id/status')
  .put(protect, updateBedStatus);

router.route('/:id')
  .delete(protect, deleteBed);

export default router;
