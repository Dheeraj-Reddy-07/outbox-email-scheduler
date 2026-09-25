import 'dotenv/config';
import { startWorker } from './src/queue/worker.js';
console.log('Starting worker to test processing...');
startWorker(1);
