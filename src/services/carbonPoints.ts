/**
 * Carbon Points Service
 *
 * ESG reward system for eco-friendly actions.
 * Citizens earn points for green activities, exchangeable for local currency.
 *
 * Based on:
 * - Korea Ministry of Environment Carbon Neutral Points
 * - Busan Green Points Program
 *
 * DATA SOURCE CLASSIFICATION:
 * - [MOCK] Point storage, action verification (in-memory)
 * - [REAL] Carbon reduction calculations (official MoE formulas)
 * - [INTEGRATION READY] IoT sensors, transport cards, receipt APIs
 */

import { auditLogService } from './auditLog';

// ============================================
// [REAL] Carbon reduction values
// Based on Korea Ministry of Environment official data
// https://www.cpoint.or.kr/
// ============================================
const CARBON_REDUCTION_VALUES = {
  // grams of CO2 reduced per action
  ELECTRONIC_RECEIPT: 3.51,           // [REAL] e-receipt vs paper
  TUMBLER_USE: 50.7,                  // [REAL] per use vs disposable cup
  MULTI_USE_CONTAINER: 114.6,         // [REAL] per use vs single-use
  REFILL_STATION: 112.0,              // [REAL] detergent/shampoo refill
  NO_PLASTIC_BAG: 16.0,               // [REAL] declining plastic bag
  IDLE_STOP: 87.0,                    // [REAL] per 10 minutes
  PUBLIC_TRANSPORT_BUS: 80.0,         // [REAL] per km vs private car
  PUBLIC_TRANSPORT_SUBWAY: 102.0,     // [REAL] per km vs private car
  BIKE_SHARING: 150.0,                // [REAL] per km vs private car
  WALKING: 210.0,                     // [REAL] per km vs private car
  ELECTRIC_VEHICLE_CHARGE: 200.0,     // per charge session
  RECYCLING_GENERAL: 50.0,            // per kg
  RECYCLING_ELECTRONICS: 500.0,       // per item
  FOOD_WASTE_REDUCTION: 5.0,          // per 100g
};

// Point conversion rates
const POINT_CONFIG = {
  carbonGramsPerPoint: 100,           // 100g CO2 = 1 point
  pointToKRW: 10,                     // 1 point = 10 KRW
  maxDailyPoints: 1000,               // Max points per day
  maxMonthlyPoints: 10000,            // Max points per month
};

// Eco action types
type EcoActionType =
  | 'ELECTRONIC_RECEIPT'
  | 'TUMBLER_USE'
  | 'MULTI_USE_CONTAINER'
  | 'REFILL_STATION'
  | 'NO_PLASTIC_BAG'
  | 'IDLE_STOP'
  | 'PUBLIC_TRANSPORT_BUS'
  | 'PUBLIC_TRANSPORT_SUBWAY'
  | 'BIKE_SHARING'
  | 'WALKING'
  | 'ELECTRIC_VEHICLE_CHARGE'
  | 'RECYCLING_GENERAL'
  | 'RECYCLING_ELECTRONICS'
  | 'FOOD_WASTE_REDUCTION';

// Verification methods
type VerificationMethod =
  | 'QR_SCAN'              // QR code at participating venue
  | 'RECEIPT_SCAN'         // Electronic receipt from POS
  | 'IOT_SENSOR'           // IoT device verification
  | 'TRANSPORT_CARD'       // Public transport card tap
  | 'GPS_TRACKING'         // Walk/bike GPS verification
  | 'MANUAL_REVIEW';       // Admin manual verification

// Eco action record
interface EcoAction {
  id: string;
  userId: string;
  actionType: EcoActionType;
  timestamp: number;
  quantity: number;              // e.g., km walked, times tumbler used
  carbonReduced: number;         // grams of CO2
  pointsEarned: number;
  verificationMethod: VerificationMethod;
  verificationData?: {
    merchantId?: string;
    transactionId?: string;
    gpsCoordinates?: { lat: number; lng: number }[];
    sensorId?: string;
  };
  status: 'PENDING' | 'VERIFIED' | 'REJECTED';
}

