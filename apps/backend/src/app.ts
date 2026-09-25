import express from 'express';
import cors from 'cors';
import session from 'express-session';
import RedisStore from 'connect-redis';
import passport from './config/passport.js';
import prisma from './config/database.js';
import { sessionRedis } from './config/redis.js';
import authRoutes from './routes/auth.routes.js';
import emailRoutes from './routes/email.routes.js';
import campaignRoutes from './routes/campaign.routes.js';
import attachmentRoutes from './routes/attachment.routes.js';
import { getQueueHealth, initializeQueue } from './queue/index.js';

const app = express();

app.set('trust proxy', 1);

initializeQueue().catch((err) => {
  console.error('Queue initialization failed:', err.message);
});

app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(session({
  store: new RedisStore({ client: sessionRedis }),
  secret: process.env.SESSION_SECRET || 'your-secret-key',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
    maxAge: 24 * 60 * 60 * 1000,
  },
}));

app.use(passport.initialize());
app.use(passport.session());

app.use('/auth', authRoutes);
app.use('/email', emailRoutes);
app.use('/campaigns', campaignRoutes);
app.use('/attachments', attachmentRoutes);

app.get('/health', async (req, res) => {
  try {
    await prisma.$connect();
    const queueHealth = await getQueueHealth();
    res.json({ 
      status: 'ok', 
      message: 'Backend is running', 
      database: 'connected',
      email: 'configured',
      queue: queueHealth
    });
  } catch (error) {
    res.status(500).json({ status: 'error', message: 'Database connection failed', error: String(error) });
  }
});

export default app;
