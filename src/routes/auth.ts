import { Router } from 'express';
import { register, login, getProfile, updateGoal } from '../controllers/auth.controller';
import { authenticate } from '../middleware/auth';

const router = Router();
router.post('/register', register);
router.post('/login', login);
router.get('/profile', authenticate, getProfile);
router.patch('/goal', authenticate, updateGoal);
export default router;
