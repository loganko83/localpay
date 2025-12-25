/**
 * Token Lifecycle Service
 *
 * Tracks the complete lifecycle of local currency tokens:
 * - Minting (issuance from budget)
 * - Circulation (transfers between users/merchants)
 * - Burning (expiry, clawback, redemption)
 *
 * Key Metrics:
 * - Multiplier Effect: How many times money circulates in local economy
 * - Velocity: Speed of money circulation
 * - Leakage: Funds leaving the local economy
 *
 * DATA SOURCE CLASSIFICATION:
 * - [MOCK] Token tracking, lifecycle events (in-memory)
 * - [REAL] Calculation formulas (standard economic metrics)
 * - [INTEGRATION READY] Blockchain for immutable tracking
 */

import { auditLogService } from './auditLog';
import { blockchainAnchoringService } from './blockchainAnchoring';

// Lifecycle stages
type LifecycleStage = 'MINTED' | 'CIRCULATING' | 'BURNED' | 'CLAWBACK';

// Token event types
type TokenEventType =
  | 'MINT'           // Initial issuance
  | 'TRANSFER'       // User to merchant or P2P
  | 'SETTLE'         // Merchant settlement
  | 'REDEEM'         // Convert to KRW
  | 'EXPIRE'         // Time-based expiry
  | 'CLAWBACK'       // Forced return to issuer
  | 'BURN';          // Final destruction

// Token lifecycle event
interface TokenEvent {
  id: string;
  tokenId: string;
  eventType: TokenEventType;
  timestamp: number;
  fromEntity: string;      // DID or ID of sender
  toEntity: string;        // DID or ID of receiver
  amount: number;
  metadata?: {
    budgetCode?: string;
    merchantId?: string;
    transactionId?: string;
    reason?: string;
  };
  blockchainTxHash?: string;
}

// Token with full history
interface TrackedToken {
  id: string;
  originalAmount: number;
  currentAmount: number;
  stage: LifecycleStage;
  mintedAt: number;
  mintedBy: string;
  budgetCode: string;
  budgetYear: number;
  currentHolder: string;
  events: TokenEvent[];
  circulationCount: number;  // Number of transfers
  burnedAt?: number;
  burnReason?: string;
}

// Circulation metrics
interface CirculationMetrics {
  totalMinted: number;
  totalCirculating: number;
  totalBurned: number;
  totalClawback: number;
  averageCirculationCount: number;
  velocityPerDay: number;
  multiplierEffect: number;
  regionalDistribution: Record<string, number>;
  merchantCategoryDistribution: Record<string, number>;
}

// Budget tracking
interface BudgetTracking {
  budgetCode: string;
  budgetYear: number;
  allocatedAmount: number;
  issuedAmount: number;
  circulatingAmount: number;
  redeemedAmount: number;
  clawbackAmount: number;
  utilizationRate: number;
}

// ============================================
// [MOCK] In-memory storage
// Production: Database + Blockchain
// ============================================
const tokenRegistry = new Map<string, TrackedToken>();
const eventLog: TokenEvent[] = [];
const budgetTracker = new Map<string, BudgetTracking>();

// Generate unique IDs
const generateEventId = (): string => `EVT-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`;
const generateTokenId = (): string => `TKN-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 8)}`;

class TokenLifecycleService {
  /**
   * [MOCK] Mint new tokens from budget allocation
   * Production: Triggered by bank API + blockchain mint
   */
  async mint(params: {
    amount: number;
    budgetCode: string;
    budgetYear: number;
    issuerId: string;
    recipientId: string;
    metadata?: Record<string, unknown>;
  }): Promise<TrackedToken> {
    const tokenId = generateTokenId();
    const now = Date.now();

    const token: TrackedToken = {
      id: tokenId,
      originalAmount: params.amount,
      currentAmount: params.amount,
      stage: 'MINTED',
      mintedAt: now,
      mintedBy: params.issuerId,
      budgetCode: params.budgetCode,
      budgetYear: params.budgetYear,
      currentHolder: params.recipientId,
      events: [],
      circulationCount: 0,
    };

    // Record mint event
    const mintEvent: TokenEvent = {
      id: generateEventId(),
      tokenId,
      eventType: 'MINT',
      timestamp: now,
      fromEntity: params.issuerId,
      toEntity: params.recipientId,
      amount: params.amount,
      metadata: {
        budgetCode: params.budgetCode,
      },
    };

    token.events.push(mintEvent);
    eventLog.push(mintEvent);
    tokenRegistry.set(tokenId, token);

    // Update budget tracking
    this.updateBudgetTracking(params.budgetCode, params.budgetYear, 'mint', params.amount);

    // Anchor to blockchain
    const anchorResult = await blockchainAnchoringService.addTransaction(
      tokenId,
      'topup',
      { event: 'MINT', amount: params.amount, recipient: params.recipientId }
    );
    mintEvent.blockchainTxHash = anchorResult.hash;

    // Audit log
    await auditLogService.log({
      action: 'TOPUP_COMPLETED',
      actorId: params.issuerId,
      actorType: 'admin',
      targetType: 'token',
      targetId: tokenId,
      metadata: {
        amount: params.amount,
        budgetCode: params.budgetCode,
        recipient: params.recipientId,
      },
    });

    return token;
  }

