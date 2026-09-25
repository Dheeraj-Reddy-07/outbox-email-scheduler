import { Worker, Job, DelayedError } from 'bullmq';
import { redis } from '../config/redis.js';
import { sendEmail } from '../services/email.service.js';
import prisma from '../config/database.js';
import { EmailJobData, emailQueue } from './queue.js';
import { EmailJobStatus } from '@prisma/client';
import { storageService } from '../config/storage.js';


export const createEmailWorker = (concurrency: number = 5) => {
  console.log(`Creating worker with concurrency ${concurrency}`);
  
  const worker = new Worker<EmailJobData>(
    'email-queue',
    async (job: Job<EmailJobData>) => {
      const { emailJobId, campaignId, recipientEmail, subject, body } = job.data;

      console.log(`Processing email job ${emailJobId} for ${recipientEmail}`);

      try {
        const existingJob = await prisma.emailJob.findUnique({
          where: { id: emailJobId },
          include: {
            campaign: {
              include: {
                attachments: true,
              },
            },
          },
        });

        if (!existingJob) {
          throw new Error(`EmailJob ${emailJobId} not found`);
        }

        if (existingJob.status === EmailJobStatus.SENT || existingJob.status === EmailJobStatus.CANCELLED) {
          console.log(`EmailJob ${emailJobId} already ${existingJob.status}, skipping`);
          return { status: 'skipped', message: `Job already ${existingJob.status}` };
        }

        const hourWindow = Math.floor(Date.now() / (60 * 60 * 1000));
        const rateKey = `rate:${campaignId}:${hourWindow}`;
        
        const count = await redis.incr(rateKey);
        if (count === 1) {
          await redis.expire(rateKey, 3600 * 2);
        }

        if (count > existingJob.campaign.hourlyLimit) {
          await redis.decr(rateKey);
          
          console.log(`Rate limit reached for campaign ${campaignId}. Rescheduling job...`);
          
          const nextHourStartMs = (hourWindow + 1) * 60 * 60 * 1000;
          const delayMs = nextHourStartMs - Date.now();
          
          if (delayMs > 0) {
            await job.moveToDelayed(Date.now() + delayMs, job.token);
            throw new Error('Delayed');
          }
        }

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

        if (existingJob.campaign.status === 'SCHEDULED') {
          await prisma.campaign.updateMany({
            where: { id: campaignId, status: 'SCHEDULED' },
            data: { status: 'RUNNING' },
          });
        }

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

        let attachments: Array<{ filename: string; content: Buffer; contentType?: string }> = [];
        if (existingJob.campaign.attachments && existingJob.campaign.attachments.length > 0) {
          console.log(`Loading ${existingJob.campaign.attachments.length} attachments for campaign ${campaignId}`);
          
          for (const attachment of existingJob.campaign.attachments) {
            try {
              const fileBuffer = await storageService.getFile(attachment.storedFilename);
              attachments.push({
                filename: attachment.originalFilename,
                content: fileBuffer,
                contentType: attachment.mimeType,
              });
            } catch (error) {
              console.error(`Failed to load attachment ${attachment.storedFilename}:`, error);
            }
          }
        }

        const emailResult = await sendEmail({
          to: recipientEmail,
          subject,
          html: body,
          sender: existingJob.campaign.senderEmail || undefined,
          attachments: attachments.length > 0 ? attachments : undefined,
        });

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

        const currentJob = await prisma.emailJob.findUnique({
          where: { id: emailJobId },
        });

        if (currentJob) {
          if (currentJob.attempts >= 3) {
            await prisma.emailJob.update({
              where: { id: emailJobId },
              data: {
                status: EmailJobStatus.FAILED,
                lastError: errorMessage,
              },
            });

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

            throw new Error(`Max retries exceeded for job ${emailJobId}`);
          }

          await prisma.emailJob.update({
            where: { id: emailJobId },
            data: {
              status: EmailJobStatus.FAILED,
              attempts: { increment: 1 },
              lastError: errorMessage,
            },
          });
        }

        throw error;
      }
    },
    {
      connection: redis,
      concurrency,
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


  // Check for delayed jobs on startup and promote past-due ones
  setTimeout(async () => {
    try {
      const delayedCount = await emailQueue.getDelayedCount();
      if (delayedCount > 0) {
        console.log(`Found ${delayedCount} delayed jobs, attempting to promote...`);
        const promoted = await emailQueue.promoteJobs();
        console.log(`Promoted ${promoted} jobs`);
      }
    } catch (error) {
      console.error('Error promoting delayed jobs:', error);
    }
  }, 5000);

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