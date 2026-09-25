import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function test() {
  const job = await prisma.emailJob.findFirst({
    where: { campaignId: 'cmugqa4qs0001ypfb9123bpm0' }
  });
  console.log(job);
}
test();
