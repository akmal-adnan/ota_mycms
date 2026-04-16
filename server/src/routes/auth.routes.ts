import { Router } from 'express';
import {
  signup,
  login,
  logout,
  me,
  getApiKey,
  regenerateApiKey,
} from '../controllers/auth.controller';
import { authMiddleware } from '../middleware/auth';

const router = Router();

router.post('/signup', signup);
router.post('/login', login);
router.post('/logout', logout);
router.get('/me', authMiddleware, me);
router.get('/api-key', authMiddleware, getApiKey);
router.post('/api-key/regenerate', authMiddleware, regenerateApiKey);

export default router;
