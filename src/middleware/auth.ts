import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export interface AuthRequest extends Request {
  userId?: string;
}

export const authenticate = (req: AuthRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: 'Unauthorized' });

  try {
    const token = authHeader.split(' ')[1];
    const payload: any = jwt.verify(token, process.env.JWT_SECRET!);
    req.userId = payload.id;
    next();
  } catch (err) {
    res.status(401).json({ error: 'Invalid token' });
  }
};