/**
 * Swagger/OpenAPI Configuration
 */

import swaggerJsdoc from 'swagger-jsdoc';
import { config } from './index.js';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'LocalPay API',
      version: '1.0.0',
      description: `
LocalPay Backend API Server

## Overview
LocalPay is a blockchain-based local digital currency payment platform.
This API serves three user types: Consumer, Merchant, and Admin.

## Authentication
Most endpoints require JWT authentication. Include the token in the Authorization header:
\`\`\`
Authorization: Bearer <your-jwt-token>
\`\`\`

## Rate Limiting
- Default: 100 requests per 15 minutes
- Payment endpoints: 10 requests per minute
- Auth endpoints: 5 requests per minute

## Error Codes
- 400: Bad Request (validation error)
- 401: Unauthorized (authentication required)
- 403: Forbidden (insufficient permissions)
- 404: Not Found
- 409: Conflict (duplicate resource)
- 429: Too Many Requests (rate limited)
- 500: Internal Server Error
      `,
      contact: {
        name: 'LocalPay Support',
        email: 'support@localpay.kr',
      },
    },
    servers: [
      {
        url: config.nodeEnv === 'production'
          ? 'https://trendy.storydot.kr/localpay/api'
          : `http://localhost:${config.port}/api`,
        description: config.nodeEnv === 'production' ? 'Production' : 'Development',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Enter your JWT token',
        },
      },
      schemas: {
        Error: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: false },
            error: {
              type: 'object',
              properties: {
                code: { type: 'string', example: 'VALIDATION_ERROR' },
                message: { type: 'string', example: 'Validation failed' },
              },
            },
          },
        },
        User: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            email: { type: 'string', format: 'email' },
            phone: { type: 'string' },
            name: { type: 'string' },
            userType: { type: 'string', enum: ['consumer', 'merchant', 'admin'] },
            avatarUrl: { type: 'string', format: 'uri' },
            kycVerified: { type: 'boolean' },
            level: { type: 'string', enum: ['Bronze', 'Silver', 'Gold', 'Platinum'] },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },
        Wallet: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            balance: { type: 'number', example: 150000 },
            pendingBalance: { type: 'number', example: 0 },
            dailyLimit: { type: 'number', example: 500000 },
            monthlyLimit: { type: 'number', example: 2000000 },
            usedToday: { type: 'number', example: 50000 },
            usedThisMonth: { type: 'number', example: 350000 },
          },
        },
        Transaction: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            type: { type: 'string', enum: ['payment', 'refund', 'topup', 'voucher'] },
            amount: { type: 'number', example: 12000 },
            status: { type: 'string', enum: ['pending', 'completed', 'failed', 'cancelled'] },
            merchantId: { type: 'string' },
            merchantName: { type: 'string' },
            description: { type: 'string' },
            approvalCode: { type: 'string' },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },
        Merchant: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            storeName: { type: 'string' },
            businessNumber: { type: 'string' },
            category: { type: 'string' },
            address: { type: 'string' },
            rating: { type: 'number', example: 4.5 },
            isVerified: { type: 'boolean' },
            isOpen: { type: 'boolean' },
          },
        },
        Voucher: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            name: { type: 'string' },
            code: { type: 'string' },
            amount: { type: 'number' },
            type: { type: 'string', enum: ['welcome', 'promo', 'reward', 'welfare'] },
            usageLimit: { type: 'number' },
            usageCount: { type: 'number' },
            validFrom: { type: 'string', format: 'date' },
            validUntil: { type: 'string', format: 'date' },
            isActive: { type: 'boolean' },
          },
        },
        Pagination: {
          type: 'object',
          properties: {
            page: { type: 'integer', example: 0 },
            limit: { type: 'integer', example: 20 },
            total: { type: 'integer', example: 100 },
            totalPages: { type: 'integer', example: 5 },
          },
        },
      },
    },
    tags: [
      { name: 'Auth', description: 'Authentication endpoints' },
      { name: 'Wallet', description: 'Wallet operations' },
      { name: 'Transactions', description: 'Transaction management' },
      { name: 'Merchants', description: 'Merchant operations' },
      { name: 'Users', description: 'User management' },
      { name: 'Admin', description: 'Admin operations' },
      { name: 'Vouchers', description: 'Voucher management' },
      { name: 'Settlements', description: 'Settlement management' },
      { name: 'Compliance', description: 'FDS/AML compliance' },
      { name: 'Loyalty', description: 'Loyalty points' },
      { name: 'Carbon', description: 'Carbon credits' },
      { name: 'Blockchain', description: 'Blockchain explorer' },
      { name: 'Identity', description: 'DID/VC identity' },
      { name: 'Notifications', description: 'Push notifications' },
      { name: 'Security', description: 'Security management' },
    ],
  },
  apis: ['./src/routes/*.ts', './src/routes/*.js'],
};

export const swaggerSpec = swaggerJsdoc(options);
export default swaggerSpec;
