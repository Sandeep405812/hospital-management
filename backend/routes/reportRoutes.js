import express from 'express';
import {
  upload,
  uploadReport,
  getReports,
  deleteReport,
} from '../controllers/reportController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.post('/upload', protect, upload.single('file'), uploadReport);
router.get('/', protect, getReports);
router.delete('/:id', protect, deleteReport);

export default router;
