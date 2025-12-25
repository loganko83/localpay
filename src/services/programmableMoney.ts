/**
 * Programmable Money Service
 *
 * Implements Purpose-Bound Money (PBM) - tokens with embedded spending rules.
 * Key feature of blockchain-based local currency.
 *
 * Features:
 * - Token metadata (MCC codes, regions, expiry)
 * - Spending restriction engine
 * - Auto-blocking for prohibited categories
 * - Expiry-based clawback
 *
 * DATA SOURCE CLASSIFICATION:
 * - [MOCK] Token storage, validation logic (in-memory simulation)
 * - [REAL] MCC codes reference (standard industry codes)
 * - [INTEGRATION READY] Bank API for actual fund management
 */

import { auditLogService } from './auditLog';

// ============================================
// [REAL] Standard MCC Code Categories
// These are actual Merchant Category Codes
// ============================================
export const MCC_CATEGORIES = {
  // Allowed for most policy funds
  GROCERY: ['5411', '5422', '5441', '5451', '5462'], // Grocery stores, meat markets, bakeries
  RESTAURANT: ['5812', '5813', '5814'], // Restaurants, bars, fast food
  PHARMACY: ['5912'], // Drug stores
  HOSPITAL: ['8011', '8021', '8031', '8041', '8042', '8043', '8049', '8050', '8062', '8071', '8099'],
  EDUCATION: ['8211', '8220', '8241', '8244', '8249', '8299'],
  TRADITIONAL_MARKET: ['5999'], // Miscellaneous retail (traditional markets)

  // Restricted categories
  LIQUOR: ['5921'], // Liquor stores
  GAMBLING: ['7995', '7800', '7801', '7802'], // Gambling, lottery
  ADULT: ['5967', '7273'], // Adult content
  LARGE_MART: ['5311', '5331'], // Department stores, large retailers
  LUXURY: ['5944', '5945', '5947'], // Jewelry, hobby, gift shops

  // Transportation
  TRANSPORT: ['4111', '4112', '4121', '4131', '4141'], // Bus, taxi, subway
  GAS_STATION: ['5541', '5542'], // Gas stations
};

// Policy fund types
export type PolicyFundType =
  | 'DISASTER_RELIEF'      // Disaster relief fund
  | 'CHILD_MEAL'           // Child meal support
  | 'YOUTH_ALLOWANCE'      // Youth employment allowance
  | 'SENIOR_WELFARE'       // Senior welfare fund
  | 'FARMER_SUPPORT'       // Farmer/agricultural support
  | 'TRADITIONAL_MARKET'   // Traditional market bonus
  | 'GENERAL';             // General local currency

// Token restriction rules
interface TokenRestriction {
  allowedMCC: string[];          // Allowed merchant categories
  blockedMCC: string[];          // Blocked merchant categories
  allowedRegions?: string[];     // Allowed regions (district codes)
  maxSingleTransaction?: number; // Max amount per transaction
  dailyLimit?: number;           // Daily spending limit
  expiryDate: number;            // Expiration timestamp
  bonusRate?: number;            // Bonus cashback rate (e.g., 0.05 = 5%)
}

// Programmable token
interface ProgrammableToken {
  id: string;
  userId: string;
  amount: number;
  fundType: PolicyFundType;
  restrictions: TokenRestriction;
  issuedAt: number;
  issuedBy: string;              // Issuing authority
  budgetCode?: string;           // Budget item code for tracking
  metadata?: Record<string, unknown>;
}

// Transaction validation result
interface ValidationResult {
  allowed: boolean;
  reason?: string;
  appliedBonus?: number;
  warnings?: string[];
}

// ============================================
// [MOCK] In-memory token storage
// Production: Use database + blockchain
// ============================================
const tokenStore = new Map<string, ProgrammableToken[]>();
const clawbackQueue: Array<{ tokenId: string; scheduledAt: number }> = [];