// User carbon account
interface CarbonAccount {
  userId: string;
  totalPoints: number;
  availablePoints: number;
  totalCarbonReduced: number;    // grams
  todayPoints: number;
  monthlyPoints: number;
  lastActionDate: string;
  level: 'SEED' | 'SPROUT' | 'TREE' | 'FOREST';
  badges: string[];
  actions: EcoAction[];
}

// Carbon report card
interface CarbonReportCard {
  userId: string;
  period: { start: string; end: string };
  totalCarbonReduced: number;
  equivalentTrees: number;        // CO2 absorbed by trees equivalent
  topActions: Array<{ type: EcoActionType; count: number; carbon: number }>;
  ranking?: number;               // City ranking
  certificate?: {
    id: string;
    issuedAt: string;
    blockchainHash?: string;
  };
}

// ============================================
// [MOCK] In-memory storage
// ============================================
const accountStore = new Map<string, CarbonAccount>();
const actionStore: EcoAction[] = [];

// Generate IDs
const generateActionId = (): string => `ECO-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`;

// Calculate level based on total carbon reduced
const calculateLevel = (totalCarbon: number): CarbonAccount['level'] => {
  if (totalCarbon >= 1000000) return 'FOREST';  // 1 ton
  if (totalCarbon >= 100000) return 'TREE';     // 100 kg
  if (totalCarbon >= 10000) return 'SPROUT';    // 10 kg
  return 'SEED';
};

// Check badges
const checkBadges = (account: CarbonAccount): string[] => {
  const badges: string[] = [];

  const actionCounts: Record<string, number> = {};
  for (const action of account.actions) {
    actionCounts[action.actionType] = (actionCounts[action.actionType] || 0) + 1;
  }

  if (actionCounts['TUMBLER_USE'] >= 100) badges.push('TUMBLER_MASTER');
  if (actionCounts['PUBLIC_TRANSPORT_BUS'] >= 50) badges.push('PUBLIC_TRANSPORT_HERO');
  if (actionCounts['WALKING'] >= 30) badges.push('WALKING_CHAMPION');
  if (account.totalCarbonReduced >= 100000) badges.push('100KG_SAVER');
  if (account.actions.length >= 365) badges.push('YEAR_LONG_ECO');

  return badges;
};

class CarbonPointsService {
  /**
   * Get or create carbon account
   */
  getAccount(userId: string): CarbonAccount {
    let account = accountStore.get(userId);
    if (!account) {
      account = {
        userId,
        totalPoints: 0,
        availablePoints: 0,
        totalCarbonReduced: 0,
        todayPoints: 0,
        monthlyPoints: 0,
        lastActionDate: '',
        level: 'SEED',
        badges: [],
        actions: [],
      };
      accountStore.set(userId, account);
    }
    return account;
  }

  /**
   * [REAL FORMULA] Calculate carbon reduction and points
   */
  calculateReward(actionType: EcoActionType, quantity: number = 1): {
    carbonReduced: number;
    pointsEarned: number;
    krwValue: number;
  } {
    const carbonPerUnit = CARBON_REDUCTION_VALUES[actionType] || 0;
    const carbonReduced = carbonPerUnit * quantity;
    const pointsEarned = Math.floor(carbonReduced / POINT_CONFIG.carbonGramsPerPoint);
    const krwValue = pointsEarned * POINT_CONFIG.pointToKRW;

    return { carbonReduced, pointsEarned, krwValue };
  }

