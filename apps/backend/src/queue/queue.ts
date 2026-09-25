import { Queue } from 'bullmq';
import { redis } from '../config/redis.js';

export interface EmailJobData {
  emailJobId: string;
  campaignId: string;
  recipientEmail: string;
  subject: string;
  body: string;
  userId: string;
  hasAttachments?: boolean;
}


export const emailQueue = new Queue<EmailJobData>('email-queue', {
  connection: redis,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000,
    },
    removeOnComplete: {
      count: 1000,
      age: 24 * 3600,
    },
    removeOnFail: {
      count: 5000,
    },
  },
});


let queueInitialized = false;

export async function initializeQueue() {
  if (queueInitialized) return true;

  try {
    await emailQueue.waitUntilReady();
    console.log('BullMQ queue initialized and ready');
    queueInitialized = true;
    return true;
  } catch (error) {
    console.error('Failed to initialize BullMQ queue:', error);
    throw new Error(`Redis queue initialization failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}


export async function getQueueHealth() {
  try {
    const waiting = await emailQueue.getWaitingCount();
    const active = await emailQueue.getActiveCount();
    const completed = await emailQueue.getCompletedCount();
    const failed = await emailQueue.getFailedCount();
    const delayed = await emailQueue.getDelayedCount();

    return {
      status: 'healthy',
      waiting,
      active,
      completed,
      failed,
      delayed,
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}


export async function addEmailJob(data: EmailJobData, options?: { delay?: number }) {
  const job = await emailQueue.add('send-email', data, {
    delay: options?.delay || 0,
    jobId: data.emailJobId,
  });

  return job;
}


export async function addBulkEmailJobs(jobs: Array<{ data: EmailJobData; options?: { delay?: number } }>) {
  const addedJobs = await emailQueue.addBulk(
    jobs.map((job) => ({
      name: 'send-email',
      data: job.data,
      opts: {
        delay: job.options?.delay || 0,
        jobId: job.data.emailJobId,
      },
    }))
  );

  return addedJobs;
}