// ============================================
// [REAL] Policy fund templates
// Based on actual Korean local currency policies
// ============================================
const POLICY_TEMPLATES: Record<PolicyFundType, Omit<TokenRestriction, 'expiryDate'>> = {
  DISASTER_RELIEF: {
    allowedMCC: [
      ...MCC_CATEGORIES.GROCERY,
      ...MCC_CATEGORIES.RESTAURANT,
      ...MCC_CATEGORIES.PHARMACY,
      ...MCC_CATEGORIES.TRADITIONAL_MARKET,
    ],
    blockedMCC: [
      ...MCC_CATEGORIES.LIQUOR,
      ...MCC_CATEGORIES.GAMBLING,
      ...MCC_CATEGORIES.ADULT,
      ...MCC_CATEGORIES.LARGE_MART,
      ...MCC_CATEGORIES.LUXURY,
    ],
    maxSingleTransaction: 300000,
    dailyLimit: 500000,
    bonusRate: 0,
  },
  CHILD_MEAL: {
    allowedMCC: [
      ...MCC_CATEGORIES.GROCERY,
      ...MCC_CATEGORIES.RESTAURANT,
    ],
    blockedMCC: [
      ...MCC_CATEGORIES.LIQUOR,
      ...MCC_CATEGORIES.GAMBLING,
      ...MCC_CATEGORIES.ADULT,
    ],
    maxSingleTransaction: 50000,
    dailyLimit: 50000,
  },
  YOUTH_ALLOWANCE: {
    allowedMCC: [
      ...MCC_CATEGORIES.GROCERY,
      ...MCC_CATEGORIES.RESTAURANT,
      ...MCC_CATEGORIES.EDUCATION,
      ...MCC_CATEGORIES.TRANSPORT,
    ],
    blockedMCC: [
      ...MCC_CATEGORIES.LIQUOR,
      ...MCC_CATEGORIES.GAMBLING,
      ...MCC_CATEGORIES.ADULT,
    ],
    maxSingleTransaction: 200000,
    dailyLimit: 300000,
  },
  SENIOR_WELFARE: {
    allowedMCC: [
      ...MCC_CATEGORIES.GROCERY,
      ...MCC_CATEGORIES.RESTAURANT,
      ...MCC_CATEGORIES.PHARMACY,
      ...MCC_CATEGORIES.HOSPITAL,
    ],
    blockedMCC: [
      ...MCC_CATEGORIES.GAMBLING,
      ...MCC_CATEGORIES.ADULT,
    ],
    maxSingleTransaction: 100000,
    dailyLimit: 200000,
  },
  FARMER_SUPPORT: {
    allowedMCC: [
      ...MCC_CATEGORIES.GROCERY,
      ...MCC_CATEGORIES.RESTAURANT,
      ...MCC_CATEGORIES.GAS_STATION,
      ...MCC_CATEGORIES.TRADITIONAL_MARKET,
    ],
    blockedMCC: [
      ...MCC_CATEGORIES.GAMBLING,
      ...MCC_CATEGORIES.ADULT,
      ...MCC_CATEGORIES.LUXURY,
    ],
    maxSingleTransaction: 500000,
    dailyLimit: 1000000,
  },
  TRADITIONAL_MARKET: {
    allowedMCC: [...MCC_CATEGORIES.TRADITIONAL_MARKET],
    blockedMCC: [...MCC_CATEGORIES.LARGE_MART],
    bonusRate: 0.05, // 5% extra cashback
  },
  GENERAL: {
    allowedMCC: [], // All allowed
    blockedMCC: [
      ...MCC_CATEGORIES.GAMBLING,
      ...MCC_CATEGORIES.ADULT,
    ],
  },
};

// Generate token ID
const generateTokenId = (): string => {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 10);
  return `PBM-${timestamp}-${random}`;
};

