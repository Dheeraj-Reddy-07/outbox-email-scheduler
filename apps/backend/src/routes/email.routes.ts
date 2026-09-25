import { Router } from 'express';
import { sendTestEmailController, getScheduledEmailsController, getSentEmailsController } from '../controllers/email.controller.js';
import { requireAuth } from '../middleware/auth.middleware.js';

const router = Router();

router.post('/test', requireAuth, sendTestEmailController);
router.get('/scheduled', requireAuth, getScheduledEmailsController);
router.get('/sent', requireAuth, getSentEmailsController);

export default router;