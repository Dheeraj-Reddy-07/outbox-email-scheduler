import nodemailer from 'nodemailer';

// Create Ethereal SMTP transporter
let transporter: nodemailer.Transporter | null = null;

export async function getEmailTransporter() {
  if (transporter) {
    return transporter;
  }

  // If Ethereal credentials are not set, create a test account
  if (!process.env.ETHEREAL_USER || process.env.ETHEREAL_USER === 'dummy') {
    console.log('Creating Ethereal test account...');
    const testAccount = await nodemailer.createTestAccount();
    
    // Update environment with the test account credentials
    process.env.ETHEREAL_USER = testAccount.user;
    process.env.ETHEREAL_PASSWORD = testAccount.pass;
    
    console.log('Ethereal test account created:');
    console.log('  User:', testAccount.user);
    console.log('  Pass:', testAccount.pass);
    console.log('  SMTP:', testAccount.smtp.host);
    console.log('  Web preview URL:', nodemailer.getTestMessageUrl({} as any));
  }

  transporter = nodemailer.createTransport({
    host: process.env.ETHEREAL_HOST || 'smtp.ethereal.email',
    port: parseInt(process.env.ETHEREAL_PORT || '587'),
    secure: false, // true for 465, false for other ports
    auth: {
      user: process.env.ETHEREAL_USER,
      pass: process.env.ETHEREAL_PASSWORD,
    },
  });

  return transporter;
}

export async function getTestAccountUrl() {
  const testAccount = await nodemailer.createTestAccount();
  return nodemailer.getTestMessageUrl({} as any);
}