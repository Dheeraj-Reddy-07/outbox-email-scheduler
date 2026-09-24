import dotenv from 'dotenv';
import { sendTestEmail } from '../services/email.service.js';

dotenv.config();

async function testEmail() {
  try {
    console.log('Testing email functionality...');
    console.log('Using Ethereal SMTP');
    
    const result = await sendTestEmail('test@example.com');
    
    console.log('Email test successful!');
    console.log('Message ID:', result.messageId);
    console.log('Preview URL:', result.previewUrl);
    
    if (result.previewUrl) {
      console.log('\nYou can view the email at:', result.previewUrl);
    }
  } catch (error) {
    console.error('Email test failed:', error);
    process.exit(1);
  }
}

testEmail();