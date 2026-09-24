import { Request, Response } from 'express';
import {
  createCampaign,
  getCampaignsByUserId,
  getCampaignById,
  cancelCampaign,
} from '../services/campaign.service.js';
import { CampaignStatus } from '@prisma/client';

export async function createCampaignController(req: Request, res: Response) {
  try {
    const user = req.user as any;
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { subject, body, startAt, delaySeconds, hourlyLimit, recipientEmails } = req.body;

    // Validate required fields
    if (!subject || !body || !startAt || delaySeconds === undefined || hourlyLimit === undefined || !recipientEmails) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Validate startAt is a valid date
    const startDate = new Date(startAt);
    if (isNaN(startDate.getTime())) {
      return res.status(400).json({ error: 'Invalid startAt date' });
    }

    // Validate recipientEmails is an array
    if (!Array.isArray(recipientEmails)) {
      return res.status(400).json({ error: 'recipientEmails must be an array' });
    }

    const campaign = await createCampaign({
      userId: user.id,
      subject,
      body,
      startAt: startDate,
      delaySeconds: parseInt(delaySeconds),
      hourlyLimit: parseInt(hourlyLimit),
      recipientEmails,
    });

    res.status(201).json({
      message: 'Campaign created successfully',
      campaign: {
        id: campaign.id,
        subject: campaign.subject,
        body: campaign.body,
        startAt: campaign.startAt,
        delaySeconds: campaign.delaySeconds,
        hourlyLimit: campaign.hourlyLimit,
        status: campaign.status,
        recipientCount: campaign.emailJobs.length,
        createdAt: campaign.createdAt,
      },
    });
  } catch (error) {
    console.error('Create campaign error:', error);
    res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to create campaign' });
  }
}

export async function getCampaignsController(req: Request, res: Response) {
  try {
    const user = req.user as any;
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const campaigns = await getCampaignsByUserId(user.id);

    res.json({
      campaigns: campaigns.map(campaign => ({
        id: campaign.id,
        subject: campaign.subject,
        body: campaign.body,
        startAt: campaign.startAt,
        delaySeconds: campaign.delaySeconds,
        hourlyLimit: campaign.hourlyLimit,
        status: campaign.status,
        recipientCount: campaign.emailJobs.length,
        sentCount: campaign.emailJobs.filter(job => job.status === 'SENT').length,
        failedCount: campaign.emailJobs.filter(job => job.status === 'FAILED').length,
        createdAt: campaign.createdAt,
        updatedAt: campaign.updatedAt,
      })),
    });
  } catch (error) {
    console.error('Get campaigns error:', error);
    res.status(500).json({ error: 'Failed to retrieve campaigns' });
  }
}

export async function getCampaignByIdController(req: Request, res: Response) {
  try {
    const user = req.user as any;
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { id } = req.params;
    const campaign = await getCampaignById(id, user.id);

    if (!campaign) {
      return res.status(404).json({ error: 'Campaign not found' });
    }

    res.json({
      campaign: {
        id: campaign.id,
        subject: campaign.subject,
        body: campaign.body,
        startAt: campaign.startAt,
        delaySeconds: campaign.delaySeconds,
        hourlyLimit: campaign.hourlyLimit,
        status: campaign.status,
        emailJobs: campaign.emailJobs.map(job => ({
          id: job.id,
          recipientEmail: job.recipientEmail,
          status: job.status,
          scheduledAt: job.scheduledAt,
          sentAt: job.sentAt,
          attempts: job.attempts,
          lastError: job.lastError,
        })),
        createdAt: campaign.createdAt,
        updatedAt: campaign.updatedAt,
      },
    });
  } catch (error) {
    console.error('Get campaign by ID error:', error);
    res.status(500).json({ error: 'Failed to retrieve campaign' });
  }
}

export async function cancelCampaignController(req: Request, res: Response) {
  try {
    const user = req.user as any;
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { id } = req.params;
    await cancelCampaign(id, user.id);

    res.json({ message: 'Campaign cancelled successfully' });
  } catch (error) {
    console.error('Cancel campaign error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to cancel campaign';
    
    if (errorMessage.includes('not found')) {
      return res.status(404).json({ error: errorMessage });
    }
    if (errorMessage.includes('Cannot cancel')) {
      return res.status(400).json({ error: errorMessage });
    }
    
    res.status(500).json({ error: errorMessage });
  }
}

