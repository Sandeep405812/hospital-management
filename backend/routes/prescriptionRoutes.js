import express from 'express';
import {
  createPrescription,
  getPrescriptions,
  getPrescriptionById,
} from '../controllers/prescriptionController.js';
import { protect, authorize } from '../middleware/authMiddleware.js';

const router = express.Router();

router
  .route('/')
  .post(protect, authorize('doctor'), createPrescription)
  .get(protect, getPrescriptions);

router.route('/:id').get(protect, getPrescriptionById);

export default router;
