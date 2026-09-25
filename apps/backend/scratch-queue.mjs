import { PrismaClient } from '@prisma/client';
import { addEmailJob } from './src/queue/queue.js';
const prisma = new PrismaClient();
async function test() {
  const job = await prisma.emailJob.create({
    data: {
      campaignId: 'cmugqa4qs0001ypfb9123bpm0',
      recipientEmail: 'test@example.com',
      status: 'PENDING'
    }
  });
  await addEmailJob({
    emailJobId: job.id,
    campaignId: 'cmugqa4qs0001ypfb9123bpm0',
    recipientEmail: 'test@example.com',
    subject: 'Test Subject',
    body: 'Test Body',
    userId: 'cmuehm4aw00003j85appocksu',
    hasAttachments: true
  });
  console.log('Job added');
}
test();
