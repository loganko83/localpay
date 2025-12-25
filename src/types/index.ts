// ===========================================
// LocalPay Type Definitions
// ===========================================
// Payment Structure:
// - Prepaid Local Currency (NOT coins)
// - Charging: Bank account -> Prepaid balance
// - Usage: QR code OR linked prepaid card -> Deduct from balance
// - Limit: 3,000,000 KRW per prepaid operator regulations
// ===========================================

// User Types
export type UserType = 'consumer' | 'merchant' | 'admin';

export interface User {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  avatarUrl?: string;
  did?: string; // DID address for identity verification
  createdAt: string;
}

export interface ConsumerUser extends User {
  level: 'Bronze' | 'Silver' | 'Gold' | 'Platinum';
  linkedBankAccount?: LinkedBankAccount;
  prepaidCard?: PrepaidCard;
  kycVerified: boolean;
  kycVerifiedAt?: string;
}

export interface MerchantUser extends User {
  businessNumber: string;
  storeName: string;
  category: string;
  isVerified: boolean;
  merchantDid?: string;
  settlementAccount?: LinkedBankAccount;
}

export interface AdminUser extends User {
  role: 'super_admin' | 'admin' | 'operator' | 'viewer';
  permissions: AdminPermission[];
  adminDid?: string; // Required for audit trail signing
}

export type AdminPermission =
  | 'manage_users'
  | 'manage_merchants'
  | 'issue_vouchers'
  | 'process_settlements'
  | 'view_analytics'
  | 'view_audit_logs'
  | 'manage_policies'
  | 'system_config';

// ===========================================
// Bank Account & Prepaid Card Types
// ===========================================

export interface LinkedBankAccount {
  id: string;
  bankCode: string;
  bankName: string;
  accountNumber: string; // Masked: ****1234
  accountHolder: string;
  isVerified: boolean;
  verifiedAt?: string;
  isPrimary: boolean;
}

export interface PrepaidCard {
  id: string;
  cardNumber: string; // Masked: ****-****-****-1234
  cardType: 'physical' | 'virtual';
  issuer: string;
  status: 'active' | 'suspended' | 'expired';
  expiryDate: string;
  isLinked: boolean;
}

// ===========================================
// Wallet Types (Prepaid Local Currency)
// ===========================================
// IMPORTANT: balance is DISPLAY VALUE from Bank API
// We do NOT manage actual funds - Bank does

export interface Wallet {
  id: string;
  userId: string;
  balance: number; // Display value from Bank API (NOT our managed value)
  pendingBalance?: number;
  linkedBankAccount?: LinkedBankAccount;
  prepaidCard?: PrepaidCard;
  // Regulatory limits (prepaid operator regulations)
  chargeLimit: {
    daily: number;      // Max daily charge (default: 500,000)
    monthly: number;    // Max monthly charge (default: 2,000,000)
    total: number;      // Max total balance (default: 3,000,000)
    usedToday: number;
    usedThisMonth: number;
  };
  lastSyncedAt: string; // When balance was last synced with Bank
}

// Legacy support (will be removed)
export interface WalletCard {
  id: string;
  type: 'digital' | 'bank' | 'card';
  name: string;
  balance: number;
  lastFour?: string;
  isVerified: boolean;
}

// Transaction Types
export type TransactionType = 'payment' | 'topup' | 'refund' | 'transfer' | 'withdrawal';
export type TransactionStatus = 'pending' | 'confirmed' | 'completed' | 'failed';

export interface Transaction {
  id: string;
  txId: string;
  userId: string;
  merchantId?: string;
  merchantName?: string;
  customerName?: string;
  amount: number;
  type: TransactionType;
  status: TransactionStatus;
  createdAt: string;
}

// Merchant Types
export interface Merchant {
  id: string;
  name: string;
  businessNumber: string;
  category: string;
  description?: string;
  address: string;
  phone: string;
  email: string;
  imageUrl?: string;
  rating?: number;
  reviewCount?: number;
  isVerified: boolean;
  isOpen?: boolean;
  createdAt: string;
}

export interface Employee {
  id: string;
  merchantId: string;
  name: string;
  email: string;
  phone?: string;
  role: 'owner' | 'manager' | 'cashier';
  permissions: EmployeePermission[];
  status: 'active' | 'pending' | 'revoked';
  lastActiveAt?: string;
  avatarUrl?: string;
  createdAt: string;
}

export type EmployeePermission = 'full_access' | 'pos_only' | 'view_reports' | 'manage_staff';

// Admin Types
export interface PlatformStats {
  totalIssuance: number;
  activeUsers: number;
  activeMerchants: number;
  volume24h: number;
  pendingMerchants: number;
  blockHeight: number;
  systemHealth: 'healthy' | 'degraded' | 'unhealthy';
}

