import dotenv from 'dotenv';
import prisma from '../config/database.js';
import { sendEmail } from '../services/email.service.js';
import { EmailJobStatus } from '@prisma/client';

dotenv.config();

async function testWorkerSimulation() {
  try {
    console.log('Testing worker simulation with enhanced features...\n');

    // Get pending email jobs
    const pendingJobs = await prisma.emailJob.findMany({
      where: {
        status: EmailJobStatus.PENDING,
      },
      include: {
        campaign: true,
      },
      take: 10,
    });

    if (pendingJobs.length === 0) {
      console.log('No pending jobs found. Creating a test campaign first...');
      return;
    }

    console.log(`Found ${pendingJobs.length} pending jobs to process\n`);

    for (const job of pendingJobs) {
      console.log(`\nProcessing job ${job.id} for ${job.recipientEmail}`);
      
      // Phase 9: Idempotency check
      const existingJob = await prisma.emailJob.findUnique({
        where: { id: job.id },
      });

      if (!existingJob) {
        console.log(`Job ${job.id} not found`);
        continue;
      }

      if (existingJob.status === EmailJobStatus.SENT) {
        console.log(`Job already SENT, skipping (idempotency)`);
        continue;
      }

      // Phase 8: Rate limiting check
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
      const sentInLastHour = await prisma.emailJob.count({
        where: {
          campaignId: job.campaignId,
          status: EmailJobStatus.SENT,
          sentAt: { gte: oneHourAgo },
        },
      });

      console.log(`Sent in last hour: ${sentInLastHour}/${job.campaign.hourlyLimit}`);

      if (sentInLastHour >= job.campaign.hourlyLimit) {
        console.log(`Rate limit reached, would reschedule in real worker`);
        continue;
      }

      // Phase 8: Delay between emails check
      if (job.campaign.delaySeconds > 0) {
        const lastSentJob = await prisma.emailJob.findFirst({
          where: {
            campaignId: job.campaignId,
            status: EmailJobStatus.SENT,
          },
          orderBy: { sentAt: 'desc' },
        });

        if (lastSentJob?.sentAt) {
          const timeSinceLastSend = Date.now() - lastSentJob.sentAt.getTime();
          const requiredDelay = job.campaign.delaySeconds * 1000;
          
          if (timeSinceLastSend < requiredDelay) {
            console.log(`Delay required: ${requiredDelay - timeSinceLastSend}ms`);
            continue;
          }
        }
      }

      // Update to SCHEDULED
      await prisma.emailJob.update({
        where: { id: job.id },
        data: {
          status: EmailJobStatus.SCHEDULED,
          scheduledAt: new Date(),
        },
      });

      console.log(`📤 Sending email to ${job.recipientEmail}...`);

      // Send email
      const emailResult = await sendEmail({
        to: job.recipientEmail,
        subject: job.campaign.subject,
        html: job.campaign.body,
      });

      // Update to SENT
      await prisma.emailJob.update({
        where: { id: job.id },
        data: {
          status: EmailJobStatus.SENT,
          sentAt: new Date(),
          attempts: { increment: 1 },
          lastError: null,
        },
      });

      console.log(`✅ Email sent successfully! Message ID: ${emailResult.messageId}`);
      
      // Simulate delay between emails
      if (job.campaign.delaySeconds > 0) {
        console.log(`⏳ Waiting ${job.campaign.delaySeconds}s before next email...`);
        await new Promise(resolve => setTimeout(resolve, job.campaign.delaySeconds * 1000));
      }
    }

    console.log('\n🎉 Worker simulation completed!');

    // Show final status
    const finalStats = await prisma.emailJob.groupBy({
      by: ['status'],
      _count: true,
    });

    console.log('\n📊 Final job statistics:');
    finalStats.forEach(stat => {
      console.log(`  ${stat.status}: ${stat._count}`);
    });

  } catch (error) {
    console.error('❌ Worker simulation failed:', error);
    process.exit(1);
  }
}

testWorkerSimulation();