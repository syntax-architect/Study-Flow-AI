import { Request, Response, NextFunction } from 'express';
import { getAuthSupabase } from '../lib/supabase';
import { verifyToken } from '@clerk/backend';

export const requireAuth = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ error: 'Unauthorized: Missing or invalid token' });
      return;
    }

    const token = authHeader.split(' ')[1];
    
    let decodedToken;
    try {
      // Securely verify the token cryptographic signature using Clerk
      decodedToken = await verifyToken(token, {
        secretKey: process.env.CLERK_SECRET_KEY,
      });
    } catch (verifyError) {
      console.warn('Token verification failed:', verifyError);
      res.status(401).json({ error: 'Unauthorized: Invalid token signature' });
      return;
    }

    if (!decodedToken || !decodedToken.sub) {
      res.status(401).json({ error: 'Unauthorized: Invalid token format' });
      return;
    }

    // Attach user to request securely
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

export const requireTeacher = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = (req as any).user?.id;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized: User not authenticated' });
      return;
    }

    const tokenHeader = req.headers.authorization?.split(' ')[1];
    const client = getAuthSupabase(tokenHeader);

    const { data: userData, error } = await client
      .from('users')
      .select('role')
      .eq('id', userId)
      .single();

    if (error || !userData) {
      console.warn('Could not fetch user role for', userId, error?.message);
      res.status(403).json({ error: 'Forbidden: Teacher access required' });
      return;
    }

    const role = userData.role;
    if (role !== 'teacher' && role !== 'mentor') {
      res.status(403).json({ error: 'Forbidden: Teacher access required' });
      return;
    }

    next();
  } catch (err: any) {
    console.error('requireTeacher middleware error:', err);
    res.status(500).json({ error: 'Internal Server Error during authorization', details: err.message });
  }
};
