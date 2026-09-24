import express from 'express';
import cors from 'cors';
import session from 'express-session';
import passport from './config/passport.js';
import prisma from './config/database.js';
import authRoutes from './routes/auth.routes.js';
import emailRoutes from './routes/email.routes.js';
import campaignRoutes from './routes/campaign.routes.js';
import { getQueueHealth, initializeQueue } from './queue/index.js';



const app = express();

// Initialize queue
initializeQueue().catch((err) => {
  console.error('Queue initialization failed:', err.message);
});

// CORS middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
}));

// Body parsing middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Session middleware (memory-based for now, switch to Redis when available)
app.use(session({
  secret: process.env.SESSION_SECRET || 'your-secret-key',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
  },
}));

// Passport middleware
app.use(passport.initialize());
app.use(passport.session());



// Routes
app.use('/auth', authRoutes);
app.use('/email', emailRoutes);
app.use('/campaigns', campaignRoutes);

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
