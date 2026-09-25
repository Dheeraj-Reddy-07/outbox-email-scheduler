import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function test() {
  // Get an existing unattached attachment
  const att = await prisma.emailAttachment.findFirst({ where: { campaignId: null } });
  if (!att) {
    console.log("No unattached attachments found.");
    return;
  }
  console.log("Found attachment:", att.id);

  const newCampaign = await prisma.campaign.create({
    data: {
      userId: 'cmuehm4aw00003j85appocksu', // Using an existing userId from previous output
      subject: 'Test Transaction',
      body: 'Test',
      startAt: new Date(),
      delaySeconds: 10,
      hourlyLimit: 10,
      senderEmail: 'test',
    },
  });

  console.log("Created campaign:", newCampaign.id);

  // Simulate updateMany
  const updateResult = await prisma.emailAttachment.updateMany({
    where: {
      id: { in: [att.id] },
      campaignId: null,
    },
    data: {
      campaignId: newCampaign.id,
    },
  });

  console.log("Update result:", updateResult);

  const campaignWithAtt = await prisma.campaign.findUnique({
    where: { id: newCampaign.id },
    include: { attachments: true },
  });

  console.log("Campaign with attachments:", JSON.stringify(campaignWithAtt, null, 2));
}

test();
