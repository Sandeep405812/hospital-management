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
  .post(protect, authorize('admin'), createDoctor)
  .get(getDoctors);

router.route('/:id/queue').put(protect, updateDoctorQueue);

router
  .route('/:id')
  .get(getDoctorById)
  .put(protect, updateDoctor)
  .delete(protect, authorize('admin'), deleteDoctor);

export default router;
