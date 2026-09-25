import 'dotenv/config';
import prisma from '../config/database.js';
import { createCampaign } from '../services/campaign.service.js';
import { startWorker } from '../queue/worker.js';

async function runTest() {
  console.log('Starting full functional test...');
  
  // 1. Create a mock user
  const user = await prisma.user.upsert({
    where: { email: 'test@example.com' },
    update: {},
    create: {
      email: 'test@example.com',
      name: 'Test User',
      googleId: 'test-google-id',
    },
  });

  console.log('User ready:', user.id);

  // 2. Schedule campaign
  const campaign = await createCampaign({
    userId: user.id,
    subject: 'Test Campaign ' + Date.now(),
    body: '<p>This is a test</p>',
    startAt: new Date(Date.now() + 2000), // Start in 2 seconds
    delaySeconds: 1, // 1 sec delay between emails
    hourlyLimit: 2, // Limit to 2 per hour
    recipientEmails: ['recipient1@test.com', 'recipient2@test.com', 'recipient3@test.com'], // 3 emails, so 1 should be rate-limited
    senderEmail: 'sender1',
  });

  console.log('Campaign scheduled:', campaign.id);
  
  // 3. Start worker
  const worker = await startWorker(2); // Concurrency 2
  console.log('Worker started');

  // Monitor progress
  let completed = false;
  let checks = 0;
  while (!completed && checks < 20) {
    await new Promise(resolve => setTimeout(resolve, 1000));
    const current = await prisma.campaign.findUnique({
      where: { id: campaign.id },
      include: { emailJobs: true },
    });
    
    if (current) {
      console.log(`Campaign status: ${current.status}`);
      current.emailJobs.forEach(job => {
        console.log(`  Job ${job.recipientEmail}: ${job.status}, Preview: ${job.previewUrl || 'none'}`);
      });
      
      if (current.status === 'COMPLETED' || current.emailJobs.every(j => j.status === 'SENT')) {
        completed = true;
      }
    }
    checks++;
  }

  await worker.close();
  console.log('Test finished');
  process.exit(0);
}

runTest().catch(console.error);
