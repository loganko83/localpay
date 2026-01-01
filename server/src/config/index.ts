/**
 * Configuration Management
 * Validates and exports all environment configuration
 */

import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

interface Config {
  // Server
  port: number;
  nodeEnv: 'development' | 'production' | 'test';

  // Database
  dbPath: string;

  // JWT
  jwtSecret: string;
  jwtExpiresIn: string;

  // CORS
  corsOrigins: string[];

  // Rate Limiting
  rateLimitWindowMs: number;
  rateLimitMax: number;

  // Security
  maxLoginAttempts: number;
  lockoutDurationMinutes: number;
  sessionTimeoutMinutes: number;

  // External Services
  bankApiUrl: string;
  bankApiKey: string;
  didBaasUrl: string;
  didBaasApiKey: string;
  blockchainRpcUrl: string;
  blockchainChainId: number;

  // Logging
  logLevel: string;
}

function validateConfig(): Config {
  const errors: string[] = [];

  // Required in production
  const isProduction = process.env.NODE_ENV === 'production';

  // Validate JWT Secret
  const jwtSecret = process.env.JWT_SECRET || '';
  if (!jwtSecret || jwtSecret.includes('CHANGE_THIS') || jwtSecret.length < 32) {
    if (isProduction) {
      errors.push('JWT_SECRET must be set to a secure value (min 32 characters)');
    } else {
      console.warn('[Config] WARNING: Using default JWT secret. Set JWT_SECRET in production.');
    }
  }

  // Validate required environment variables in production
  if (isProduction) {
    const requiredVars = [
      'JWT_SECRET',
      'DB_PATH',
    ];

    for (const varName of requiredVars) {
      if (!process.env[varName]) {
        errors.push(`${varName} is required in production`);
      }
    }

    // Warn about placeholder values
    const placeholderVars = [
      { name: 'BANK_API_KEY', value: process.env.BANK_API_KEY },
      { name: 'DID_BAAS_API_KEY', value: process.env.DID_BAAS_API_KEY },
      { name: 'BLOCKCHAIN_PRIVATE_KEY', value: process.env.BLOCKCHAIN_PRIVATE_KEY },
    ];

    for (const { name, value } of placeholderVars) {
      if (!value || value.startsWith('your-') || value === '') {
        console.warn(`[Config] WARNING: ${name} appears to be a placeholder value`);
      }
    }
  }

  // Throw if critical errors in production
  if (errors.length > 0 && isProduction) {
    throw new Error(`Configuration errors:\n${errors.map(e => `  - ${e}`).join('\n')}`);
  }

  // Parse CORS origins
  const corsOrigins = (process.env.CORS_ORIGIN || 'http://localhost:3000')
    .split(',')
    .map(origin => origin.trim());

  return {
    // Server
    port: parseInt(process.env.PORT || '8080', 10),
    nodeEnv: (process.env.NODE_ENV as Config['nodeEnv']) || 'development',

    // Database
    dbPath: process.env.DB_PATH || './data/localpay.db',

    // JWT
    jwtSecret: jwtSecret || 'localpay-dev-secret-change-in-production',
    jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',

    // CORS
    corsOrigins,

    // Rate Limiting
    rateLimitWindowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10),
    rateLimitMax: parseInt(process.env.RATE_LIMIT_MAX || '100', 10),

    // Security
    maxLoginAttempts: parseInt(process.env.MAX_LOGIN_ATTEMPTS || '5', 10),
    lockoutDurationMinutes: parseInt(process.env.LOCKOUT_DURATION_MINUTES || '15', 10),
    sessionTimeoutMinutes: parseInt(process.env.SESSION_TIMEOUT_MINUTES || '30', 10),

    // External Services
    bankApiUrl: process.env.BANK_API_URL || 'https://api.ibk.co.kr/openbanking',
    bankApiKey: process.env.BANK_API_KEY || '',
    didBaasUrl: process.env.DID_BAAS_URL || 'https://trendy.storydot.kr/did-baas',
    didBaasApiKey: process.env.DID_BAAS_API_KEY || '',
    blockchainRpcUrl: process.env.BLOCKCHAIN_RPC_URL || 'https://mainnet.xphere.io',
    blockchainChainId: parseInt(process.env.BLOCKCHAIN_CHAIN_ID || '20250217', 10),

    // Logging
    logLevel: process.env.LOG_LEVEL || 'info',
  };
}

// Validate and export config
export const config = validateConfig();

// Log config status on startup (not in test mode)
if (process.env.NODE_ENV !== 'test') {
  console.log('[Config] Environment:', config.nodeEnv);
  console.log('[Config] Port:', config.port);
  console.log('[Config] Database:', config.dbPath);
  console.log('[Config] CORS Origins:', config.corsOrigins.join(', '));
}

export default config;
