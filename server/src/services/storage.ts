/**
 * File Storage Service
 * Supports local storage and AWS S3
 */

import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import logger from '../config/logger.js';

export interface UploadOptions {
  filename?: string;
  contentType?: string;
  maxSize?: number; // in bytes
  allowedTypes?: string[];
  folder?: string;
}

export interface UploadResult {
  success: boolean;
  url?: string;
  key?: string;
  size?: number;
  error?: string;
}

export interface StorageConfig {
  provider: 'local' | 's3';
  // Local config
  uploadDir?: string;
  publicUrl?: string;
  // S3 config
  s3Bucket?: string;
  s3Region?: string;
  s3AccessKeyId?: string;
  s3SecretAccessKey?: string;
}

// Allowed file types by category
export const allowedFileTypes = {
  images: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
  documents: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
  all: ['*/*'],
};

// Default max file sizes
export const maxFileSizes = {
  avatar: 2 * 1024 * 1024, // 2MB
  document: 10 * 1024 * 1024, // 10MB
  default: 5 * 1024 * 1024, // 5MB
};

/**
 * Get storage configuration
 */
function getStorageConfig(): StorageConfig {
  const provider = (process.env.STORAGE_PROVIDER || 'local') as StorageConfig['provider'];

  if (provider === 's3') {
    return {
      provider,
      s3Bucket: process.env.S3_BUCKET,
      s3Region: process.env.AWS_REGION || 'ap-northeast-2',
      s3AccessKeyId: process.env.AWS_ACCESS_KEY_ID,
      s3SecretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    };
  }

  return {
    provider: 'local',
    uploadDir: process.env.UPLOAD_DIR || path.join(process.cwd(), 'uploads'),
    publicUrl: process.env.PUBLIC_URL || '/uploads',
  };
}

/**
 * Check if S3 is configured
 */
export function isS3Configured(): boolean {
  return !!(
    process.env.S3_BUCKET &&
    process.env.AWS_ACCESS_KEY_ID &&
    process.env.AWS_SECRET_ACCESS_KEY
  );
}

/**
 * Validate file
 */
function validateFile(
  buffer: Buffer,
  contentType: string,
  options: UploadOptions
): { valid: boolean; error?: string } {
  // Check file size
  const maxSize = options.maxSize || maxFileSizes.default;
  if (buffer.length > maxSize) {
    return {
      valid: false,
      error: `File size exceeds limit of ${Math.round(maxSize / 1024 / 1024)}MB`,
    };
  }

  // Check file type
  const allowedTypes = options.allowedTypes || allowedFileTypes.images;
  if (!allowedTypes.includes('*/*') && !allowedTypes.includes(contentType)) {
    return {
      valid: false,
      error: `File type ${contentType} not allowed`,
    };
  }

  return { valid: true };
}

/**
 * Generate unique filename
 */
function generateFilename(originalName: string, folder?: string): { key: string; filename: string } {
  const ext = path.extname(originalName).toLowerCase();
  const timestamp = Date.now();
  const uuid = uuidv4().substring(0, 8);
  const filename = `${timestamp}-${uuid}${ext}`;
  const key = folder ? `${folder}/${filename}` : filename;

  return { key, filename };
}

/**
 * Upload file
 */
export async function uploadFile(
  buffer: Buffer,
  originalName: string,
  contentType: string,
  options: UploadOptions = {}
): Promise<UploadResult> {
  // Validate file
  const validation = validateFile(buffer, contentType, options);
  if (!validation.valid) {
    return { success: false, error: validation.error };
  }

  const config = getStorageConfig();
  const { key, filename } = generateFilename(options.filename || originalName, options.folder);

  try {
    if (config.provider === 's3' && isS3Configured()) {
      return await uploadToS3(config, key, buffer, contentType);
    } else {
      return await uploadToLocal(config, key, filename, buffer);
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error('File upload failed', { error: errorMessage });
    return { success: false, error: errorMessage };
  }
}

/**
 * Upload to local filesystem
 */
async function uploadToLocal(
  config: StorageConfig,
  key: string,
  filename: string,
  buffer: Buffer
): Promise<UploadResult> {
  const uploadDir = config.uploadDir || path.join(process.cwd(), 'uploads');
  const folder = path.dirname(key);
  const targetDir = folder !== '.' ? path.join(uploadDir, folder) : uploadDir;

  // Ensure directory exists
  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }

  const filePath = path.join(targetDir, filename);
  fs.writeFileSync(filePath, buffer);

  const url = `${config.publicUrl}/${key}`;

  logger.info('File uploaded to local storage', { key, size: buffer.length });

  return {
    success: true,
    url,
    key,
    size: buffer.length,
  };
}