  /**
   * [MOCK] Record eco action and earn points
   * Production: Integrate with IoT, POS, transport APIs
   */
  async recordAction(params: {
    userId: string;
    actionType: EcoActionType;
    quantity?: number;
    verificationMethod: VerificationMethod;
    verificationData?: EcoAction['verificationData'];
  }): Promise<EcoAction | null> {
    const account = this.getAccount(params.userId);
    const today = new Date().toISOString().split('T')[0];
    const thisMonth = today.substring(0, 7);

    // Reset daily/monthly counters if needed
    if (account.lastActionDate !== today) {
      account.todayPoints = 0;
    }
    if (!account.lastActionDate.startsWith(thisMonth)) {
      account.monthlyPoints = 0;
    }

    // Check limits
    if (account.todayPoints >= POINT_CONFIG.maxDailyPoints) {
      console.warn('[CarbonPoints] Daily limit reached');
      return null;
    }
    if (account.monthlyPoints >= POINT_CONFIG.maxMonthlyPoints) {
      console.warn('[CarbonPoints] Monthly limit reached');
      return null;
    }

    // Calculate reward
    const quantity = params.quantity || 1;
    const reward = this.calculateReward(params.actionType, quantity);

    // Apply limits
    const remainingDaily = POINT_CONFIG.maxDailyPoints - account.todayPoints;
    const remainingMonthly = POINT_CONFIG.maxMonthlyPoints - account.monthlyPoints;
    const actualPoints = Math.min(reward.pointsEarned, remainingDaily, remainingMonthly);

    const action: EcoAction = {
      id: generateActionId(),
      userId: params.userId,
      actionType: params.actionType,
      timestamp: Date.now(),
      quantity,
      carbonReduced: reward.carbonReduced,
      pointsEarned: actualPoints,
      verificationMethod: params.verificationMethod,
      verificationData: params.verificationData,
      status: params.verificationMethod === 'MANUAL_REVIEW' ? 'PENDING' : 'VERIFIED',
    };

    // Update account
    if (action.status === 'VERIFIED') {
      account.totalPoints += actualPoints;
      account.availablePoints += actualPoints;
      account.totalCarbonReduced += reward.carbonReduced;
      account.todayPoints += actualPoints;
      account.monthlyPoints += actualPoints;
    }
    account.lastActionDate = today;
    account.actions.push(action);
    account.level = calculateLevel(account.totalCarbonReduced);
    account.badges = checkBadges(account);

    accountStore.set(params.userId, account);
    actionStore.push(action);

    // Audit log
    await auditLogService.log({
      action: 'CREDENTIAL_ISSUED',
      actorId: params.userId,
      actorType: 'consumer',
      targetType: 'carbon_action',
      targetId: action.id,
      metadata: {
        actionType: params.actionType,
        carbonReduced: reward.carbonReduced,
        pointsEarned: actualPoints,
        verificationMethod: params.verificationMethod,
      },
    });

    return action;
  }

  /**
   * [MOCK] Exchange points for local currency
   */
  async exchangeToLocalCurrency(userId: string, points: number): Promise<{
    success: boolean;
    krwAmount?: number;
    remainingPoints?: number;
    error?: string;
  }> {
    const account = this.getAccount(userId);

    if (points <= 0) {
      return { success: false, error: 'Invalid points amount' };
    }
    if (points > account.availablePoints) {
      return { success: false, error: 'Insufficient points' };
    }

    const krwAmount = points * POINT_CONFIG.pointToKRW;

    account.availablePoints -= points;
    accountStore.set(userId, account);

    // Audit log
    await auditLogService.log({
      action: 'PAYMENT_COMPLETED',
      actorId: userId,
      actorType: 'consumer',
      targetType: 'carbon_exchange',
      targetId: `EXC-${Date.now()}`,
      metadata: {
        pointsExchanged: points,
        krwReceived: krwAmount,
      },
    });

    return {
      success: true,
      krwAmount,
      remainingPoints: account.availablePoints,
    };
  }