class ProgrammableMoneyService {
  /**
   * [MOCK] Issue programmable tokens to user
   * Production: Integrate with bank API for actual fund allocation
   */
  async issueTokens(params: {
    userId: string;
    amount: number;
    fundType: PolicyFundType;
    expiryDays: number;
    issuedBy: string;
    budgetCode?: string;
    customRestrictions?: Partial<TokenRestriction>;
  }): Promise<ProgrammableToken> {
    const template = POLICY_TEMPLATES[params.fundType];
    const expiryDate = Date.now() + params.expiryDays * 24 * 60 * 60 * 1000;

    const token: ProgrammableToken = {
      id: generateTokenId(),
      userId: params.userId,
      amount: params.amount,
      fundType: params.fundType,
      restrictions: {
        ...template,
        expiryDate,
        ...params.customRestrictions,
      },
      issuedAt: Date.now(),
      issuedBy: params.issuedBy,
      budgetCode: params.budgetCode,
    };

    // Store token
    const userTokens = tokenStore.get(params.userId) || [];
    userTokens.push(token);
    tokenStore.set(params.userId, userTokens);

    // Schedule clawback
    clawbackQueue.push({ tokenId: token.id, scheduledAt: expiryDate });

    // Audit log
    await auditLogService.log({
      action: 'VOUCHER_CREATED',
      actorId: params.issuedBy,
      actorType: 'admin',
      targetType: 'token',
      targetId: token.id,
      metadata: {
        userId: params.userId,
        amount: params.amount,
        fundType: params.fundType,
        expiryDate: new Date(expiryDate).toISOString(),
        budgetCode: params.budgetCode,
      },
    });

    return token;
  }

  /**
   * [MOCK + REAL MCC] Validate transaction against token restrictions
   */
  validateTransaction(params: {
    userId: string;
    merchantMCC: string;
    merchantRegion?: string;
    amount: number;
    tokenId?: string;
  }): ValidationResult {
    const userTokens = tokenStore.get(params.userId);
    if (!userTokens || userTokens.length === 0) {
      return { allowed: false, reason: 'No tokens available' };
    }

    // Find applicable token (specific or best match)
    let token: ProgrammableToken | undefined;
    if (params.tokenId) {
      token = userTokens.find(t => t.id === params.tokenId);
    } else {
      // Find first valid token with sufficient balance
      token = userTokens.find(t =>
        t.amount >= params.amount &&
        t.restrictions.expiryDate > Date.now()
      );
    }

    if (!token) {
      return { allowed: false, reason: 'No suitable token found' };
    }

    const restrictions = token.restrictions;
    const warnings: string[] = [];

    // Check expiry
    if (Date.now() > restrictions.expiryDate) {
      return { allowed: false, reason: 'Token has expired' };
    }

    // Check blocked MCC
    if (restrictions.blockedMCC.includes(params.merchantMCC)) {
      return {
        allowed: false,
        reason: `Merchant category ${params.merchantMCC} is blocked for ${token.fundType}`,
      };
    }

    // Check allowed MCC (if specified)
    if (restrictions.allowedMCC.length > 0 &&
        !restrictions.allowedMCC.includes(params.merchantMCC)) {
      return {
        allowed: false,
        reason: `Merchant category ${params.merchantMCC} is not allowed for ${token.fundType}`,
      };
    }

    // Check region restriction
    if (restrictions.allowedRegions &&
        restrictions.allowedRegions.length > 0 &&
        params.merchantRegion &&
        !restrictions.allowedRegions.includes(params.merchantRegion)) {
      return {
        allowed: false,
        reason: 'Merchant is outside allowed region',
      };
    }

    // Check single transaction limit
    if (restrictions.maxSingleTransaction &&
        params.amount > restrictions.maxSingleTransaction) {
      return {
        allowed: false,
        reason: `Amount exceeds single transaction limit of ${restrictions.maxSingleTransaction.toLocaleString()} KRW`,
      };
    }

    // Check balance
    if (params.amount > token.amount) {
      return {
        allowed: false,
        reason: 'Insufficient token balance',
      };
    }

    // Calculate bonus if applicable
    let appliedBonus = 0;
    if (restrictions.bonusRate && restrictions.bonusRate > 0) {
      appliedBonus = Math.floor(params.amount * restrictions.bonusRate);
      warnings.push(`${(restrictions.bonusRate * 100).toFixed(0)}% bonus applied: +${appliedBonus.toLocaleString()} KRW`);
    }

    // Check if near expiry (warning)
    const daysUntilExpiry = (restrictions.expiryDate - Date.now()) / (24 * 60 * 60 * 1000);
    if (daysUntilExpiry < 7) {
      warnings.push(`Token expires in ${Math.ceil(daysUntilExpiry)} days`);
    }

    return {
      allowed: true,
      appliedBonus,
      warnings: warnings.length > 0 ? warnings : undefined,
    };
  }

