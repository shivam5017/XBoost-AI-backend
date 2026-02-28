import { Router } from 'express';
import { register, login, getProfile, updateGoal, saveApiKey, removeApiKey,logout } from '../controllers/auth.controller';
import { authenticate } from '../middleware/auth';



const router = Router();

router.post('/register', register);
router.post('/login', login);
router.get('/profile', authenticate, getProfile);
router.patch('/goal', authenticate, updateGoal);
router.post('/api-key', authenticate, saveApiKey);    
router.delete('/api-key', authenticate, removeApiKey); 
router.post("/logout", logout);

export default router;