/**
 * SMS Service
 * Supports multiple SMS providers for Korean market
 */

import logger from '../config/logger.js';

export interface SMSMessage {
  to: string;
  message: string;
  from?: string;
}

export interface SMSResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

export interface SMSConfig {
  provider: 'aligo' | 'ncloud' | 'twilio';
  apiKey: string;
  apiSecret?: string;
  sender: string;
}

// SMS templates (Korean)
export const smsTemplates = {
  verification: (code: string) =>
    `[LocalPay] Your verification code is ${code}. Valid for 10 minutes.`,

  paymentConfirmation: (amount: number, merchant: string) =>
    `[LocalPay] Payment of ${amount.toLocaleString()} KRW to ${merchant} completed.`,

  refundConfirmation: (amount: number, merchant: string) =>
    `[LocalPay] Refund of ${amount.toLocaleString()} KRW from ${merchant} processed.`,

  securityAlert: (message: string) =>
    `[LocalPay Security Alert] ${message}`,

  passwordReset: (code: string) =>
    `[LocalPay] Password reset code: ${code}. Valid for 10 minutes.`,

  walletCharged: (amount: number) =>
    `[LocalPay] ${amount.toLocaleString()} KRW added to your wallet.`,
};

/**
 * Check if SMS service is configured
 */
export function isSMSConfigured(): boolean {
  return !!(process.env.SMS_API_KEY && process.env.SMS_SENDER);
}

/**
 * Get SMS configuration
 */
function getSMSConfig(): SMSConfig | null {
  if (!isSMSConfigured()) {
    return null;
  }

  return {
    provider: (process.env.SMS_PROVIDER || 'aligo') as SMSConfig['provider'],
    apiKey: process.env.SMS_API_KEY!,
    apiSecret: process.env.SMS_API_SECRET,
    sender: process.env.SMS_SENDER!,
  };
}

/**
 * Normalize Korean phone number
 */
function normalizePhoneNumber(phone: string): string {
  // Remove all non-digit characters
  let normalized = phone.replace(/\D/g, '');

  // Handle Korean phone numbers
  if (normalized.startsWith('82')) {
    normalized = '0' + normalized.substring(2);
  } else if (normalized.startsWith('+82')) {
    normalized = '0' + normalized.substring(3);
  }

  // Validate Korean mobile number format
  if (normalized.startsWith('010') && normalized.length === 11) {
    return normalized;
  }

  // Return as-is if it doesn't match expected format
  return normalized;
}

/**
 * Send SMS message
 */
export async function sendSMS(message: SMSMessage): Promise<SMSResult> {
  const config = getSMSConfig();

  if (!config) {
    logger.warn('SMS service not configured, skipping SMS');
    return { success: false, error: 'SMS service not configured' };
  }

  const normalizedPhone = normalizePhoneNumber(message.to);
  const sender = message.from || config.sender;

  try {
    let result: SMSResult;

    switch (config.provider) {
      case 'aligo':
        result = await sendViaAligo(config, sender, normalizedPhone, message.message);
        break;
      case 'ncloud':
        result = await sendViaNcloud(config, sender, normalizedPhone, message.message);
        break;
      case 'twilio':
        result = await sendViaTwilio(config, sender, normalizedPhone, message.message);
        break;
      default:
        throw new Error(`Unknown SMS provider: ${config.provider}`);
    }

    if (result.success) {
      logger.info('SMS sent', {
        to: normalizedPhone.substring(0, 3) + '****' + normalizedPhone.substring(7),
        provider: config.provider,
        messageId: result.messageId,
      });
    }

    return result;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error('Failed to send SMS', { error: errorMessage });
    return { success: false, error: errorMessage };
  }
}

/**
 * Send SMS via Aligo (Korean SMS provider)
 */
async function sendViaAligo(
  config: SMSConfig,
  sender: string,
  receiver: string,
  message: string
): Promise<SMSResult> {
  const formData = new URLSearchParams({
    key: config.apiKey,
    user_id: config.apiSecret || '',
    sender,
    receiver,
    msg: message,
    msg_type: 'SMS', // SMS or LMS for long messages
  });

  const response = await fetch('https://apis.aligo.in/send/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: formData.toString(),
  });

  const data = await response.json() as { result_code: string; msg_id: string; message: string };

  if (data.result_code === '1') {
    return { success: true, messageId: data.msg_id };
  } else {
    throw new Error(`Aligo error: ${data.message}`);
  }
}

/**
 * Send SMS via Naver Cloud Platform
 */
async function sendViaNcloud(
  config: SMSConfig,
  sender: string,
  receiver: string,
  message: string
): Promise<SMSResult> {
  const timestamp = Date.now().toString();
  const serviceId = process.env.NCLOUD_SERVICE_ID;

  const response = await fetch(
    `https://sens.apigw.ntruss.com/sms/v2/services/${serviceId}/messages`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-ncp-apigw-timestamp': timestamp,
        'x-ncp-iam-access-key': config.apiKey,
        // Add HMAC signature in production
      },
      body: JSON.stringify({
        type: 'SMS',
        from: sender,
        content: message,
        messages: [{ to: receiver }],
      }),
    }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Ncloud error: ${error}`);
  }

  const data = await response.json() as { requestId: string };
  return { success: true, messageId: data.requestId };
}

/**
 * Send SMS via Twilio
 */
async function sendViaTwilio(
  config: SMSConfig,
  sender: string,
  receiver: string,
  message: string
): Promise<SMSResult> {
  const accountSid = config.apiKey;
  const authToken = config.apiSecret;

  const response = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: 'Basic ' + Buffer.from(`${accountSid}:${authToken}`).toString('base64'),
      },
      body: new URLSearchParams({
        To: '+82' + receiver.substring(1), // Convert to international format
        From: sender,
        Body: message,
      }).toString(),
    }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Twilio error: ${error}`);
  }

  const data = await response.json() as { sid: string };
  return { success: true, messageId: data.sid };
}

/**
 * Send verification code via SMS
 */
export async function sendVerificationSMS(phone: string, code: string): Promise<SMSResult> {
  const message = smsTemplates.verification(code);
  return sendSMS({ to: phone, message });
}

/**
 * Send payment confirmation SMS
 */
export async function sendPaymentConfirmationSMS(
  phone: string,
  amount: number,
  merchant: string
): Promise<SMSResult> {
  const message = smsTemplates.paymentConfirmation(amount, merchant);
  return sendSMS({ to: phone, message });
}

/**
 * Send password reset code via SMS
 */
export async function sendPasswordResetSMS(phone: string, code: string): Promise<SMSResult> {
  const message = smsTemplates.passwordReset(code);
  return sendSMS({ to: phone, message });
}

/**
 * Send security alert via SMS
 */
export async function sendSecurityAlertSMS(phone: string, alertMessage: string): Promise<SMSResult> {
  const message = smsTemplates.securityAlert(alertMessage);
  return sendSMS({ to: phone, message });
}

export default {
  isSMSConfigured,
  sendSMS,
  sendVerificationSMS,
  sendPaymentConfirmationSMS,
  sendPasswordResetSMS,
  sendSecurityAlertSMS,
  smsTemplates,
};
