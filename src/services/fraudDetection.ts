/**
 * Fraud Detection Service
 *
 * Provides real-time fraud detection for local currency transactions:
 * - Cash-out pattern detection (현금화 탐지)
 * - Velocity checks (rapid transactions)
 * - Geographic anomaly detection
 * - Unusual amount patterns
 *
 * Target: Reduce cash-out rate from 30% to < 5%
 *
 * Architecture Note:
 * This is a rule-based system for PoC.
 * In production, integrate ML models for advanced pattern detection.
 */

import { auditLogService } from './auditLog';

// Risk score thresholds
const RISK_THRESHOLDS = {
  LOW: 30,
  MEDIUM: 60,
  HIGH: 80,
  CRITICAL: 95,
};

// Transaction patterns for analysis
interface TransactionPattern {
  userId: string;
  merchantId: string;
  amount: number;
  timestamp: string;
  location?: { lat: number; lng: number };
  merchantCategory?: string;
}

// Risk assessment result
interface RiskAssessment {
  score: number;
  level: 'low' | 'medium' | 'high' | 'critical';
  factors: RiskFactor[];
  recommendation: 'approve' | 'review' | 'block';
  blockReason?: string;
}

// Individual risk factor
interface RiskFactor {
  type: string;
  score: number;
  description: string;
  details?: Record<string, unknown>;
}

// User transaction history for analysis
interface UserTransactionHistory {
  userId: string;
  transactions: TransactionPattern[];
  dailyTotal: number;
  weeklyTotal: number;
  monthlyTotal: number;
  uniqueMerchants: Set<string>;
  lastTransactionTime?: number;
}

// In-memory transaction history (use Redis in production)
const transactionHistory = new Map<string, UserTransactionHistory>();

// Known cash-out merchant patterns
const CASHOUT_INDICATORS = {
  // Merchant categories commonly used for cash-out
  suspiciousCategories: ['convenience_store', 'atm', 'money_transfer'],
  // Round amounts often indicate cash-out
  roundAmounts: [10000, 50000, 100000, 200000, 500000],
  // Threshold for same merchant repeated transactions
  sameVendorThreshold: 3,
  // Time window for velocity check (ms)
  velocityWindow: 3600000, // 1 hour
  // Max transactions in velocity window
  velocityLimit: 5,
  // Geographic distance threshold (km)
  geoThreshold: 50,
  // Time required to travel (minutes per km)
  travelTimePerKm: 2,
};

// Calculate risk score for a transaction
const calculateRiskScore = (factors: RiskFactor[]): number => {
  if (factors.length === 0) return 0;

  // Weighted average with max cap
  const totalScore = factors.reduce((sum, f) => sum + f.score, 0);
  return Math.min(totalScore, 100);
};

// Get risk level from score
const getRiskLevel = (score: number): RiskAssessment['level'] => {
  if (score >= RISK_THRESHOLDS.CRITICAL) return 'critical';
  if (score >= RISK_THRESHOLDS.HIGH) return 'high';
  if (score >= RISK_THRESHOLDS.MEDIUM) return 'medium';
  return 'low';
};

// Get recommendation based on risk level
const getRecommendation = (level: RiskAssessment['level']): RiskAssessment['recommendation'] => {
  switch (level) {
    case 'critical':
      return 'block';
    case 'high':
      return 'review';
    case 'medium':
      return 'review';
    default:
      return 'approve';
  }
};

