import express from 'express';
import { registerUser, loginUser, getMe, uploadAvatar, forgotPassword, resetPassword, updateProfile } from '../controllers/authController.js';
import { protect } from '../middleware/authMiddleware.js';
import { upload } from '../controllers/reportController.js';

const router = express.Router();

router.post('/register', registerUser);
router.post('/login', loginUser);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);
router.get('/me', protect, getMe);
router.route('/profile')
  .get(protect, getMe)
  .put(protect, updateProfile);
router.post('/avatar', protect, upload.single('file'), uploadAvatar);

export default router;
