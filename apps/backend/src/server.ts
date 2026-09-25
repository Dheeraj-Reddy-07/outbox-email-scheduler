import 'dotenv/config';
import app from './app.js';
import { createEmailWorker } from './queue/worker.js';

// Force internal port 3001 so it doesn't conflict with Next.js using Render's PORT
const PORT = process.env.BACKEND_PORT || 3001;

app.listen(PORT, () => {
  console.log(`Backend server running on port ${PORT}`);
  
  try {
    const concurrency = parseInt(process.env.WORKER_CONCURRENCY || '5', 10);
    const worker = createEmailWorker(concurrency);
    console.log(`BullMQ worker process initialized with concurrency ${concurrency} and listening for jobs...`);

    process.on('SIGTERM', async () => {
      console.log('SIGTERM received, closing worker...');
      await worker.close();
      process.exit(0);
    });

    process.on('SIGINT', async () => {
      console.log('SIGINT received, closing worker...');
      await worker.close();
      process.exit(0);
    });
  } catch (err) {
    console.error('Failed to start BullMQ worker:', err);
  }
});

