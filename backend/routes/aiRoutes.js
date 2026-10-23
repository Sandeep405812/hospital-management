import express from 'express';
import { chatWithAI } from '../controllers/aiController.js';
import { optionalProtect } from '../middleware/authMiddleware.js';

const router = express.Router();

// GET /api/ai/chat - Status check endpoint
router.get('/chat', (req, res) => {
  res.json({
    status: 'online',
    service: 'CareHMS Clinical AI Assistant',
    endpoint: 'POST /api/ai/chat',
    supportedMethods: ['POST'],
    message: 'AI Assistant API is active and ready. Send a POST request with { message } in body.',
  });
});

// POST /api/ai/chat - Hospital AI Assistant (supports logged in users and guests)
router.post('/chat', optionalProtect, chatWithAI);

export default router;
