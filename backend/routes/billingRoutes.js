import express from 'express';
import { getBills, payBill } from '../controllers/billingController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.route('/')
  .get(protect, getBills);

router.route('/:id/pay')
  .put(protect, payBill);

export default router;
