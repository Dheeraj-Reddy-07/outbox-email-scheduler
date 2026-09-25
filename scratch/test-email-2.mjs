import nodemailer from 'nodemailer';
import fs from 'fs/promises';

async function test() {
  const fileBuffer = await fs.readFile('d:/outbox-email-scheduler/apps/backend/uploads/outbox-test-attachment__1__381226f462731186.pdf');
  const testAccount = await nodemailer.createTestAccount(); 
  const transporter = nodemailer.createTransport({ host: 'smtp.ethereal.email', port: 587, secure: false, auth: { user: testAccount.user, pass: testAccount.pass } });
  
  console.log("Sending email...");
  const info = await transporter.sendMail({ 
    from: '"Test" <test@test.com>', 
    to: 'recipient@test.com', 
    subject: 'Test', 
    text: 'Test body', 
    attachments: [{ filename: 'outbox-test-attachment (1).pdf', content: fileBuffer, contentType: 'application/pdf' }] 
  }); 
  console.log(nodemailer.getTestMessageUrl(info));
}
test();
