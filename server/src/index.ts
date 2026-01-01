/**
 * LocalPay Backend Server
 * Main entry point
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';

import { initDatabase } from './db/index.js';
import authRoutes from './routes/auth.js';
import userRoutes from './routes/users.js';
import merchantRoutes from './routes/merchants.js';
import transactionRoutes from './routes/transactions.js';
import adminRoutes from './routes/admin.js';
import walletRoutes from './routes/wallet.js';
import settlementRoutes from './routes/settlements.js';
import loyaltyRoutes from './routes/loyalty.js';
import welfareRoutes from './routes/welfare.js';
import creditRoutes from './routes/credit.js';
import donationRoutes from './routes/donations.js';
import traceabilityRoutes from './routes/traceability.js';
import employeeRoutes from './routes/employees.js';
import touristRoutes from './routes/tourist.js';
import deliveryRoutes from './routes/delivery.js';
import couponRoutes from './routes/coupons.js';
import carbonRoutes from './routes/carbon.js';
import complianceRoutes from './routes/compliance.js';
import tokenRoutes from './routes/tokens.js';
import blockchainRoutes from './routes/blockchain.js';
import identityRoutes from './routes/identity.js';
import notificationRoutes from './routes/notifications.js';
import securityRoutes from './routes/security.js';
import databaseRoutes from './routes/database.js';
import externalRoutes from './routes/external.js';
import { errorHandler } from './middleware/errorHandler.js';
import { requestLogger } from './middleware/requestLogger.js';
import swaggerUi from 'swagger-ui-express';
import { swaggerSpec } from './config/swagger.js';
import healthRoutes from './routes/health.js';
import logger from './config/logger.js';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 8080;

// Security middleware
app.use(helmet());

// CORS configuration - allow any localhost port in development
const corsOrigins = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(',')
  : ['http://localhost:3000', 'http://localhost:3003', 'http://localhost:3004', 'http://localhost:5173'];

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps or curl)
    if (!origin) return callback(null, true);
    // Allow localhost with any port in development
    if (origin.startsWith('http://localhost:') || origin.startsWith('http://127.0.0.1:')) {
      return callback(null, true);
    }
    // Check against allowed origins
    if (corsOrigins.includes(origin)) {
      return callback(null, true);
    }
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: { error: 'Too many requests, please try again later.' },
});
app.use('/api/', limiter);

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Logging
app.use(morgan('combined'));
app.use(requestLogger);

// Health & Metrics Routes
app.use('/', healthRoutes);

// Swagger API Documentation
app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'LocalPay API Documentation',
}));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/merchants', merchantRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/wallet', walletRoutes);
app.use('/api/settlements', settlementRoutes);
app.use('/api/loyalty', loyaltyRoutes);
app.use('/api/merchant/loyalty', loyaltyRoutes);
app.use('/api/admin/loyalty', loyaltyRoutes);
app.use('/api/welfare', welfareRoutes);
app.use('/api/merchant/credit', creditRoutes);
app.use('/api/admin/credit', creditRoutes);
app.use('/api/employees', employeeRoutes);
app.use('/api/tourist', touristRoutes);
app.use('/api/admin/tourist', touristRoutes);
app.use('/api/donations', donationRoutes);
app.use('/api/trace', traceabilityRoutes);
app.use('/api', traceabilityRoutes);
app.use('/api/delivery', deliveryRoutes);
app.use('/api/coupons', couponRoutes);
app.use('/api/offers', couponRoutes);
app.use('/api/carbon', carbonRoutes);
app.use('/api/compliance', complianceRoutes);
app.use('/api/tokens', tokenRoutes);
app.use('/api/blockchain', blockchainRoutes);
app.use('/api/identity', identityRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/security', securityRoutes);
app.use('/api/admin/database', databaseRoutes);
app.use('/api/external', externalRoutes);

// Error handling
app.use(errorHandler);

// 404 handler
app.use((_req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// Initialize database and start server
async function start() {
  try {
    // Initialize SQLite database
    await initDatabase();
    logger.info('Database initialized');

    app.listen(PORT, () => {
      logger.info(`LocalPay Server running on port ${PORT}`);
      logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
      logger.info(`Swagger docs: http://localhost:${PORT}/api/docs`);
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

start();

export default app;
