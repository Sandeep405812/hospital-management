import express from 'express';
import {
  getPatients,
  getPatientById,
  updatePatient,
  getPatientHistoryByUniqueId,
} from '../controllers/patientController.js';
import { protect, authorize } from '../middleware/authMiddleware.js';

const router = express.Router();

router.route('/')
  .get(protect, authorize('admin', 'doctor', 'receptionist'), getPatients);

router.route('/history/:patientId')
  .get(protect, authorize('admin', 'doctor', 'receptionist'), getPatientHistoryByUniqueId);

router.route('/:id')
  .get(protect, getPatientById)
  .put(protect, updatePatient);

export default router;