  /**
   * [MOCK] Record transfer event (circulation)
   */
  async recordTransfer(params: {
    tokenId: string;
    fromEntity: string;
    toEntity: string;
    amount: number;
    transactionId: string;
    merchantId?: string;
  }): Promise<TokenEvent | null> {
    const token = tokenRegistry.get(params.tokenId);
    if (!token) return null;

    const event: TokenEvent = {
      id: generateEventId(),
      tokenId: params.tokenId,
      eventType: 'TRANSFER',
      timestamp: Date.now(),
      fromEntity: params.fromEntity,
      toEntity: params.toEntity,
      amount: params.amount,
      metadata: {
        transactionId: params.transactionId,
        merchantId: params.merchantId,
      },
    };

    token.events.push(event);
    token.currentHolder = params.toEntity;
    token.circulationCount++;
    token.stage = 'CIRCULATING';

    eventLog.push(event);
    tokenRegistry.set(params.tokenId, token);

    // Anchor to blockchain
    const anchorResult = await blockchainAnchoringService.addTransaction(
      event.id,
      'payment',
      { from: params.fromEntity, to: params.toEntity, amount: params.amount }
    );
    event.blockchainTxHash = anchorResult.hash;

    return event;
  }

  /**
   * [MOCK] Burn tokens (redemption or expiry)
   */
  async burn(params: {
    tokenId: string;
    reason: 'REDEEM' | 'EXPIRE' | 'CLAWBACK';
    amount: number;
    executorId: string;
  }): Promise<TokenEvent | null> {
    const token = tokenRegistry.get(params.tokenId);
    if (!token) return null;

    const eventType: TokenEventType = params.reason === 'CLAWBACK' ? 'CLAWBACK' :
                                       params.reason === 'EXPIRE' ? 'EXPIRE' : 'BURN';

    const event: TokenEvent = {
      id: generateEventId(),
      tokenId: params.tokenId,
      eventType,
      timestamp: Date.now(),
      fromEntity: token.currentHolder,
      toEntity: params.reason === 'CLAWBACK' ? token.mintedBy : 'BURNED',
      amount: params.amount,
      metadata: { reason: params.reason },
    };

    token.events.push(event);
    token.currentAmount -= params.amount;
    token.stage = params.reason === 'CLAWBACK' ? 'CLAWBACK' : 'BURNED';
    token.burnedAt = Date.now();
    token.burnReason = params.reason;

    eventLog.push(event);
    tokenRegistry.set(params.tokenId, token);

    // Update budget tracking
    const trackingKey = params.reason === 'CLAWBACK' ? 'clawback' : 'redeem';
    this.updateBudgetTracking(token.budgetCode, token.budgetYear, trackingKey, params.amount);

    return event;
  }