export interface Voucher {
  id: string;
  name: string;
  code: string;
  amount: number;
  type: 'welcome' | 'promo' | 'subsidy' | 'partner';
  usageLimit: number;
  usageCount: number;
  validFrom: string;
  validUntil: string;
  status: 'active' | 'paused' | 'expired';
  createdAt: string;
}

export interface SettlementBatch {
  id: string;
  batchNumber: string;
  merchantId: string;
  merchantName: string;
  amount: number;
  transactionCount: number;
  status: 'processing' | 'verified' | 'error' | 'completed';
  createdAt: string;
}

// ===========================================
// Audit & Blockchain Log Types (CRITICAL)
// ===========================================
// This is the MOST IMPORTANT feature for PoC
// Blockchain-based audit trail for compliance

export type AuditActionType =
  | 'USER_REGISTERED'
  | 'USER_KYC_VERIFIED'
  | 'BANK_ACCOUNT_LINKED'
  | 'PREPAID_CARD_ISSUED'
  | 'BALANCE_CHARGED'
  | 'PAYMENT_REQUESTED'
  | 'PAYMENT_COMPLETED'
  | 'REFUND_REQUESTED'
  | 'REFUND_COMPLETED'
  | 'MERCHANT_REGISTERED'
  | 'MERCHANT_VERIFIED'
  | 'MERCHANT_SUSPENDED'
  | 'POLICY_CREATED'
  | 'POLICY_UPDATED'
  | 'VOUCHER_ISSUED'
  | 'VOUCHER_REDEEMED'
  | 'SETTLEMENT_INITIATED'
  | 'SETTLEMENT_COMPLETED'
  | 'ADMIN_LOGIN'
  | 'ADMIN_ACTION'
  | 'SECURITY_ALERT';

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  action: AuditActionType;
  actorId: string;
  actorType: UserType;
  actorDid?: string;
  targetType: string;
  targetId: string;
  description: string;
  previousState?: Record<string, unknown>;
  newState?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
  // Blockchain anchoring
  blockchainHash?: string;
  blockNumber?: number;
  transactionHash?: string;
  // Digital signature
  signature?: string;
  signedBy?: string;
  // Verification status
  verified: boolean;
  verifiedAt?: string;
}

export interface AuditLogFilter {
  startDate?: string;
  endDate?: string;
  action?: AuditActionType;
  actorId?: string;
  actorType?: UserType;
  targetType?: string;
  targetId?: string;
  verified?: boolean;
}

export interface AuditStats {
  totalLogs: number;
  todayLogs: number;
  verifiedPercentage: number;
  actionCounts: Record<AuditActionType, number>;
  recentAlerts: AuditLogEntry[];
}

// ===========================================
// Security & Authentication Types
// ===========================================

export interface SecurityEvent {
  id: string;
  type: 'login_attempt' | 'login_success' | 'login_failure' | 'password_change' | 'suspicious_activity';
  userId: string;
  timestamp: string;
  ipAddress: string;
  userAgent: string;
  location?: string;
  risk: 'low' | 'medium' | 'high' | 'critical';
  handled: boolean;
}

export interface AuthSession {
  id: string;
  userId: string;
  userType: UserType;
  deviceId: string;
  ipAddress: string;
  createdAt: string;
  expiresAt: string;
  lastActiveAt: string;
  isActive: boolean;
}

// ===========================================
// Regional Coupon & Linked Services Types
// ===========================================

export interface RegionalCoupon {
  id: string;
  name: string;
  description: string;
  merchantId?: string;
  merchantName?: string;
  discountType: 'percentage' | 'fixed';
  discountValue: number;
  minPurchase?: number;
  maxDiscount?: number;
  validFrom: string;
  validUntil: string;
  usageLimit: number;
  usedCount: number;
  category: string;
  region: string;
  status: 'active' | 'expired' | 'exhausted';
  imageUrl?: string;
}

export interface LinkedService {
  id: string;
  name: string;
  description: string;
  provider: string;
  category: 'transport' | 'retail' | 'food' | 'culture' | 'welfare' | 'other';
  isEnabled: boolean;
  apiEndpoint?: string;
  iconUrl?: string;
}

// Navigation Types
export type ConsumerScreen = 'home' | 'wallet' | 'scan' | 'history' | 'profile' | 'coupons' | 'services';
export type MerchantScreen = 'dashboard' | 'wallet' | 'scan' | 'payments' | 'employees' | 'settings' | 'coupons';
export type AdminScreen = 'dashboard' | 'users' | 'vouchers' | 'settlements' | 'audit' | 'policies' | 'security';

// Theme Types
export interface ThemeConfig {
  primary: string;
  primaryDark: string;
  background: string;
  surface: string;
  surfaceHighlight: string;
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
}