  /**
   * Generate carbon report card
   */
  generateReportCard(userId: string, startDate: string, endDate: string): CarbonReportCard {
    const account = this.getAccount(userId);

    // Filter actions in date range
    const startTs = new Date(startDate).getTime();
    const endTs = new Date(endDate).getTime();
    const periodActions = account.actions.filter(
      a => a.timestamp >= startTs && a.timestamp <= endTs && a.status === 'VERIFIED'
    );

    // Calculate totals
    const totalCarbonReduced = periodActions.reduce((sum, a) => sum + a.carbonReduced, 0);

    // [REAL] One tree absorbs about 21kg CO2 per year
    const equivalentTrees = Math.round((totalCarbonReduced / 21000) * 100) / 100;

    // Group by action type
    const actionGroups: Record<string, { count: number; carbon: number }> = {};
    for (const action of periodActions) {
      if (!actionGroups[action.actionType]) {
        actionGroups[action.actionType] = { count: 0, carbon: 0 };
      }
      actionGroups[action.actionType].count++;
      actionGroups[action.actionType].carbon += action.carbonReduced;
    }

    const topActions = Object.entries(actionGroups)
      .map(([type, data]) => ({
        type: type as EcoActionType,
        count: data.count,
        carbon: Math.round(data.carbon),
      }))
      .sort((a, b) => b.carbon - a.carbon)
      .slice(0, 5);

    return {
      userId,
      period: { start: startDate, end: endDate },
      totalCarbonReduced: Math.round(totalCarbonReduced),
      equivalentTrees,
      topActions,
    };
  }

  /**
   * Get leaderboard
   */
  getLeaderboard(limit: number = 10): Array<{
    rank: number;
    userId: string;
    totalCarbonReduced: number;
    level: CarbonAccount['level'];
  }> {
    const accounts = Array.from(accountStore.values());

    return accounts
      .sort((a, b) => b.totalCarbonReduced - a.totalCarbonReduced)
      .slice(0, limit)
      .map((account, index) => ({
        rank: index + 1,
        userId: account.userId,
        totalCarbonReduced: Math.round(account.totalCarbonReduced),
        level: account.level,
      }));
  }

  /**
   * Get available actions with rewards
   */
  getAvailableActions(): Array<{
    type: EcoActionType;
    description: string;
    carbonPerAction: number;
    pointsPerAction: number;
    krwPerAction: number;
  }> {
    const descriptions: Record<EcoActionType, string> = {
      ELECTRONIC_RECEIPT: 'Get electronic receipt instead of paper',
      TUMBLER_USE: 'Use personal tumbler at cafe',
      MULTI_USE_CONTAINER: 'Use reusable container for takeout',
      REFILL_STATION: 'Refill detergent/shampoo at station',
      NO_PLASTIC_BAG: 'Decline plastic bag when shopping',
      IDLE_STOP: 'Turn off engine while waiting (10 min)',
      PUBLIC_TRANSPORT_BUS: 'Take bus instead of driving (per km)',
      PUBLIC_TRANSPORT_SUBWAY: 'Take subway instead of driving (per km)',
      BIKE_SHARING: 'Use shared bike (per km)',
      WALKING: 'Walk instead of driving (per km)',
      ELECTRIC_VEHICLE_CHARGE: 'Charge electric vehicle',
      RECYCLING_GENERAL: 'Recycle general waste (per kg)',
      RECYCLING_ELECTRONICS: 'Recycle electronic device',
      FOOD_WASTE_REDUCTION: 'Reduce food waste (per 100g)',
    };

    return Object.entries(CARBON_REDUCTION_VALUES).map(([type, carbon]) => {
      const reward = this.calculateReward(type as EcoActionType, 1);
      return {
        type: type as EcoActionType,
        description: descriptions[type as EcoActionType] || type,
        carbonPerAction: carbon,
        pointsPerAction: reward.pointsEarned,
        krwPerAction: reward.krwValue,
      };
    });
  }

  /**
   * Get configuration (for display)
   */
  getConfig(): typeof POINT_CONFIG {
    return { ...POINT_CONFIG };
  }
}

// Export singleton
export const carbonPointsService = new CarbonPointsService();

// Export types
export type {
  EcoAction,
  EcoActionType,
  CarbonAccount,
  CarbonReportCard,
  VerificationMethod,
};
