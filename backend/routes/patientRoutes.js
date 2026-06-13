import express from 'express';
import {
  getPatients,
  getPatientById,
  updatePatient,
} from '../controllers/patientController.js';
import { protect, authorize } from '../middleware/authMiddleware.js';

const router = express.Router();

router.route('/')
  .get(protect, authorize('admin', 'doctor'), getPatients);

router.route('/:id')
  .get(protect, getPatientById)
  .put(protect, updatePatient);

export default router;