// Calculate geographic distance between two points (Haversine formula)
const calculateDistance = (
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number => {
  const R = 6371; // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

class FraudDetectionService {
  /**
   * Analyze transaction for fraud risk
   */
  async analyzeTransaction(transaction: TransactionPattern): Promise<RiskAssessment> {
    const factors: RiskFactor[] = [];

    // Get or create user history
    let history = transactionHistory.get(transaction.userId);
    if (!history) {
      history = {
        userId: transaction.userId,
        transactions: [],
        dailyTotal: 0,
        weeklyTotal: 0,
        monthlyTotal: 0,
        uniqueMerchants: new Set(),
      };
      transactionHistory.set(transaction.userId, history);
    }

    // Run all risk checks
    factors.push(...this.checkRoundAmount(transaction));
    factors.push(...this.checkVelocity(transaction, history));
    factors.push(...this.checkSameMerchant(transaction, history));
    factors.push(...this.checkGeographicAnomaly(transaction, history));
    factors.push(...this.checkAmountPattern(transaction, history));
    factors.push(...this.checkSuspiciousCategory(transaction));
    factors.push(...this.checkTimePattern(transaction));

    // Calculate final score
    const score = calculateRiskScore(factors);
    const level = getRiskLevel(score);
    const recommendation = getRecommendation(level);

    const assessment: RiskAssessment = {
      score,
      level,
      factors,
      recommendation,
    };

    // Set block reason if blocking
    if (recommendation === 'block') {
      const topFactor = factors.sort((a, b) => b.score - a.score)[0];
      assessment.blockReason = topFactor?.description || 'Suspicious transaction pattern detected';
    }

    // Log risk assessment
    await auditLogService.log({
      action: 'FRAUD_CHECK',
      actorId: transaction.userId,
      actorType: 'consumer',
      targetType: 'transaction',
      targetId: `${transaction.merchantId}-${transaction.timestamp}`,
      metadata: {
        amount: transaction.amount,
        merchantId: transaction.merchantId,
        riskScore: score,
        riskLevel: level,
        recommendation,
        factorCount: factors.length,
        topFactors: factors.slice(0, 3).map(f => f.type),
      },
    });

    // Update history if transaction is approved
    if (recommendation === 'approve') {
      this.updateHistory(transaction, history);
    }

    return assessment;
  }

  /**
   * Check for round amount patterns (cash-out indicator)
   */
  private checkRoundAmount(transaction: TransactionPattern): RiskFactor[] {
    const factors: RiskFactor[] = [];
    const amount = transaction.amount;

    // Check if amount is suspiciously round
    if (CASHOUT_INDICATORS.roundAmounts.includes(amount)) {
      factors.push({
        type: 'round_amount',
        score: 15,
        description: 'Transaction amount is a common cash-out denomination',
        details: { amount },
      });
    }

    // Check if amount ends in 0000
    if (amount >= 10000 && amount % 10000 === 0) {
      factors.push({
        type: 'round_amount_pattern',
        score: 10,
        description: 'Transaction amount is perfectly round',
        details: { amount },
      });
    }

    return factors;
  }

  /**
   * Check transaction velocity
   */
  private checkVelocity(
    transaction: TransactionPattern,
    history: UserTransactionHistory
  ): RiskFactor[] {
    const factors: RiskFactor[] = [];
    const now = new Date(transaction.timestamp).getTime();
    const windowStart = now - CASHOUT_INDICATORS.velocityWindow;

    // Count recent transactions
    const recentTx = history.transactions.filter(
      tx => new Date(tx.timestamp).getTime() > windowStart
    );

    if (recentTx.length >= CASHOUT_INDICATORS.velocityLimit) {
      factors.push({
        type: 'high_velocity',
        score: 25,
        description: `${recentTx.length} transactions in the last hour exceeds limit`,
        details: {
          count: recentTx.length,
          limit: CASHOUT_INDICATORS.velocityLimit,
          window: '1 hour',
        },
      });
    }

    // Check time since last transaction
    if (history.lastTransactionTime) {
      const timeSinceLastTx = now - history.lastTransactionTime;
      if (timeSinceLastTx < 60000) { // Less than 1 minute
        factors.push({
          type: 'rapid_transactions',
          score: 20,
          description: 'Transaction within 1 minute of previous transaction',
          details: { timeSinceLastMs: timeSinceLastTx },
        });
      }
    }

    return factors;
  }

  /**
   * Check for repeated same merchant transactions
   */
  private checkSameMerchant(
    transaction: TransactionPattern,
    history: UserTransactionHistory
  ): RiskFactor[] {
    const factors: RiskFactor[] = [];
    const today = new Date(transaction.timestamp).toDateString();

    // Count same merchant transactions today
    const sameMerchantToday = history.transactions.filter(
      tx =>
        tx.merchantId === transaction.merchantId &&
        new Date(tx.timestamp).toDateString() === today
    ).length;

    if (sameMerchantToday >= CASHOUT_INDICATORS.sameVendorThreshold) {
      factors.push({
        type: 'same_merchant_repeat',
        score: 30,
        description: `${sameMerchantToday + 1} transactions at same merchant today`,
        details: {
          merchantId: transaction.merchantId,
          count: sameMerchantToday + 1,
          threshold: CASHOUT_INDICATORS.sameVendorThreshold,
        },
      });
    }

    return factors;
  }

  /**
   * Check for geographic anomalies
   */
  private checkGeographicAnomaly(
    transaction: TransactionPattern,
    history: UserTransactionHistory
  ): RiskFactor[] {
    const factors: RiskFactor[] = [];

    if (!transaction.location) return factors;

    // Get last transaction with location
    const lastTxWithLocation = [...history.transactions]
      .reverse()
      .find(tx => tx.location);

    if (lastTxWithLocation?.location) {
      const distance = calculateDistance(
        lastTxWithLocation.location.lat,
        lastTxWithLocation.location.lng,
        transaction.location.lat,
        transaction.location.lng
      );

      const timeDiff =
        (new Date(transaction.timestamp).getTime() -
          new Date(lastTxWithLocation.timestamp).getTime()) /
        60000; // minutes

      const expectedTravelTime = distance * CASHOUT_INDICATORS.travelTimePerKm;

      if (distance > CASHOUT_INDICATORS.geoThreshold && timeDiff < expectedTravelTime) {
        factors.push({
          type: 'geographic_anomaly',
          score: 35,
          description: `Impossible travel: ${distance.toFixed(1)}km in ${timeDiff.toFixed(0)} minutes`,
          details: {
            distance: distance.toFixed(1),
            timeDiff: timeDiff.toFixed(0),
            expectedMinutes: expectedTravelTime.toFixed(0),
          },
        });
      }
    }

    return factors;
  }

  /**
   * Check amount patterns
   */
  private checkAmountPattern(
    transaction: TransactionPattern,
    history: UserTransactionHistory
  ): RiskFactor[] {
    const factors: RiskFactor[] = [];

    // Check if amount is significantly higher than average
    if (history.transactions.length >= 5) {
      const avgAmount =
        history.transactions.reduce((sum, tx) => sum + tx.amount, 0) /
        history.transactions.length;

      if (transaction.amount > avgAmount * 5) {
        factors.push({
          type: 'unusual_amount',
          score: 20,
          description: 'Transaction amount is 5x higher than user average',
          details: {
            amount: transaction.amount,
            average: Math.round(avgAmount),
            multiple: (transaction.amount / avgAmount).toFixed(1),
          },
        });
      }
    }

    // Check daily total approaching limit
    const dailyRemaining = 500000 - history.dailyTotal;
    if (transaction.amount > dailyRemaining * 0.9 && transaction.amount <= dailyRemaining) {
      factors.push({
        type: 'limit_testing',
        score: 15,
        description: 'Transaction amount approaches daily limit exactly',
        details: {
          amount: transaction.amount,
          dailyTotal: history.dailyTotal,
          dailyLimit: 500000,
        },
      });
    }

    return factors;
  }

  /**
   * Check for suspicious merchant category
   */
  private checkSuspiciousCategory(transaction: TransactionPattern): RiskFactor[] {
    const factors: RiskFactor[] = [];

    if (
      transaction.merchantCategory &&
      CASHOUT_INDICATORS.suspiciousCategories.includes(transaction.merchantCategory)
    ) {
      factors.push({
        type: 'suspicious_category',
        score: 20,
        description: `Merchant category (${transaction.merchantCategory}) commonly used for cash-out`,
        details: { category: transaction.merchantCategory },
      });
    }

    return factors;
  }

  /**
   * Check time pattern (late night transactions)
   */
  private checkTimePattern(transaction: TransactionPattern): RiskFactor[] {
    const factors: RiskFactor[] = [];
    const hour = new Date(transaction.timestamp).getHours();

    // Late night transactions (midnight to 5 AM)
    if (hour >= 0 && hour < 5) {
      factors.push({
        type: 'late_night_transaction',
        score: 10,
        description: 'Transaction during unusual hours (midnight to 5 AM)',
        details: { hour },
      });
    }

    return factors;
  }

  /**
   * Update user transaction history
   */
  private updateHistory(
    transaction: TransactionPattern,
    history: UserTransactionHistory
  ): void {
    const now = new Date(transaction.timestamp).getTime();
    const today = new Date().toDateString();

    // Add transaction
    history.transactions.push(transaction);

    // Keep only last 100 transactions
    if (history.transactions.length > 100) {
      history.transactions = history.transactions.slice(-100);
    }

    // Update totals
    history.dailyTotal += transaction.amount;
    history.weeklyTotal += transaction.amount;
    history.monthlyTotal += transaction.amount;

    // Update unique merchants
    history.uniqueMerchants.add(transaction.merchantId);

    // Update last transaction time
    history.lastTransactionTime = now;

    // Reset daily total at midnight (simplified)
    const lastTxDate = history.transactions.length > 1
      ? new Date(history.transactions[history.transactions.length - 2].timestamp).toDateString()
      : today;

    if (lastTxDate !== today) {
      history.dailyTotal = transaction.amount;
    }
  }

  /**
   * Get user risk profile
   */
  getUserRiskProfile(userId: string): {
    transactionCount: number;
    averageAmount: number;
    uniqueMerchants: number;
    dailyTotal: number;
    weeklyTotal: number;
    riskScore: number;
  } | null {
    const history = transactionHistory.get(userId);
    if (!history || history.transactions.length === 0) return null;

    const avgAmount =
      history.transactions.reduce((sum, tx) => sum + tx.amount, 0) /
      history.transactions.length;

    // Calculate base risk score from patterns
    const roundAmountCount = history.transactions.filter(tx =>
      CASHOUT_INDICATORS.roundAmounts.includes(tx.amount)
    ).length;

    const roundAmountRatio = roundAmountCount / history.transactions.length;
    const riskScore = Math.min(roundAmountRatio * 50 + (history.uniqueMerchants.size < 3 ? 20 : 0), 100);

    return {
      transactionCount: history.transactions.length,
      averageAmount: Math.round(avgAmount),
      uniqueMerchants: history.uniqueMerchants.size,
      dailyTotal: history.dailyTotal,
      weeklyTotal: history.weeklyTotal,
      riskScore: Math.round(riskScore),
    };
  }

  /**
   * Clear user history (for testing)
   */
  clearUserHistory(userId: string): void {
    transactionHistory.delete(userId);
  }

  /**
   * Report suspicious activity manually
   */
  async reportSuspiciousActivity(
    reporterId: string,
    targetUserId: string,
    reason: string,
    details?: Record<string, unknown>
  ): Promise<void> {
    await auditLogService.log({
      action: 'FRAUD_REPORT',
      actorId: reporterId,
      actorType: 'admin',
      targetType: 'user',
      targetId: targetUserId,
      metadata: {
        reason,
        details,
        reportedAt: new Date().toISOString(),
      },
    });
  }
}

// Export singleton instance
export const fraudDetectionService = new FraudDetectionService();

// Export types
export type { TransactionPattern, RiskAssessment, RiskFactor };
