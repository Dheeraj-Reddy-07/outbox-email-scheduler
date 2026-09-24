import 'dotenv/config';
import app from './app.js';
import { createEmailWorker } from './queue/worker.js';

const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
  console.log(`Backend server running on port ${PORT}`);
  
  // Start BullMQ email worker alongside backend server
  try {
    createEmailWorker(5);
    console.log('BullMQ worker process initialized and listening for jobs...');
  } catch (err) {
    console.error('Failed to start BullMQ worker:', err);
  }
});

