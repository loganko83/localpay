/**
 * Shared Loyalty Service
 *
 * Cross-merchant loyalty point system.
 * Small merchants share a unified loyalty program to compete with big chains.
 *
 * Features:
 * - Unified point accumulation across all participating merchants
 * - Tier-based benefits
 * - Point-to-LocalCurrency conversion
 * - Merchant alliance management
 *
 * DATA SOURCE CLASSIFICATION:
 * - [MOCK] Point storage, member data (in-memory)
 * - [REAL] Point calculation formulas (based on industry standards)
 * - [INTEGRATION READY] CRM systems, POS integration
 */

import { auditLogService } from './auditLog';

// ============================================
// [REAL] Loyalty program configuration
// Based on Korean loyalty program standards
// ============================================
const LOYALTY_CONFIG = {
  // Point earning rate (percentage of purchase)
  baseEarnRate: 0.01,           // 1% base earn rate
  premiumEarnRate: 0.02,        // 2% for premium members
  vipEarnRate: 0.03,            // 3% for VIP members

  // Tier thresholds (annual spending in KRW)
  tierThresholds: {
    BRONZE: 0,
    SILVER: 500000,             // 500K KRW
    GOLD: 2000000,              // 2M KRW
    PLATINUM: 5000000,          // 5M KRW
    VIP: 10000000,              // 10M KRW
  },

  // Point expiry
  pointExpiryMonths: 12,        // Points expire after 1 year
  minRedemptionPoints: 1000,    // Minimum 1000 points to redeem
  pointToKRW: 1,                // 1 point = 1 KRW

  // Alliance fee structure
  allianceFeeRate: 0.005,       // 0.5% fee from merchant to alliance fund
};

// Member tier
type MemberTier = 'BRONZE' | 'SILVER' | 'GOLD' | 'PLATINUM' | 'VIP';

// Loyalty member
interface LoyaltyMember {
  id: string;
  userId: string;
  joinedAt: number;
  currentTier: MemberTier;
  totalPoints: number;
  availablePoints: number;
  lifetimePoints: number;
  lifetimeSpending: number;
  annualSpending: number;
  lastActivityAt: number;
  pointHistory: PointTransaction[];
  preferredMerchants: string[];
  tierExpiryDate: number;
}

// Point transaction
interface PointTransaction {
  id: string;
  timestamp: number;
  type: 'EARN' | 'REDEEM' | 'EXPIRE' | 'BONUS' | 'TRANSFER';
  points: number;
  balanceAfter: number;
  merchantId?: string;
  merchantName?: string;
  purchaseAmount?: number;
  description: string;
  expiryDate?: number;
}

// Merchant alliance member
interface AllianceMerchant {
  id: string;
  merchantId: string;
  merchantName: string;
  category: string;
  joinedAt: number;
  isActive: boolean;
  customEarnRate?: number;      // Override default earn rate
  totalPointsIssued: number;
  totalPointsRedeemed: number;
  allianceFeePaid: number;
}

// Alliance statistics
interface AllianceStats {
  totalMembers: number;
  totalMerchants: number;
  totalPointsCirculating: number;
  totalPointsIssued: number;
  totalPointsRedeemed: number;
  membersByTier: Record<MemberTier, number>;
  topMerchants: Array<{ merchantId: string; name: string; pointsIssued: number }>;
}

// ============================================
// [MOCK] In-memory storage
// ============================================
const memberStore = new Map<string, LoyaltyMember>();
const allianceStore = new Map<string, AllianceMerchant>();

// Generate IDs
const generateMemberId = (): string => `LM-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`;
const generateTxId = (): string => `LTX-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`;

// Calculate tier based on annual spending
const calculateTier = (annualSpending: number): MemberTier => {
  const { tierThresholds } = LOYALTY_CONFIG;
  if (annualSpending >= tierThresholds.VIP) return 'VIP';
  if (annualSpending >= tierThresholds.PLATINUM) return 'PLATINUM';
  if (annualSpending >= tierThresholds.GOLD) return 'GOLD';
  if (annualSpending >= tierThresholds.SILVER) return 'SILVER';
  return 'BRONZE';
};

// Get earn rate for tier
const getEarnRateForTier = (tier: MemberTier): number => {
  switch (tier) {
    case 'VIP':
    case 'PLATINUM':
      return LOYALTY_CONFIG.vipEarnRate;
    case 'GOLD':
      return LOYALTY_CONFIG.premiumEarnRate;
    default:
      return LOYALTY_CONFIG.baseEarnRate;
  }
};

class SharedLoyaltyService {
  /**
   * [MOCK] Register merchant to alliance
   */
  registerMerchant(params: {
    merchantId: string;
    merchantName: string;
    category: string;
    customEarnRate?: number;
  }): AllianceMerchant {
    const alliance: AllianceMerchant = {
      id: `AM-${Date.now().toString(36)}`,
      merchantId: params.merchantId,
      merchantName: params.merchantName,
      category: params.category,
      joinedAt: Date.now(),
      isActive: true,
      customEarnRate: params.customEarnRate,
      totalPointsIssued: 0,
      totalPointsRedeemed: 0,
      allianceFeePaid: 0,
    };

    allianceStore.set(params.merchantId, alliance);
    return alliance;
  }

