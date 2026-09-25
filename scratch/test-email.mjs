import nodemailer from 'nodemailer';
const testAccount = await nodemailer.createTestAccount(); const transporter = nodemailer.createTransport({ host: 'smtp.ethereal.email', port: 587, secure: false, auth: { user: testAccount.user, pass: testAccount.pass } });
const info = await transporter.sendMail({
  from: '\
Test\ <test@test.com>', to: 'recipient@test.com', subject: 'Test', text: 'Test body', attachments: [{ filename: 'test.txt', content: Buffer.from('hello'), contentType: 'text/plain' }]
}); console.log(nodemailer.getTestMessageUrl(info));
