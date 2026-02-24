import { Router } from 'express';
import { getDashboard, getWeeklyReport } from '../controllers/analytics.controller';
import { authenticate } from '../middleware/auth';

const router = Router();
router.use(authenticate);
router.get('/dashboard', getDashboard);
router.get('/weekly', getWeeklyReport);
export default router;
