import { Router } from 'express';
import { sendTestEmailController, getScheduledEmailsController, getSentEmailsController } from '../controllers/email.controller.js';
import { requireAuth } from '../middleware/auth.middleware.js';

const router = Router();

// Send test email (protected route)
router.post('/test', requireAuth, sendTestEmailController);

// Get scheduled emails (protected route)
router.get('/scheduled', requireAuth, getScheduledEmailsController);

// Get sent emails (protected route)
router.get('/sent', requireAuth, getSentEmailsController);

export default router;