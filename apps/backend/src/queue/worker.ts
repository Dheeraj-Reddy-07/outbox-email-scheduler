import { Worker, Job, DelayedError } from 'bullmq';
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
        const hourWindow = Math.floor(Date.now() / (60 * 60 * 1000));
        const rateKey = `rate:${campaignId}:${hourWindow}`;
        
        const count = await redis.incr(rateKey);
        if (count === 1) {
          await redis.expire(rateKey, 3600 * 2); // 2 hours
        }

        if (count > existingJob.campaign.hourlyLimit) {
          // Revert the increment since we're not sending
          await redis.decr(rateKey);
          
          console.log(`Rate limit reached for campaign ${campaignId}. Rescheduling job...`);
          
          // Delay until the start of the next hour window
          const nextHourStartMs = (hourWindow + 1) * 60 * 60 * 1000;
          const delayMs = nextHourStartMs - Date.now();
          
          if (delayMs > 0) {
            // Reschedule job with delay
            await job.moveToDelayed(Date.now() + delayMs, job.token);
            throw new Error('Delayed');
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
              await job.moveToDelayed(Date.now() + additionalDelay, job.token);
              throw new Error('Delayed');
            }
          }
        }

        // Send the email
        const emailResult = await sendEmail({
          to: recipientEmail,
          subject,
          html: body,
          sender: existingJob.campaign.senderEmail || undefined,
        });

        // Update job status to SENT
        await prisma.emailJob.update({
          where: { id: emailJobId },
          data: {
            status: EmailJobStatus.SENT,
            sentAt: new Date(),
            attempts: { increment: 1 },
            lastError: null,
            previewUrl: emailResult.previewUrl || null,
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
        
        if (errorMessage === 'Delayed') {
          console.log(`Job ${emailJobId} delayed`);
          throw new DelayedError();
        }

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


export async function startWorker(concurrencyParam: number = 5) {
  console.log('Starting email worker...');

  const worker = createEmailWorker(concurrencyParam); // Use parameter

  console.log(`Email worker started with concurrency: ${concurrencyParam}`);

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

  return worker;
}