  /**
   * [MOCK] Enroll user in loyalty program
   */
  async enrollMember(userId: string): Promise<LoyaltyMember> {
    const existing = memberStore.get(userId);
    if (existing) return existing;

    const member: LoyaltyMember = {
      id: generateMemberId(),
      userId,
      joinedAt: Date.now(),
      currentTier: 'BRONZE',
      totalPoints: 0,
      availablePoints: 0,
      lifetimePoints: 0,
      lifetimeSpending: 0,
      annualSpending: 0,
      lastActivityAt: Date.now(),
      pointHistory: [],
      preferredMerchants: [],
      tierExpiryDate: Date.now() + 365 * 24 * 60 * 60 * 1000, // 1 year
    };

    memberStore.set(userId, member);

    await auditLogService.log({
      action: 'USER_REGISTERED',
      actorId: userId,
      actorType: 'consumer',
      targetType: 'loyalty_member',
      targetId: member.id,
      metadata: { tier: 'BRONZE' },
    });

    return member;
  }

  /**
   * [MOCK + REAL FORMULA] Earn points from purchase
   */
  async earnPoints(params: {
    userId: string;
    merchantId: string;
    purchaseAmount: number;
    transactionId: string;
  }): Promise<PointTransaction | null> {
    let member = memberStore.get(params.userId);
    if (!member) {
      member = await this.enrollMember(params.userId);
    }

    const merchant = allianceStore.get(params.merchantId);
    if (!merchant || !merchant.isActive) {
      console.warn('[SharedLoyalty] Merchant not in alliance');
      return null;
    }

    // [REAL FORMULA] Calculate points
    const earnRate = merchant.customEarnRate || getEarnRateForTier(member.currentTier);
    const pointsEarned = Math.floor(params.purchaseAmount * earnRate);

    if (pointsEarned <= 0) return null;

    const expiryDate = Date.now() + LOYALTY_CONFIG.pointExpiryMonths * 30 * 24 * 60 * 60 * 1000;

    const transaction: PointTransaction = {
      id: generateTxId(),
      timestamp: Date.now(),
      type: 'EARN',
      points: pointsEarned,
      balanceAfter: member.availablePoints + pointsEarned,
      merchantId: params.merchantId,
      merchantName: merchant.merchantName,
      purchaseAmount: params.purchaseAmount,
      description: `Points earned at ${merchant.merchantName}`,
      expiryDate,
    };

    // Update member
    member.totalPoints += pointsEarned;
    member.availablePoints += pointsEarned;
    member.lifetimePoints += pointsEarned;
    member.lifetimeSpending += params.purchaseAmount;
    member.annualSpending += params.purchaseAmount;
    member.lastActivityAt = Date.now();
    member.pointHistory.push(transaction);

    // Check tier upgrade
    const newTier = calculateTier(member.annualSpending);
    if (newTier !== member.currentTier) {
      member.currentTier = newTier;
      member.tierExpiryDate = Date.now() + 365 * 24 * 60 * 60 * 1000;
    }

    // Track preferred merchants
    if (!member.preferredMerchants.includes(params.merchantId)) {
      member.preferredMerchants.push(params.merchantId);
    }

    memberStore.set(params.userId, member);

    // Update merchant stats
    merchant.totalPointsIssued += pointsEarned;
    merchant.allianceFeePaid += params.purchaseAmount * LOYALTY_CONFIG.allianceFeeRate;
    allianceStore.set(params.merchantId, merchant);

    return transaction;
  }

  /**
   * [MOCK] Redeem points
   */
  async redeemPoints(params: {
    userId: string;
    merchantId: string;
    pointsToRedeem: number;
  }): Promise<{
    success: boolean;
    krwValue?: number;
    transaction?: PointTransaction;
    error?: string;
  }> {
    const member = memberStore.get(params.userId);
    if (!member) {
      return { success: false, error: 'Member not found' };
    }

    if (params.pointsToRedeem < LOYALTY_CONFIG.minRedemptionPoints) {
      return { success: false, error: `Minimum ${LOYALTY_CONFIG.minRedemptionPoints} points required` };
    }

    if (params.pointsToRedeem > member.availablePoints) {
      return { success: false, error: 'Insufficient points' };
    }

    const merchant = allianceStore.get(params.merchantId);
    if (!merchant || !merchant.isActive) {
      return { success: false, error: 'Merchant not in alliance' };
    }

    const krwValue = params.pointsToRedeem * LOYALTY_CONFIG.pointToKRW;

    const transaction: PointTransaction = {
      id: generateTxId(),
      timestamp: Date.now(),
      type: 'REDEEM',
      points: -params.pointsToRedeem,
      balanceAfter: member.availablePoints - params.pointsToRedeem,
      merchantId: params.merchantId,
      merchantName: merchant.merchantName,
      description: `Points redeemed at ${merchant.merchantName}`,
    };

    member.availablePoints -= params.pointsToRedeem;
    member.lastActivityAt = Date.now();
    member.pointHistory.push(transaction);
    memberStore.set(params.userId, member);

    // Update merchant stats
    merchant.totalPointsRedeemed += params.pointsToRedeem;
    allianceStore.set(params.merchantId, merchant);

    await auditLogService.log({
      action: 'PAYMENT_COMPLETED',
      actorId: params.userId,
      actorType: 'consumer',
      targetType: 'loyalty_redemption',
      targetId: transaction.id,
      metadata: {
        merchantId: params.merchantId,
        pointsRedeemed: params.pointsToRedeem,
        krwValue,
      },
    });

    return { success: true, krwValue, transaction };
  }

