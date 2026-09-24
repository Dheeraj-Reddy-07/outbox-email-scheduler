import { Router } from 'express';
import {
  createCampaignController,
  getCampaignsController,
  getCampaignByIdController,
  cancelCampaignController,
} from '../controllers/campaign.controller.js';
import { requireAuth } from '../middleware/auth.middleware.js';

const router = Router();

// Create a new campaign
router.post('/', requireAuth, createCampaignController);

// Get all campaigns for the authenticated user
router.get('/', requireAuth, getCampaignsController);

// Get a specific campaign by ID
router.get('/:id', requireAuth, getCampaignByIdController);

// Cancel a campaign
router.post('/:id/cancel', requireAuth, cancelCampaignController);

export default router;