import { Router } from 'express';
import { getStreak, checkAndUpdateStreak } from '../controllers/streak.controller';
import { authenticate } from '../middleware/auth';

const router = Router();
router.use(authenticate);
router.get('/', getStreak);
router.post('/check', checkAndUpdateStreak);
export default router;