  /**
   * [MOCK + REAL FORMULAS] Calculate circulation metrics
   * Formulas are standard economic metrics
   */
  calculateMetrics(params?: {
    budgetCode?: string;
    startDate?: number;
    endDate?: number;
  }): CirculationMetrics {
    let tokens = Array.from(tokenRegistry.values());
    let events = [...eventLog];

    // Filter by budget code if specified
    if (params?.budgetCode) {
      tokens = tokens.filter(t => t.budgetCode === params.budgetCode);
      const tokenIds = new Set(tokens.map(t => t.id));
      events = events.filter(e => tokenIds.has(e.tokenId));
    }

    // Filter by date range
    if (params?.startDate) {
      events = events.filter(e => e.timestamp >= params.startDate!);
    }
    if (params?.endDate) {
      events = events.filter(e => e.timestamp <= params.endDate!);
    }

    // Calculate totals
    const totalMinted = tokens.reduce((sum, t) => sum + t.originalAmount, 0);
    const totalCirculating = tokens
      .filter(t => t.stage === 'CIRCULATING' || t.stage === 'MINTED')
      .reduce((sum, t) => sum + t.currentAmount, 0);
    const totalBurned = tokens
      .filter(t => t.stage === 'BURNED')
      .reduce((sum, t) => sum + (t.originalAmount - t.currentAmount), 0);
    const totalClawback = tokens
      .filter(t => t.stage === 'CLAWBACK')
      .reduce((sum, t) => sum + (t.originalAmount - t.currentAmount), 0);

    // [REAL FORMULA] Average circulation count
    const avgCirculation = tokens.length > 0
      ? tokens.reduce((sum, t) => sum + t.circulationCount, 0) / tokens.length
      : 0;

    // [REAL FORMULA] Velocity = Total transaction volume / Average circulating supply
    const transferEvents = events.filter(e => e.eventType === 'TRANSFER');
    const totalTransactionVolume = transferEvents.reduce((sum, e) => sum + e.amount, 0);
    const timePeriodDays = params?.startDate && params?.endDate
      ? (params.endDate - params.startDate) / (24 * 60 * 60 * 1000)
      : 30; // Default 30 days
    const velocityPerDay = totalCirculating > 0
      ? (totalTransactionVolume / totalCirculating) / timePeriodDays
      : 0;

    // [REAL FORMULA] Multiplier Effect = Total economic activity / Initial injection
    // Simplified: 1 + (total transfers / total minted)
    const multiplierEffect = totalMinted > 0
      ? 1 + (totalTransactionVolume / totalMinted)
      : 1;

    // Regional distribution (mock data structure)
    const regionalDistribution: Record<string, number> = {};
    const merchantCategoryDistribution: Record<string, number> = {};

    return {
      totalMinted,
      totalCirculating,
      totalBurned,
      totalClawback,
      averageCirculationCount: Math.round(avgCirculation * 100) / 100,
      velocityPerDay: Math.round(velocityPerDay * 1000) / 1000,
      multiplierEffect: Math.round(multiplierEffect * 100) / 100,
      regionalDistribution,
      merchantCategoryDistribution,
    };
  }

  /**
   * Get token full history
   */
  getTokenHistory(tokenId: string): TrackedToken | null {
    return tokenRegistry.get(tokenId) || null;
  }

  /**
   * Get budget tracking summary
   */
  getBudgetSummary(budgetCode: string, budgetYear: number): BudgetTracking | null {
    const key = `${budgetCode}-${budgetYear}`;
    return budgetTracker.get(key) || null;
  }

  /**
   * [MOCK] Update budget tracking
   */
  private updateBudgetTracking(
    budgetCode: string,
    budgetYear: number,
    action: 'mint' | 'redeem' | 'clawback',
    amount: number
  ): void {
    const key = `${budgetCode}-${budgetYear}`;
    let tracking = budgetTracker.get(key);

    if (!tracking) {
      tracking = {
        budgetCode,
        budgetYear,
        allocatedAmount: 0,
        issuedAmount: 0,
        circulatingAmount: 0,
        redeemedAmount: 0,
        clawbackAmount: 0,
        utilizationRate: 0,
      };
    }

    switch (action) {
      case 'mint':
        tracking.issuedAmount += amount;
        tracking.circulatingAmount += amount;
        break;
      case 'redeem':
        tracking.redeemedAmount += amount;
        tracking.circulatingAmount -= amount;
        break;
      case 'clawback':
        tracking.clawbackAmount += amount;
        tracking.circulatingAmount -= amount;
        break;
    }

    tracking.utilizationRate = tracking.allocatedAmount > 0
      ? tracking.redeemedAmount / tracking.allocatedAmount
      : 0;

    budgetTracker.set(key, tracking);
  }

  /**
   * Get all events for analytics
   */
  getEventLog(params?: {
    tokenId?: string;
    eventType?: TokenEventType;
    startDate?: number;
    endDate?: number;
    limit?: number;
  }): TokenEvent[] {
    let events = [...eventLog];

    if (params?.tokenId) {
      events = events.filter(e => e.tokenId === params.tokenId);
    }
    if (params?.eventType) {
      events = events.filter(e => e.eventType === params.eventType);
    }
    if (params?.startDate) {
      events = events.filter(e => e.timestamp >= params.startDate!);
    }
    if (params?.endDate) {
      events = events.filter(e => e.timestamp <= params.endDate!);
    }

    events.sort((a, b) => b.timestamp - a.timestamp);

    if (params?.limit) {
      events = events.slice(0, params.limit);
    }

    return events;
  }
}

// Export singleton
export const tokenLifecycleService = new TokenLifecycleService();

// Export types
export type {
  TrackedToken,
  TokenEvent,
  TokenEventType,
  LifecycleStage,
  CirculationMetrics,
  BudgetTracking,
};
