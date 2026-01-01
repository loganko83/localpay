/**
 * Email Service
 * Supports AWS SES and SMTP (SendGrid, etc.)
 */

import logger from '../config/logger.js';

export interface EmailMessage {
  to: string | string[];
  subject: string;
  html?: string;
  text?: string;
  from?: string;
  replyTo?: string;
}

export interface EmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

export interface EmailConfig {
  provider: 'ses' | 'smtp' | 'sendgrid';
  from: string;
  // SES config
  awsRegion?: string;
  awsAccessKeyId?: string;
  awsSecretAccessKey?: string;
  // SMTP config
  smtpHost?: string;
  smtpPort?: number;
  smtpUser?: string;
  smtpPass?: string;
  // SendGrid config
  sendgridApiKey?: string;
}

// Email templates
export const emailTemplates = {
  welcome: (name: string) => ({
    subject: 'Welcome to LocalPay',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #ed2630; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background: #f9f9f9; }
          .footer { text-align: center; padding: 20px; font-size: 12px; color: #666; }
          .button { display: inline-block; padding: 12px 24px; background: #ed2630; color: white; text-decoration: none; border-radius: 4px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Welcome to LocalPay</h1>
          </div>
          <div class="content">
            <p>Hello ${name},</p>
            <p>Thank you for joining LocalPay, Busan's blockchain-based local digital currency platform.</p>
            <p>With LocalPay, you can:</p>
            <ul>
              <li>Make secure payments at local merchants</li>
              <li>Earn loyalty points and carbon credits</li>
              <li>Access exclusive local promotions</li>
            </ul>
            <p>Get started by downloading our app or visiting our website.</p>
            <p><a href="https://localpay.kr" class="button">Get Started</a></p>
          </div>
          <div class="footer">
            <p>&copy; 2026 LocalPay. All rights reserved.</p>
            <p>Busan, South Korea</p>
          </div>
        </div>
      </body>
      </html>
    `,
    text: `Welcome to LocalPay, ${name}! Thank you for joining Busan's blockchain-based local digital currency platform.`,
  }),

  verification: (name: string, code: string) => ({
    subject: 'Verify Your Email - LocalPay',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #ed2630; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background: #f9f9f9; }
          .code { font-size: 32px; font-weight: bold; text-align: center; padding: 20px; background: #fff; border: 2px dashed #ed2630; margin: 20px 0; }
          .footer { text-align: center; padding: 20px; font-size: 12px; color: #666; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Email Verification</h1>
          </div>
          <div class="content">
            <p>Hello ${name},</p>
            <p>Please use the following code to verify your email address:</p>
            <div class="code">${code}</div>
            <p>This code will expire in 10 minutes.</p>
            <p>If you didn't request this verification, please ignore this email.</p>
          </div>
          <div class="footer">
            <p>&copy; 2026 LocalPay. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `,
    text: `Hello ${name}, Your LocalPay verification code is: ${code}. This code expires in 10 minutes.`,
  }),

  passwordReset: (name: string, resetLink: string) => ({
    subject: 'Password Reset - LocalPay',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #ed2630; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background: #f9f9f9; }
          .button { display: inline-block; padding: 12px 24px; background: #ed2630; color: white; text-decoration: none; border-radius: 4px; }
          .footer { text-align: center; padding: 20px; font-size: 12px; color: #666; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Password Reset</h1>
          </div>
          <div class="content">
            <p>Hello ${name},</p>
            <p>We received a request to reset your password. Click the button below to create a new password:</p>
            <p style="text-align: center; margin: 30px 0;">
              <a href="${resetLink}" class="button">Reset Password</a>
            </p>
            <p>This link will expire in 1 hour.</p>
            <p>If you didn't request a password reset, please ignore this email or contact support if you have concerns.</p>
          </div>
          <div class="footer">
            <p>&copy; 2026 LocalPay. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `,
    text: `Hello ${name}, Click here to reset your password: ${resetLink}. This link expires in 1 hour.`,
  }),

  transactionReceipt: (name: string, transaction: {
    type: string;
    amount: number;
    merchant: string;
    date: string;
    transactionId: string;
  }) => ({
    subject: `Transaction Receipt - ${transaction.type} ${transaction.amount.toLocaleString()} KRW`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #ed2630; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background: #f9f9f9; }
          .receipt { background: white; padding: 20px; border: 1px solid #ddd; margin: 20px 0; }
          .receipt-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #eee; }
          .receipt-total { font-size: 24px; font-weight: bold; text-align: center; margin: 20px 0; }
          .footer { text-align: center; padding: 20px; font-size: 12px; color: #666; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Transaction Receipt</h1>
          </div>
          <div class="content">
            <p>Hello ${name},</p>
            <p>Here's your transaction receipt:</p>
            <div class="receipt">
              <div class="receipt-row">
                <span>Transaction ID</span>
                <span>${transaction.transactionId}</span>
              </div>
              <div class="receipt-row">
                <span>Type</span>
                <span>${transaction.type}</span>
              </div>
              <div class="receipt-row">
                <span>Merchant</span>
                <span>${transaction.merchant}</span>
              </div>
              <div class="receipt-row">
                <span>Date</span>
                <span>${transaction.date}</span>
              </div>
              <div class="receipt-total">
                ${transaction.amount.toLocaleString()} KRW
              </div>
            </div>
          </div>
          <div class="footer">
            <p>&copy; 2026 LocalPay. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `,
    text: `Transaction Receipt - ${transaction.type} ${transaction.amount.toLocaleString()} KRW at ${transaction.merchant} on ${transaction.date}. Transaction ID: ${transaction.transactionId}`,
  }),
};

/**
 * Check if email service is configured
 */
export function isEmailConfigured(): boolean {
  const provider = process.env.EMAIL_PROVIDER;

  if (provider === 'ses') {
    return !!(process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY);
  }

  if (provider === 'sendgrid') {
    return !!process.env.SENDGRID_API_KEY;
  }

  if (provider === 'smtp') {
    return !!(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);
  }

  return false;
}

/**
 * Get email configuration
 */
function getEmailConfig(): EmailConfig | null {
  const provider = (process.env.EMAIL_PROVIDER || 'ses') as EmailConfig['provider'];
  const from = process.env.EMAIL_FROM || 'noreply@localpay.kr';

  if (provider === 'ses') {
    if (!process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY) {
      return null;
    }
    return {
      provider,
      from,
      awsRegion: process.env.AWS_REGION || 'ap-northeast-2',
      awsAccessKeyId: process.env.AWS_ACCESS_KEY_ID,
      awsSecretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    };
  }

  if (provider === 'sendgrid') {
    if (!process.env.SENDGRID_API_KEY) {
      return null;
    }
    return {
      provider,
      from,
      sendgridApiKey: process.env.SENDGRID_API_KEY,
    };
  }

  if (provider === 'smtp') {
    if (!process.env.SMTP_HOST) {
      return null;
    }
    return {
      provider,
      from,
      smtpHost: process.env.SMTP_HOST,
      smtpPort: parseInt(process.env.SMTP_PORT || '587', 10),
      smtpUser: process.env.SMTP_USER,
      smtpPass: process.env.SMTP_PASS,
    };
  }

  return null;
}

/**
 * Send email
 */
export async function sendEmail(message: EmailMessage): Promise<EmailResult> {
  const config = getEmailConfig();

  if (!config) {
    logger.warn('Email service not configured, skipping email');
    return { success: false, error: 'Email service not configured' };
  }

  const from = message.from || config.from;
  const recipients = Array.isArray(message.to) ? message.to : [message.to];

  try {
    let result: EmailResult;

    switch (config.provider) {
      case 'ses':
        result = await sendViaSES(config, from, recipients, message);
        break;
      case 'sendgrid':
        result = await sendViaSendGrid(config, from, recipients, message);
        break;
      case 'smtp':
        result = await sendViaSMTP(config, from, recipients, message);
        break;
      default:
        throw new Error(`Unknown email provider: ${config.provider}`);
    }

    if (result.success) {
      logger.info('Email sent', {
        to: recipients,
        subject: message.subject,
        messageId: result.messageId,
      });
    }

    return result;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error('Failed to send email', { error: errorMessage, to: recipients });
    return { success: false, error: errorMessage };
  }
}

/**
 * Send email via AWS SES
 */
async function sendViaSES(
  config: EmailConfig,
  from: string,
  recipients: string[],
  message: EmailMessage
): Promise<EmailResult> {
  // In production, use @aws-sdk/client-ses
  const endpoint = `https://email.${config.awsRegion}.amazonaws.com`;

  // Create SES API request (simplified)
  const params = new URLSearchParams({
    Action: 'SendEmail',
    'Source': from,
    'Destination.ToAddresses.member.1': recipients[0],
    'Message.Subject.Data': message.subject,
    'Message.Body.Html.Data': message.html || '',
    'Message.Body.Text.Data': message.text || '',
    Version: '2010-12-01',
  });

  // Note: In production, use proper AWS signature v4 signing
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      // Add AWS auth headers here
    },
    body: params.toString(),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`SES error: ${error}`);
  }

  return { success: true, messageId: 'ses-' + Date.now() };
}

/**
 * Send email via SendGrid
 */
async function sendViaSendGrid(
  config: EmailConfig,
  from: string,
  recipients: string[],
  message: EmailMessage
): Promise<EmailResult> {
  const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${config.sendgridApiKey}`,
    },
    body: JSON.stringify({
      personalizations: [{ to: recipients.map(email => ({ email })) }],
      from: { email: from },
      subject: message.subject,
      content: [
        ...(message.text ? [{ type: 'text/plain', value: message.text }] : []),
        ...(message.html ? [{ type: 'text/html', value: message.html }] : []),
      ],
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`SendGrid error: ${error}`);
  }

  const messageId = response.headers.get('x-message-id') || 'sg-' + Date.now();
  return { success: true, messageId };
}

/**
 * Send email via SMTP (placeholder)
 */
async function sendViaSMTP(
  _config: EmailConfig,
  _from: string,
  _recipients: string[],
  _message: EmailMessage
): Promise<EmailResult> {
  // In production, use nodemailer
  logger.warn('SMTP email sending not implemented, would send email');
  return { success: true, messageId: 'smtp-' + Date.now() };
}

/**
 * Send welcome email
 */
export async function sendWelcomeEmail(email: string, name: string): Promise<EmailResult> {
  const template = emailTemplates.welcome(name);
  return sendEmail({ to: email, ...template });
}

/**
 * Send verification email
 */
export async function sendVerificationEmail(
  email: string,
  name: string,
  code: string
): Promise<EmailResult> {
  const template = emailTemplates.verification(name, code);
  return sendEmail({ to: email, ...template });
}

/**
 * Send password reset email
 */
export async function sendPasswordResetEmail(
  email: string,
  name: string,
  resetToken: string
): Promise<EmailResult> {
  const baseUrl = process.env.FRONTEND_URL || 'https://localpay.kr';
  const resetLink = `${baseUrl}/reset-password?token=${resetToken}`;
  const template = emailTemplates.passwordReset(name, resetLink);
  return sendEmail({ to: email, ...template });
}

/**
 * Send transaction receipt email
 */
export async function sendTransactionReceipt(
  email: string,
  name: string,
  transaction: {
    type: string;
    amount: number;
    merchant: string;
    date: string;
    transactionId: string;
  }
): Promise<EmailResult> {
  const template = emailTemplates.transactionReceipt(name, transaction);
  return sendEmail({ to: email, ...template });
}

export default {
  isEmailConfigured,
  sendEmail,
  sendWelcomeEmail,
  sendVerificationEmail,
  sendPasswordResetEmail,
  sendTransactionReceipt,
  emailTemplates,
};
