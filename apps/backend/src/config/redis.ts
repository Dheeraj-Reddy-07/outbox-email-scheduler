import Redis from 'ioredis';

// Main Redis client for BullMQ
if (!process.env.REDIS_URL) {
  throw new Error('REDIS_URL environment variable is required. Please set your Upstash Redis connection string.');
}

const redis = new Redis(process.env.REDIS_URL, {
  maxRetriesPerRequest: null,
  retryStrategy: (times) => {
    if (times > 3) {
      console.error('Redis connection failed after 3 retries');
      return null; // Stop retrying
    }
    return Math.min(times * 100, 3000); // Exponential backoff
  },
});

redis.on('connect', () => {
  console.log('Redis connected');
});

redis.on('error', (err) => {
  console.error('Redis connection error:', err.message);
});

// Session Redis client
const sessionRedis = new Redis(process.env.REDIS_URL, {
  retryStrategy: (times) => {
    if (times > 3) {
      return null;
    }
    return Math.min(times * 100, 3000);
  },
});

// Test connection - will throw if connection fails
const redisConnectedPromise = redis.ping().then(() => {
  console.log('Redis ping successful');
}).catch((err) => {
  console.error('Redis ping failed, Redis is not available:', err.message);
  throw new Error(`Redis connection failed: ${err.message}`);
});

export { redis, sessionRedis, redisConnectedPromise };
