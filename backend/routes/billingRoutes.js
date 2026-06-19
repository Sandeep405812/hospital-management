import express from 'express';
import { getBills, payBill, getBillingAnalytics, updateBillAmount } from '../controllers/billingController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.route('/')
  .get(protect, getBills);

router.route('/analytics')
  .get(protect, getBillingAnalytics);

router.route('/:id/pay')
  .put(protect, payBill);

router.route('/:id/amount')
  .put(protect, updateBillAmount);

export default router;
