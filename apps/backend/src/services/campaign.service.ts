import prisma from '../config/database.js';
import { CampaignStatus, EmailJobStatus } from '@prisma/client';
import { addBulkEmailJobs } from '../queue/index.js';

export interface CreateCampaignData {
  userId: string;
  subject: string;
  body: string;
  startAt: Date;
  delaySeconds: number;
  hourlyLimit: number;
  recipientEmails: string[];
}

export interface CampaignWithJobs {
  id: string;
  userId: string;
  subject: string;
  body: string;
  startAt: Date;
  delaySeconds: number;
  hourlyLimit: number;
  status: CampaignStatus;
  createdAt: Date;
  updatedAt: Date;
  emailJobs: Array<{
    id: string;
    recipientEmail: string;
    status: EmailJobStatus;
    scheduledAt: Date | null;
    sentAt: Date | null;
    attempts: number;
    lastError: string | null;
  }>;
}

export async function createCampaign(data: CreateCampaignData): Promise<CampaignWithJobs> {
  const { userId, subject, body, startAt, delaySeconds, hourlyLimit, recipientEmails } = data;

  // Validate input
  if (!subject || !body) {
    throw new Error('Subject and body are required');
  }
  if (!recipientEmails || recipientEmails.length === 0) {
    throw new Error('At least one recipient email is required');
  }
  if (delaySeconds < 0) {
    throw new Error('Delay seconds must be non-negative');
  }
  if (hourlyLimit <= 0) {
    throw new Error('Hourly limit must be positive');
  }

  // Remove duplicate emails and validate format
  const uniqueEmails = [...new Set(recipientEmails)];
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const validEmails = uniqueEmails.filter(email => emailRegex.test(email));

  if (validEmails.length === 0) {
    throw new Error('No valid email addresses provided');
  }

  // Create campaign with email jobs in a transaction
  const campaign = await prisma.$transaction(async (tx) => {
    // Create campaign
    const newCampaign = await tx.campaign.create({
      data: {
        userId,
        subject,
        body,
        startAt,
        delaySeconds,
        hourlyLimit,
        status: CampaignStatus.SCHEDULED,
      },
    });

    // Create email jobs for each recipient
    const emailJobs = await tx.emailJob.createMany({
      data: validEmails.map(email => ({
        campaignId: newCampaign.id,
        recipientEmail: email,
        status: EmailJobStatus.PENDING,
      })),
    });

    // Fetch the complete campaign with jobs
    const campaignWithJobs = await tx.campaign.findUnique({
      where: { id: newCampaign.id },
      include: {
        emailJobs: true,
      },
    });

    return campaignWithJobs;
  });

  if (!campaign) {
    throw new Error('Failed to create campaign');
  }

  // Update campaign status to SCHEDULED
  await prisma.campaign.update({
    where: { id: campaign.id },
    data: { status: CampaignStatus.SCHEDULED },
  });

  // Add jobs to BullMQ queue with calculated delays
  const queueJobs = campaign.emailJobs.map((job, index) => {
    // Calculate delay: startAt + (index * delaySeconds)
    const startTime = startAt.getTime();
    const currentTime = Date.now();
    const baseDelay = Math.max(0, startTime - currentTime);
    const staggeredDelay = baseDelay + (index * delaySeconds * 1000);

    return {
      data: {
        emailJobId: job.id,
        campaignId: campaign.id,
        recipientEmail: job.recipientEmail,
        subject: campaign.subject,
        body: campaign.body,
        userId: campaign.userId,
      },
      options: {
        delay: staggeredDelay,
      },
    };
  });

  await addBulkEmailJobs(queueJobs);

  return campaign as CampaignWithJobs;
}

export async function getCampaignsByUserId(userId: string): Promise<CampaignWithJobs[]> {
  const campaigns = await prisma.campaign.findMany({
    where: { userId },
    include: {
      emailJobs: true,
    },
    orderBy: { createdAt: 'desc' },
  });

  return campaigns as CampaignWithJobs[];
}

export async function getCampaignById(campaignId: string, userId: string): Promise<CampaignWithJobs | null> {
  const campaign = await prisma.campaign.findFirst({
    where: {
      id: campaignId,
      userId,
    },
    include: {
      emailJobs: true,
    },
  });

  return campaign as CampaignWithJobs | null;
}

export async function updateCampaignStatus(
  campaignId: string,
  status: CampaignStatus
): Promise<void> {
  await prisma.campaign.update({
    where: { id: campaignId },
    data: { status },
  });
}

export async function cancelCampaign(campaignId: string, userId: string): Promise<void> {
  const campaign = await prisma.campaign.findFirst({
    where: {
      id: campaignId,
      userId,
    },
  });

  if (!campaign) {
    throw new Error('Campaign not found');
  }

  if (campaign.status === CampaignStatus.COMPLETED || campaign.status === CampaignStatus.CANCELLED) {
    throw new Error('Cannot cancel completed or already cancelled campaign');
  }

  await prisma.$transaction([
    // Update campaign status
    prisma.campaign.update({
      where: { id: campaignId },
      data: { status: CampaignStatus.CANCELLED },
    }),
    // Cancel all pending email jobs
    prisma.emailJob.updateMany({
      where: {
        campaignId,
        status: { in: [EmailJobStatus.PENDING, EmailJobStatus.SCHEDULED] },
      },
      data: { status: EmailJobStatus.CANCELLED },
    }),
  ]);
}

