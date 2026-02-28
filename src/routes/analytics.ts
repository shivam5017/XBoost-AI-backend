import { Router } from 'express';
import { getActivity, getDashboard, getWeeklyReport } from '../controllers/analytics.controller';
import { authenticate } from '../middleware/auth';

const router = Router();
router.use(authenticate);
router.get('/dashboard', getDashboard);
router.get('/weekly', getWeeklyReport);
router.get('/activity', getActivity);
export default router;
