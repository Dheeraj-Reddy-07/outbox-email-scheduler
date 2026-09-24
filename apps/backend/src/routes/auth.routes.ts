import { Router } from 'express';
import passport from 'passport';
import { getMe, logout } from '../controllers/auth.controller.js';
import { requireAuth } from '../middleware/auth.middleware.js';

const router = Router();

// Initiate Google OAuth
router.get('/google', (req, res, next) => {
  console.log('Google OAuth initiation requested');
  passport.authenticate('google', {
    scope: ['profile', 'email'],
  })(req, res, next);
});

// Google OAuth callback
router.get('/google/callback', (req, res, next) => {
  console.log('Google OAuth callback received');
  console.log('Query params:', req.query);
  
  passport.authenticate('google', (err: any, user: any, info: any) => {
    if (err) {
      console.error('Google OAuth Callback Error:', err);
      return res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:3000'}/login?error=auth_failed`);
    }
    if (!user) {
      console.error('Google OAuth user authentication failed:', info);
      return res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:3000'}/login?error=no_user`);
    }
    console.log('User authenticated successfully, setting up session');
    req.logIn(user, (loginErr) => {
      if (loginErr) {
        console.error('Passport login session error:', loginErr);
        return res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:3000'}/login?error=session_failed`);
      }
      console.log('Session established, redirecting to dashboard');
      return res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:3000'}/dashboard`);
    });
  })(req, res, next);
});

// Get current user
router.get('/me', (req: any, res: any, next: any) => requireAuth(req, res, next), getMe);

// Logout
router.post('/logout', logout);

export default router;
