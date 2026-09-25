import { getEmailTransporter } from '../config/email.js';
import nodemailer from 'nodemailer';

export interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
  sender?: string;
}

export async function sendEmail(options: EmailOptions) {
  try {
    const transporter = await getEmailTransporter(options.sender);
    
    const fromAddress = options.sender === 'sender1' ? '"Sender 1" <sender1@outbox.com>' : 
                        options.sender === 'sender2' ? '"Sender 2" <sender2@outbox.com>' : 
                        '"Outbox Email Scheduler" <noreply@outbox.com>';

    const info = await transporter.sendMail({
      from: fromAddress,
      to: options.to,
      subject: options.subject,
      text: options.text || options.html.replace(/<[^>]*>/g, ''), // Strip HTML for text version
      html: options.html,
    });

    console.log('Email sent successfully:', info.messageId);
    
    // Get the URL for previewing the email in Ethereal
    const previewUrl = nodemailer.getTestMessageUrl(info);
    if (previewUrl) {
      console.log('Email preview URL:', previewUrl);
    }

    return {
      success: true,
      messageId: info.messageId,
      previewUrl: previewUrl || null,
    };
  } catch (error) {
    console.error('Failed to send email:', error);
    throw new Error(`Email sending failed: ${error}`);
  }
}

export async function sendTestEmail(to: string) {
  return sendEmail({
    to,
    subject: 'Test Email from Outbox Scheduler',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Test Email</h2>
        <p>This is a test email from the Outbox Email Scheduler.</p>
        <p>If you received this, the email system is working correctly!</p>
        <p>Best regards,<br>Outbox Email Scheduler Team</p>
      </div>
    `,
    text: 'This is a test email from the Outbox Email Scheduler. If you received this, the email system is working correctly!',
  });
}