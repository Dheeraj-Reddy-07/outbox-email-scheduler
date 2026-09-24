import dotenv from 'dotenv';
import prisma from '../config/database.js';
import { EmailJobStatus } from '@prisma/client';

dotenv.config();

async function checkEmailJobs() {
  try {
    console.log('Checking email job status...\n');

    const jobs = await prisma.emailJob.findMany({
      include: {
        campaign: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });

    console.log(`Total jobs found: ${jobs.length}\n`);

    // Group by status
    const statusGroups = jobs.reduce((acc, job) => {
      acc[job.status] = acc[job.status] || [];
      acc[job.status].push(job);
      return acc;
    }, {} as Record<string, typeof jobs>);

    Object.entries(statusGroups).forEach(([status, statusJobs]) => {
      console.log(`\n${status} (${statusJobs.length}):`);
      statusJobs.forEach(job => {
        console.log(`  - ${job.recipientEmail} | Campaign: ${job.campaign.subject} | Attempts: ${job.attempts}`);
        if (job.sentAt) {
          console.log(`    Sent at: ${job.sentAt.toISOString()}`);
        }
        if (job.lastError) {
          console.log(`    Error: ${job.lastError}`);
        }
      });
    });

  } catch (error) {
    console.error('Failed to check email jobs:', error);
    process.exit(1);
  }
}

checkEmailJobs();