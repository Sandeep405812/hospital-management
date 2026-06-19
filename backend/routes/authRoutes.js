import express from 'express';
import { registerUser, loginUser, getMe, uploadAvatar } from '../controllers/authController.js';
import { protect } from '../middleware/authMiddleware.js';
import { upload } from '../controllers/reportController.js';

const router = express.Router();

router.post('/register', registerUser);
router.post('/login', loginUser);
router.get('/me', protect, getMe);
router.post('/avatar', protect, upload.single('file'), uploadAvatar);

export default router;
