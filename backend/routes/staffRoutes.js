import express from 'express';
import {
  getAllStaff,
  createStaffMember,
  updateStaffMember,
  deleteStaffMember,
} from '../controllers/staffController.js';
import { protect, authorize } from '../middleware/authMiddleware.js';

const router = express.Router();

router
  .route('/')
  .get(protect, authorize('superadmin', 'admin', 'admin_staff'), getAllStaff)
  .post(protect, authorize('superadmin', 'admin', 'admin_staff'), createStaffMember);

router
  .route('/:id')
  .put(protect, authorize('superadmin', 'admin', 'admin_staff'), updateStaffMember)
  .delete(protect, authorize('superadmin', 'admin'), deleteStaffMember);

export default router;
