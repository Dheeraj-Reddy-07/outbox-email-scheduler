import { Request, Response } from 'express';
import prisma from '../config/database.js';
import { EmailJobStatus } from '@prisma/client';
import { sendTestEmail } from '../services/email.service.js';

export const sendTestEmailController = async (req: Request, res: Response) => {
  try {
    const { to } = req.body;
    
    if (!to) {
      return res.status(400).json({ error: 'Recipient email is required' });
    }

    const result = await sendTestEmail(to);
    
    res.json({
      success: true,
      message: 'Test email sent successfully',
      previewUrl: result.previewUrl,
      messageId: result.messageId,
    });
  } catch (error) {
    console.error('Error sending test email:', error);
    res.status(500).json({ error: 'Failed to send test email' });
  }
};

export const getScheduledEmailsController = async (req: Request, res: Response) => {
  try {
    const user = req.user as any;
    const userId = user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const emailJobs = await prisma.emailJob.findMany({
      where: {
        status: { in: [EmailJobStatus.PENDING, EmailJobStatus.SCHEDULED] },
        campaign: {
          userId,
        },
      },
      include: {
        campaign: {
          select: {
            subject: true,
          },
        },
      },
      orderBy: { scheduledAt: 'asc' },
    });

    res.json({ emailJobs });
  } catch (error) {
    console.error('Error fetching scheduled emails:', error);
    res.status(500).json({ error: 'Failed to fetch scheduled emails' });
  }
};

export const getSentEmailsController = async (req: Request, res: Response) => {
  try {
    const user = req.user as any;
    const userId = user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const emailJobs = await prisma.emailJob.findMany({
      where: {
        status: EmailJobStatus.SENT,
        campaign: {
          userId,
        },
      },
      include: {
        campaign: {
          select: {
            subject: true,
          },
        },
      },
      orderBy: { sentAt: 'desc' },
    });

    res.json({ emailJobs });
  } catch (error) {
    console.error('Error fetching sent emails:', error);
    res.status(500).json({ error: 'Failed to fetch sent emails' });
  }
};