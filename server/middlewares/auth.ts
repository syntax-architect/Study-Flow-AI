import { Request, Response, NextFunction } from 'express';
import { getAuthSupabase } from '../lib/supabase';

export const requireAuth = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ error: 'Unauthorized: Missing or invalid token' });
      return;
    }

    const token = authHeader.split(' ')[1];
    const supabase = getAuthSupabase(token);
    
    // Verify token with Supabase Auth
    const { data, error } = await supabase.auth.getUser(token);
    
    if (error || !data.user) {
      res.status(401).json({ error: 'Unauthorized: Invalid token' });
      return;
    }

    // Attach user to request
    (req as any).user = data.user;
    
    // Overwrite the req.body.userId with the verified one to prevent spoofing
    if (req.body) {
      req.body.userId = data.user.id;
    }
    
    next();
  } catch (err) {
    console.error('Auth middleware error:', err);
    res.status(500).json({ error: 'Internal Server Error during authentication' });
  }
};
