import express from 'express';
import {
  createAppointment,
  getAppointments,
  updateAppointmentStatus,
  getAppointmentAnalytics,
} from '../controllers/appointmentController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router
  .route('/')
  .post(protect, createAppointment)
  .get(protect, getAppointments);

router.route('/analytics').get(protect, getAppointmentAnalytics);

router.route('/:id/status').put(protect, updateAppointmentStatus);

export default router;