  /**
   * [MOCK] Process expired points
   */
  processExpiredPoints(userId: string): number {
    const member = memberStore.get(userId);
    if (!member) return 0;

    const now = Date.now();
    let expiredPoints = 0;

    // Find earned transactions that have expired
    const earnTransactions = member.pointHistory.filter(
      tx => tx.type === 'EARN' && tx.expiryDate && tx.expiryDate < now
    );

    for (const tx of earnTransactions) {
      // Calculate remaining points from this transaction
      // (simplified - in production would track partial usage)
      expiredPoints += Math.max(0, tx.points);
    }

    if (expiredPoints > 0 && expiredPoints <= member.availablePoints) {
      member.availablePoints -= expiredPoints;

      member.pointHistory.push({
        id: generateTxId(),
        timestamp: now,
        type: 'EXPIRE',
        points: -expiredPoints,
        balanceAfter: member.availablePoints,
        description: 'Points expired',
      });

      memberStore.set(userId, member);
    }

    return expiredPoints;
  }

  /**
   * Get member info
   */
  getMember(userId: string): LoyaltyMember | null {
    return memberStore.get(userId) || null;
  }

  /**
   * Get member tier benefits
   */
  getTierBenefits(tier: MemberTier): {
    earnRate: number;
    benefits: string[];
    nextTier: MemberTier | null;
    spendingToNextTier: number;
  } {
    const benefits: Record<MemberTier, string[]> = {
      BRONZE: ['1% point accumulation', 'Basic member benefits'],
      SILVER: ['1% point accumulation', 'Birthday bonus points', 'Monthly coupons'],
      GOLD: ['2% point accumulation', 'Priority customer service', 'Exclusive events'],
      PLATINUM: ['3% point accumulation', 'Free delivery', 'VIP lounge access'],
      VIP: ['3% point accumulation', 'Personal concierge', 'All premium benefits'],
    };

    const tierOrder: MemberTier[] = ['BRONZE', 'SILVER', 'GOLD', 'PLATINUM', 'VIP'];
    const currentIndex = tierOrder.indexOf(tier);
    const nextTier = currentIndex < tierOrder.length - 1 ? tierOrder[currentIndex + 1] : null;
    const nextThreshold = nextTier ? LOYALTY_CONFIG.tierThresholds[nextTier] : 0;

    return {
      earnRate: getEarnRateForTier(tier),
      benefits: benefits[tier],
      nextTier,
      spendingToNextTier: nextThreshold,
    };
  }

  /**
   * Get alliance statistics
   */
  getAllianceStats(): AllianceStats {
    const members = Array.from(memberStore.values());
    const merchants = Array.from(allianceStore.values()).filter(m => m.isActive);

    const membersByTier: Record<MemberTier, number> = {
      BRONZE: 0,
      SILVER: 0,
      GOLD: 0,
      PLATINUM: 0,
      VIP: 0,
    };

    let totalCirculating = 0;
    let totalIssued = 0;
    let totalRedeemed = 0;

    for (const member of members) {
      membersByTier[member.currentTier]++;
      totalCirculating += member.availablePoints;
    }

    for (const merchant of merchants) {
      totalIssued += merchant.totalPointsIssued;
      totalRedeemed += merchant.totalPointsRedeemed;
    }

    const topMerchants = merchants
      .sort((a, b) => b.totalPointsIssued - a.totalPointsIssued)
      .slice(0, 10)
      .map(m => ({
        merchantId: m.merchantId,
        name: m.merchantName,
        pointsIssued: m.totalPointsIssued,
      }));

    return {
      totalMembers: members.length,
      totalMerchants: merchants.length,
      totalPointsCirculating: totalCirculating,
      totalPointsIssued: totalIssued,
      totalPointsRedeemed: totalRedeemed,
      membersByTier,
      topMerchants,
    };
  }

  /**
   * Get configuration
   */
  getConfig(): typeof LOYALTY_CONFIG {
    return { ...LOYALTY_CONFIG };
  }
}

// Export singleton
export const sharedLoyaltyService = new SharedLoyaltyService();

// Export types
export type {
  LoyaltyMember,
  PointTransaction,
  AllianceMerchant,
  MemberTier,
  AllianceStats,
};
