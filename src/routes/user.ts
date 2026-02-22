import express from 'express';
import db from '../lib/db';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = express.Router();

// GET /api/user/me
router.get('/me', authenticate, async (req: AuthRequest, res) => {
  try {
    if (!req.userId) return res.status(401).json({ error: 'Unauthorized' });

    const user = await db.user.findUnique({ where: { id: req.userId } });
    if (!user) return res.status(404).json({ error: 'User not found' });

    res.json({
      user: {
        id: user.id,
        email: user.email ?? null,
        username: user.username,
        name: user.name,
        avatar: user.avatar,
        createdAt: user.createdAt,
      },
    });
  } catch (err) {
    console.error('Fetch user error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;