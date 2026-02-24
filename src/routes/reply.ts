import { Router } from 'express';
import { getReplies, getReplyStats } from '../controllers/reply.controller';
import { authenticate } from '../middleware/auth';

const router = Router();
router.use(authenticate);
router.get('/', getReplies);
router.get('/stats', getReplyStats);
export default router;
