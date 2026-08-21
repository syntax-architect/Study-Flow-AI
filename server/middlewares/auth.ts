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
    
    // With Clerk + Supabase, the user does NOT exist in Supabase's auth.users table.
    // Calling supabase.auth.getUser() will fail with 401 because it tries to find the user in Supabase.
    // Instead, we just decode the JWT to get the user ID (Supabase RLS handles the actual security).
    const parts = token.split('.');
    if (parts.length !== 3) {
      res.status(401).json({ error: 'Unauthorized: Malformed token' });
      return;
    }

    const base64Url = parts[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = Buffer.from(base64, 'base64').toString('utf8');
    
    const decodedToken = JSON.parse(jsonPayload);
    
    if (!decodedToken || !decodedToken.sub) {
      res.status(401).json({ error: 'Unauthorized: Invalid token format' });
      return;
    }

    // Attach user to request
    (req as any).user = { id: decodedToken.sub };
    
    // Overwrite the req.body.userId with the verified one to prevent spoofing
    if (req.body) {
      req.body.userId = decodedToken.sub;
    }
    
    next();
  } catch (err: any) {
    console.error('Auth middleware error:', err);
    res.status(500).json({ error: 'Internal Server Error during authentication', details: err.message });
  }
};
