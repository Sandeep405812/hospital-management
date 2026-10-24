import express from 'express';
import {
  createDoctor,
  getDoctors,
  getDoctorById,
  updateDoctor,
  deleteDoctor,
  updateDoctorQueue,
} from '../controllers/doctorController.js';
import { protect, authorize } from '../middleware/authMiddleware.js';

const router = express.Router();

router
  .route('/')
  .post(protect, authorize('superadmin', 'admin', 'admin_doctors'), createDoctor)
  .get(getDoctors);

router.route('/:id/queue').put(protect, updateDoctorQueue);

router
  .route('/:id')
  .get(getDoctorById)
  .put(protect, authorize('superadmin', 'admin', 'admin_doctors', 'doctor'), updateDoctor)
  .delete(protect, authorize('superadmin', 'admin', 'admin_doctors'), deleteDoctor);

export default router;