  /**
   * [MOCK] Deduct from token after successful transaction
   */
  async deductToken(userId: string, tokenId: string, amount: number): Promise<boolean> {
    const userTokens = tokenStore.get(userId);
    if (!userTokens) return false;

    const tokenIndex = userTokens.findIndex(t => t.id === tokenId);
    if (tokenIndex === -1) return false;

    const token = userTokens[tokenIndex];
    if (token.amount < amount) return false;

    token.amount -= amount;

    // Remove if depleted
    if (token.amount <= 0) {
      userTokens.splice(tokenIndex, 1);
    }

    tokenStore.set(userId, userTokens);
    return true;
  }

  /**
   * [MOCK] Process expired token clawback
   * Production: Smart contract auto-executes this
   */
  async processClawback(): Promise<{
    processed: number;
    totalClawback: number;
  }> {
    const now = Date.now();
    let processed = 0;
    let totalClawback = 0;

    for (const [userId, tokens] of tokenStore.entries()) {
      const expiredTokens = tokens.filter(t => t.restrictions.expiryDate <= now);

      for (const token of expiredTokens) {
        if (token.amount > 0) {
          totalClawback += token.amount;
          processed++;

          await auditLogService.log({
            action: 'VOUCHER_EXPIRED',
            actorId: 'system',
            actorType: 'system',
            targetType: 'token',
            targetId: token.id,
            metadata: {
              userId,
              clawbackAmount: token.amount,
              fundType: token.fundType,
              budgetCode: token.budgetCode,
            },
          });
        }
      }

      // Remove expired tokens
      const activeTokens = tokens.filter(t => t.restrictions.expiryDate > now);
      tokenStore.set(userId, activeTokens);
    }

    return { processed, totalClawback };
  }

  /**
   * Get user's programmable tokens
   */
  getUserTokens(userId: string): ProgrammableToken[] {
    return tokenStore.get(userId) || [];
  }

  /**
   * Get token balance by fund type
   */
  getBalanceByFundType(userId: string): Record<PolicyFundType, number> {
    const tokens = tokenStore.get(userId) || [];
    const balances: Record<PolicyFundType, number> = {
      DISASTER_RELIEF: 0,
      CHILD_MEAL: 0,
      YOUTH_ALLOWANCE: 0,
      SENIOR_WELFARE: 0,
      FARMER_SUPPORT: 0,
      TRADITIONAL_MARKET: 0,
      GENERAL: 0,
    };

    for (const token of tokens) {
      if (token.restrictions.expiryDate > Date.now()) {
        balances[token.fundType] += token.amount;
      }
    }

    return balances;
  }

  /**
   * [REAL] Get MCC category name
   */
  getMCCCategoryName(mcc: string): string {
    for (const [category, codes] of Object.entries(MCC_CATEGORIES)) {
      if (codes.includes(mcc)) {
        return category;
      }
    }
    return 'OTHER';
  }

  /**
   * Check if MCC is restricted for fund type
   */
  isMCCRestricted(mcc: string, fundType: PolicyFundType): boolean {
    const template = POLICY_TEMPLATES[fundType];
    return template.blockedMCC.includes(mcc);
  }
}

// Export singleton
export const programmableMoneyService = new ProgrammableMoneyService();

// Export types
export type { ProgrammableToken, TokenRestriction, ValidationResult };
