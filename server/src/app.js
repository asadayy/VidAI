import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';
import mongoSanitize from 'express-mongo-sanitize';
import rateLimit from 'express-rate-limit';
import hpp from 'hpp';
import { logger } from './config/logger.js';

// Import routes
import authRoutes from './routes/auth.routes.js';
import vendorRoutes from './routes/vendor.routes.js';
import bookingRoutes from './routes/booking.routes.js';
import budgetRoutes from './routes/budget.routes.js';
import adminRoutes from './routes/admin.routes.js';
import uploadRoutes from './routes/upload.routes.js';
import paymentRoutes from './routes/payment.routes.js';
import aiRoutes from './routes/ai.routes.js';

// Import middleware
import { errorHandler, notFound } from './middleware/error.middleware.js';

const app = express();

// --------------- SECURITY MIDDLEWARE ---------------

// Set security HTTP headers
app.use(helmet());

// CORS - allow frontend
// CORS - allow frontend (Vite local and Vercel production)
const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:5173',
  'http://10.1.146.230:5173',
  'http://192.168.2.102:5173',
];
if (process.env.CLIENT_URL) {
  allowedOrigins.push(process.env.CLIENT_URL);
}

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, curl, Postman, server-to-server)
    if (!origin) return callback(null, true);
    // Allow any Vercel deployment URL
    if (/\.vercel\.app$/.test(origin)) return callback(null, true);
    // Allow any ngrok tunnel
    if (/\.ngrok(-free)?\.app$/.test(origin) || /\.ngrok\.io$/.test(origin)) return callback(null, true);
    // Allow explicitly whitelisted origins
    if (allowedOrigins.includes(origin)) return callback(null, true);
    callback(new Error(`CORS: origin '${origin}' not allowed`));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'ngrok-skip-browser-warning'],
}));

// Allow requests without origin header (mobile apps)
app.use((req, res, next) => {
  if (!req.headers.origin) {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, ngrok-skip-browser-warning');
  }
  next();
});

// Rate limiting - global
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
  max: process.env.NODE_ENV === 'development' ? 10000 : (parseInt(process.env.RATE_LIMIT_MAX) || 100), // Much higher in dev
  message: {
    success: false,
    message: 'Too many requests from this IP, please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api', limiter);

// Stricter rate limit for auth endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: process.env.NODE_ENV === 'development' ? 1000 : 20, // Much higher limit in development
  message: {
    success: false,
    message: 'Too many authentication attempts, please try again after 15 minutes.',
  },
});
app.use('/api/v1/auth', authLimiter);

// --------------- BODY PARSING ---------------

// Body parser - JSON (limit payload size)
// Skip JSON parsing for Stripe webhook route — it needs the raw body buffer
// for signature verification. The webhook route uses express.raw() instead.
app.use((req, res, next) => {
  if (req.originalUrl === '/api/v1/payments/webhook') {
    return next();
  }
  express.json({ limit: '10mb' })(req, res, next);
});
app.use((req, res, next) => {
  if (req.originalUrl === '/api/v1/payments/webhook') {
    return next();
  }
  express.urlencoded({ extended: true, limit: '10mb' })(req, res, next);
});

// Data sanitization against NoSQL injection
app.use(mongoSanitize());

// Prevent HTTP Parameter Pollution
app.use(hpp());

// Compression
app.use(compression());

// --------------- LOGGING ---------------

if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined', {
    stream: { write: (message) => logger.info(message.trim()) },
  }));
}

// --------------- ROUTES ---------------

// Health check
app.get('/api/v1/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'VidAI API is running',
    environment: process.env.NODE_ENV,
    timestamp: new Date().toISOString(),
  });
});

// API v1 routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/vendors', vendorRoutes);
app.use('/api/v1/bookings', bookingRoutes);
app.use('/api/v1/budget', budgetRoutes);
app.use('/api/v1/admin', adminRoutes);
app.use('/api/v1/upload', uploadRoutes);
app.use('/api/v1/payments', paymentRoutes);
app.use('/api/v1/ai', aiRoutes);

// --------------- ERROR HANDLING ---------------

app.use(notFound);
app.use(errorHandler);

export default app;
