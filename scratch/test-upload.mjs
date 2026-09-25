import fs from 'fs';
import path from 'path';

async function testUpload() {
  const filePath = path.join(process.cwd(), 'README.md');
  const fileStats = fs.statSync(filePath);
  const fileContent = fs.readFileSync(filePath);
  
  const boundary = '----WebKitFormBoundary7MA4YWxkTrZu0gW';
  const data = 
    `--${boundary}\r\n` +
    `Content-Disposition: form-data; name="attachments"; filename="README.md"\r\n` +
    `Content-Type: text/markdown\r\n\r\n` +
    fileContent.toString() + `\r\n` +
    `--${boundary}--`;
    
  try {
    const response = await fetch('http://localhost:3001/attachments', {
      method: 'POST',
      headers: {
        'Content-Type': `multipart/form-data; boundary=${boundary}`,
        'Cookie': 'connect.sid=dummy'
      },
      body: data
    });
    console.log(response.status);
    console.log(await response.text());
  } catch (error) {
    console.error('Fetch error:', error.message);
  }
}
testUpload();
