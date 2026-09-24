// BullMQ queue exports
import * as queue from './queue.js';

export const {
  emailQueue,
  getQueueHealth,
  addEmailJob,
  addBulkEmailJobs,
  initializeQueue,
} = queue;

// Re-export types
export type { EmailJobData } from './queue';