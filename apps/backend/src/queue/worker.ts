import { Worker, Job } from 'bullmq';
import { redis } from '../config/redis.js';
import { sendEmail } from '../services/email.service.js';
import prisma from '../config/database.js';
import { EmailJobData } from './queue.js';
import { EmailJobStatus } from '@prisma/client';


export const createEmailWorker = (concurrency: number = 5) => {
  const worker = new Worker<EmailJobData>(
    'email-queue',
    async (job: Job<EmailJobData>) => {
      const { emailJobId, campaignId, recipientEmail, subject, body } = job.data;

      console.log(`Processing email job ${emailJobId} for ${recipientEmail}`);

      try {
        // Idempotency check: Get job with campaign for rate limiting info
        const existingJob = await prisma.emailJob.findUnique({
          where: { id: emailJobId },
          include: {
            campaign: true,
          },
        });

        if (!existingJob) {
          throw new Error(`EmailJob ${emailJobId} not found`);
        }

        // Skip if already sent or cancelled (idempotency)
        if (existingJob.status === EmailJobStatus.SENT || existingJob.status === EmailJobStatus.CANCELLED) {
          console.log(`EmailJob ${emailJobId} already ${existingJob.status}, skipping`);
          return { status: 'skipped', message: `Job already ${existingJob.status}` };
        }

        // Rate limiting check based on campaign hourly limit
        const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
        const sentInLastHour = await prisma.emailJob.count({
          where: {
            campaignId,
            status: EmailJobStatus.SENT,
            sentAt: { gte: oneHourAgo },
          },
        });

        if (sentInLastHour >= existingJob.campaign.hourlyLimit) {
          console.log(`Rate limit reached for campaign ${campaignId}. Rescheduling job...`);
          
          // Calculate delay to next hour window
          const oldestSent = await prisma.emailJob.findFirst({
            where: {
              campaignId,
              status: EmailJobStatus.SENT,
              sentAt: { gte: oneHourAgo },
            },
            orderBy: { sentAt: 'asc' },
          });

          if (oldestSent?.sentAt) {
            const delayUntil = new Date(oldestSent.sentAt.getTime() + 60 * 60 * 1000);
            const delayMs = delayUntil.getTime() - Date.now();
            
            if (delayMs > 0) {
              // Reschedule job with delay
              await job.moveToDelayed(Date.now() + delayMs);
              return { status: 'rescheduled', delay: delayMs };
            }
          }
        }

        // Update job status to SCHEDULED if not already
        if (existingJob.status === EmailJobStatus.PENDING) {
          await prisma.emailJob.update({
            where: { id: emailJobId },
            data: {
              status: EmailJobStatus.SCHEDULED,
              scheduledAt: new Date(),
              bullmqJobId: job.id,
            },
          });
        }

        // Transition campaign to RUNNING if it is currently SCHEDULED
        if (existingJob.campaign.status === 'SCHEDULED') {
          await prisma.campaign.updateMany({
            where: { id: campaignId, status: 'SCHEDULED' },
            data: { status: 'RUNNING' },
          });
        }

        // Respect delay between individual emails
        if (existingJob.campaign.delaySeconds > 0) {
          const lastSentJob = await prisma.emailJob.findFirst({
            where: {
              campaignId,
              status: EmailJobStatus.SENT,
            },
            orderBy: { sentAt: 'desc' },
          });

          if (lastSentJob?.sentAt) {
            const timeSinceLastSend = Date.now() - lastSentJob.sentAt.getTime();
            const requiredDelay = existingJob.campaign.delaySeconds * 1000;
            
            if (timeSinceLastSend < requiredDelay) {
              const additionalDelay = requiredDelay - timeSinceLastSend;
              console.log(`Delaying job by ${additionalDelay}ms to respect ${existingJob.campaign.delaySeconds}s delay`);
              await job.moveToDelayed(Date.now() + additionalDelay);
              return { status: 'delayed', delay: additionalDelay };
            }
          }
        }

        // Send the email
        const emailResult = await sendEmail({
          to: recipientEmail,
          subject,
          html: body,
        });

        // Update job status to SENT atomically
        await prisma.emailJob.update({
          where: { id: emailJobId },
          data: {
            status: EmailJobStatus.SENT,
            sentAt: new Date(),
            attempts: { increment: 1 },
            lastError: null, // Clear error on success
          },
        });

        // Check if all jobs are completed
        const pendingJobs = await prisma.emailJob.count({
          where: {
            campaignId,
            status: { in: [EmailJobStatus.PENDING, EmailJobStatus.SCHEDULED] },
          },
        });

        if (pendingJobs === 0) {
          await prisma.campaign.updateMany({
            where: {
              id: campaignId,
              status: { notIn: ['COMPLETED', 'CANCELLED'] },
            },
            data: { status: 'COMPLETED' },
          });
          console.log(`Campaign ${campaignId} completed`);
        }

        console.log(`Email sent successfully to ${recipientEmail}`);
        return { success: true, messageId: emailResult.messageId };

      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error(`Failed to send email to ${recipientEmail}:`, errorMessage);

        // Fetch job for error handling
        const currentJob = await prisma.emailJob.findUnique({
          where: { id: emailJobId },
        });

        if (currentJob) {
          // Check if we've exceeded max attempts
          if (currentJob.attempts >= 3) {
            await prisma.emailJob.update({
              where: { id: emailJobId },
              data: {
                status: EmailJobStatus.FAILED,
                lastError: errorMessage,
              },
            });

            // Check if all jobs are completed (even if failed)
            const pendingJobs = await prisma.emailJob.count({
              where: {
                campaignId,
                status: { in: [EmailJobStatus.PENDING, EmailJobStatus.SCHEDULED] },
              },
            });

            if (pendingJobs === 0) {
              await prisma.campaign.updateMany({
                where: {
                  id: campaignId,
                  status: { notIn: ['COMPLETED', 'CANCELLED'] },
                },
                data: { status: 'COMPLETED' },
              });
              console.log(`Campaign ${campaignId} completed with failures`);
            }

            // Don't retry - mark as permanently failed
            throw new Error(`Max retries exceeded for job ${emailJobId}`);
          }

          // Update with error and increment attempts
          await prisma.emailJob.update({
            where: { id: emailJobId },
            data: {
              status: EmailJobStatus.FAILED,
              attempts: { increment: 1 },
              lastError: errorMessage,
            },
          });
        }

        // Re-throw error to trigger BullMQ retry
        throw error;
      }
    },
    {
      connection: redis,
      concurrency,
      // Remove basic limiter since we're implementing custom rate limiting
    }
  );

  worker.on('completed', (job) => {
    console.log(`Job ${job.id} completed successfully`);
  });

  worker.on('failed', (job, err) => {
    console.error(`Job ${job?.id} failed:`, err.message);
  });

  worker.on('error', (err) => {
    console.error('Worker error:', err);
  });

  return worker;
};


export async function startWorker() {
  console.log('Starting email worker...');

  const worker = createEmailWorker(5); // 5 concurrent jobs

  console.log('Email worker started with concurrency: 5');

  // Graceful shutdown
  process.on('SIGTERM', async () => {
    console.log('SIGTERM received, closing worker...');
    await worker.close();
    process.exit(0);
  });

  process.on('SIGINT', async () => {
    console.log('SIGINT received, closing worker...');
    await worker.close();
    process.exit(0);
  });
}