import nodemailer from 'nodemailer';

const transporters: Record<string, nodemailer.Transporter> = {};

export async function getEmailTransporter(senderKey?: string) {
  const key = senderKey || 'default';

  if (transporters[key]) {
    return transporters[key];
  }

  let user = process.env.ETHEREAL_USER;
  let pass = process.env.ETHEREAL_PASSWORD;

  if (key === 'sender1' && process.env.SENDER_1_USER) {
    user = process.env.SENDER_1_USER;
    pass = process.env.SENDER_1_PASS;
  } else if (key === 'sender2' && process.env.SENDER_2_USER) {
    user = process.env.SENDER_2_USER;
    pass = process.env.SENDER_2_PASS;
  }

  // If Ethereal credentials are not set, create a test account
  if (!user || user === 'dummy') {
    console.log(`Creating Ethereal test account for ${key}...`);
    const testAccount = await nodemailer.createTestAccount();
    
    user = testAccount.user;
    pass = testAccount.pass;
    
    console.log(`Ethereal test account created for ${key}:`);
    console.log('  User:', user);
    console.log('  Pass:', pass);
    console.log('  SMTP:', testAccount.smtp.host);
  }

  const transporter = nodemailer.createTransport({
    host: process.env.ETHEREAL_HOST || 'smtp.ethereal.email',
    port: parseInt(process.env.ETHEREAL_PORT || '587'),
    secure: false, // true for 465, false for other ports
    auth: {
      user: user,
      pass: pass,
    },
  });

  transporters[key] = transporter;
  return transporter;
}
