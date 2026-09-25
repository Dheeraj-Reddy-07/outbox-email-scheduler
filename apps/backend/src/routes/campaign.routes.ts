import { Router } from 'express';
import {
  createCampaignController,
  getCampaignsController,
  getCampaignByIdController,
  cancelCampaignController,
  toggleCampaignStarredController,
  deleteCampaignController,
} from '../controllers/campaign.controller.js';
import { requireAuth } from '../middleware/auth.middleware.js';

const router = Router();

router.post('/', requireAuth, createCampaignController);
router.get('/', requireAuth, getCampaignsController);
router.get('/:id', requireAuth, getCampaignByIdController);
router.post('/:id/cancel', requireAuth, cancelCampaignController);
router.patch('/:id/star', requireAuth, toggleCampaignStarredController);
router.delete('/:id', requireAuth, deleteCampaignController);

export default router;