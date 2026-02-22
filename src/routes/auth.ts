import express from 'express';
import db from '../lib/db';
import jwt from 'jsonwebtoken';
import { hashPassword, comparePassword } from '../utils/hash';

const router = express.Router();

// Signup
router.post('/signup', async (req, res) => {
  const { email, password, username, name } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email and password required' });

  try {
    const hashed = await hashPassword(password);

    const user = await db.user.create({
      data: {
        email,
        password: hashed,
        username: username || email.split('@')[0],
        name: name || username || email.split('@')[0],
      },
    });

    const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET!, { expiresIn: '7d' });
    res.json({ token });
  } catch (err: any) {
    console.error('Signup error:', err);
    res.status(400).json({ error: err.message || 'User already exists' });
  }
});

// Login
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email and password required' });

  try {
    const user = await db.user.findUnique({ where: { email } });
    if (!user || !user.password) return res.status(400).json({ error: 'Invalid credentials' });

    const valid = await comparePassword(password, user.password);
    if (!valid) return res.status(400).json({ error: 'Invalid credentials' });

    const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET!, { expiresIn: '7d' });
    res.json({ token });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;