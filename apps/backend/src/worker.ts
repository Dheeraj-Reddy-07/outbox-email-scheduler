import 'dotenv/config';
import { startWorker } from './queue/worker.js';

// Start the worker process
startWorker().catch((error) => {
  console.error('Failed to start worker:', error);
  process.exit(1);
});