/**
 * Upload to AWS S3
 */
async function uploadToS3(
  config: StorageConfig,
  key: string,
  buffer: Buffer,
  contentType: string
): Promise<UploadResult> {
  // In production, use @aws-sdk/client-s3
  const endpoint = `https://${config.s3Bucket}.s3.${config.s3Region}.amazonaws.com/${key}`;

  const response = await fetch(endpoint, {
    method: 'PUT',
    headers: {
      'Content-Type': contentType,
      'Content-Length': buffer.length.toString(),
      // Add AWS auth headers here
    },
    body: buffer,
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`S3 upload error: ${error}`);
  }

  const url = `https://${config.s3Bucket}.s3.${config.s3Region}.amazonaws.com/${key}`;

  logger.info('File uploaded to S3', { key, size: buffer.length });

  return {
    success: true,
    url,
    key,
    size: buffer.length,
  };
}

/**
 * Delete file
 */
export async function deleteFile(key: string): Promise<{ success: boolean; error?: string }> {
  const config = getStorageConfig();

  try {
    if (config.provider === 's3' && isS3Configured()) {
      return await deleteFromS3(config, key);
    } else {
      return await deleteFromLocal(config, key);
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error('File deletion failed', { error: errorMessage, key });
    return { success: false, error: errorMessage };
  }
}

/**
 * Delete from local filesystem
 */
async function deleteFromLocal(
  config: StorageConfig,
  key: string
): Promise<{ success: boolean; error?: string }> {
  const uploadDir = config.uploadDir || path.join(process.cwd(), 'uploads');
  const filePath = path.join(uploadDir, key);

  if (!fs.existsSync(filePath)) {
    return { success: false, error: 'File not found' };
  }

  fs.unlinkSync(filePath);
  logger.info('File deleted from local storage', { key });

  return { success: true };
}

/**
 * Delete from S3
 */
async function deleteFromS3(
  config: StorageConfig,
  key: string
): Promise<{ success: boolean; error?: string }> {
  const endpoint = `https://${config.s3Bucket}.s3.${config.s3Region}.amazonaws.com/${key}`;

  const response = await fetch(endpoint, {
    method: 'DELETE',
    headers: {
      // Add AWS auth headers here
    },
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`S3 delete error: ${error}`);
  }

  logger.info('File deleted from S3', { key });
  return { success: true };
}

/**
 * Get signed URL for temporary access (S3 only)
 */
export async function getSignedUrl(
  key: string,
  expiresIn: number = 3600
): Promise<{ success: boolean; url?: string; error?: string }> {
  const config = getStorageConfig();

  if (config.provider !== 's3' || !isS3Configured()) {
    // For local storage, just return the public URL
    const url = `${config.publicUrl}/${key}`;
    return { success: true, url };
  }

  try {
    // In production, use @aws-sdk/s3-request-presigner
    const url = `https://${config.s3Bucket}.s3.${config.s3Region}.amazonaws.com/${key}?expires=${expiresIn}`;
    return { success: true, url };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return { success: false, error: errorMessage };
  }
}

/**
 * Upload avatar image
 */
export async function uploadAvatar(
  buffer: Buffer,
  userId: string,
  contentType: string
): Promise<UploadResult> {
  return uploadFile(buffer, `${userId}.jpg`, contentType, {
    folder: 'avatars',
    maxSize: maxFileSizes.avatar,
    allowedTypes: allowedFileTypes.images,
  });
}

/**
 * Upload merchant logo
 */
export async function uploadMerchantLogo(
  buffer: Buffer,
  merchantId: string,
  contentType: string
): Promise<UploadResult> {
  return uploadFile(buffer, `${merchantId}.jpg`, contentType, {
    folder: 'merchants',
    maxSize: maxFileSizes.avatar,
    allowedTypes: allowedFileTypes.images,
  });
}

/**
 * Upload KYC document
 */
export async function uploadKYCDocument(
  buffer: Buffer,
  userId: string,
  documentType: string,
  contentType: string
): Promise<UploadResult> {
  return uploadFile(buffer, `${userId}-${documentType}.pdf`, contentType, {
    folder: 'kyc',
    maxSize: maxFileSizes.document,
    allowedTypes: [...allowedFileTypes.images, ...allowedFileTypes.documents],
  });
}

export default {
  isS3Configured,
  uploadFile,
  deleteFile,
  getSignedUrl,
  uploadAvatar,
  uploadMerchantLogo,
  uploadKYCDocument,
  allowedFileTypes,
  maxFileSizes,
};
