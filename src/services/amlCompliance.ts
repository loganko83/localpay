/**
 * AML Compliance Service
 *
 * Anti-Money Laundering and Travel Rule compliance for local currency platform.
 * Implements FATF recommendations and Korean AML regulations.
 *
 * Based on:
 * - FATF Recommendations (40 Recommendations)
 * - Korean Act on Reporting and Use of Specific Financial Transaction Information
 * - Virtual Asset Service Provider regulations (2023)
 *
 * DATA SOURCE CLASSIFICATION:
 * - [MOCK] Transaction monitoring, alerts (in-memory)
 * - [REAL] Threshold values (based on Korean AML regulations)
 * - [INTEGRATION READY] Korea Financial Intelligence Unit (KoFIU), sanctions lists
 */

import { auditLogService } from './auditLog';
import { blockchainAnchoringService } from './blockchainAnchoring';

// ============================================
// [REAL] Korean AML threshold values
// Based on Enforcement Decree of the Act on Reporting
// and Use of Specific Financial Transaction Information
// ============================================
const AML_THRESHOLDS = {
  // Suspicious Transaction Report (STR) thresholds
  ctrThreshold: 10000000,           // [REAL] 10M KRW - Currency Transaction Report
  strPatternDays: 3,                // Days to analyze for pattern
  strPatternCount: 5,               // Transactions that trigger pattern analysis

  // Travel Rule thresholds (for virtual assets)
  travelRuleThreshold: 1000000,     // [REAL] 1M KRW - must share originator/beneficiary info

  // High-risk transaction thresholds
  highValueThreshold: 50000000,     // 50M KRW - requires enhanced due diligence
  dailyLimitCash: 30000000,         // 30M KRW - daily cash transaction limit
  monthlyLimitP2P: 100000000,       // 100M KRW - monthly P2P transfer limit

  // Velocity limits
  maxDailyTransactions: 50,
  maxHourlyTransactions: 10,

  // Risk score thresholds
  highRiskScore: 70,
  mediumRiskScore: 40,
};

// Risk level
type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

// Alert type
type AlertType =
  | 'THRESHOLD_BREACH'       // Single large transaction
  | 'STRUCTURING'            // Breaking up transactions to avoid thresholds
  | 'VELOCITY_ANOMALY'       // Unusual transaction frequency
  | 'PATTERN_MATCH'          // Known suspicious pattern
  | 'SANCTIONS_HIT'          // Sanctions list match
  | 'UNUSUAL_BEHAVIOR'       // Deviation from normal behavior
  | 'HIGH_RISK_COUNTERPARTY' // Transaction with high-risk party
  | 'CROSS_BORDER';          // International transaction concerns

// Transaction for monitoring
interface MonitoredTransaction {
  id: string;
  timestamp: number;
  senderId: string;
  senderName: string;
  senderType: 'INDIVIDUAL' | 'MERCHANT' | 'CORPORATE';
  recipientId: string;
  recipientName: string;
  recipientType: 'INDIVIDUAL' | 'MERCHANT' | 'CORPORATE';
  amount: number;
  transactionType: 'PAYMENT' | 'TRANSFER' | 'TOPUP' | 'WITHDRAWAL' | 'EXCHANGE';
  channel: 'ONLINE' | 'OFFLINE' | 'MOBILE' | 'API';
  location?: { region: string; country: string };
  deviceInfo?: { type: string; ip?: string };
  riskScore: number;
  flags: string[];
}

// AML alert
interface AMLAlert {
  id: string;
  alertType: AlertType;
  severity: RiskLevel;
  transactionId: string;
  subjectId: string;
  subjectType: 'INDIVIDUAL' | 'MERCHANT' | 'CORPORATE';
  description: string;
  riskScore: number;
  createdAt: number;
  status: 'OPEN' | 'UNDER_REVIEW' | 'ESCALATED' | 'CLOSED' | 'REPORTED';
  assignedTo?: string;
  resolution?: {
    decision: 'FALSE_POSITIVE' | 'SUSPICIOUS' | 'CLEARED' | 'REPORTED_TO_FIU';
    notes: string;
    resolvedAt: number;
    resolvedBy: string;
  };
  relatedTransactions: string[];
  evidence: string[];
}

// Customer risk profile
interface CustomerRiskProfile {
  id: string;
  customerId: string;
  customerType: 'INDIVIDUAL' | 'MERCHANT' | 'CORPORATE';
  riskLevel: RiskLevel;
  riskScore: number;
  riskFactors: RiskFactor[];
  kycStatus: 'PENDING' | 'VERIFIED' | 'ENHANCED' | 'REJECTED';
  lastReviewDate: number;
  nextReviewDate: number;
  transactionProfile: {
    averageMonthlyVolume: number;
    averageTransactionSize: number;
    typicalCounterparties: string[];
    normalOperatingHours: { start: number; end: number };
  };
  alerts: string[];        // Alert IDs
  notes: string[];
}

// Risk factor
interface RiskFactor {
  factor: string;
  weight: number;
  value: string;
  score: number;
}

// Suspicious Transaction Report (STR)
interface SuspiciousTransactionReport {
  id: string;
  reportNumber: string;
  subjectId: string;
  subjectType: 'INDIVIDUAL' | 'MERCHANT' | 'CORPORATE';
  alertIds: string[];
  transactionIds: string[];
  totalAmount: number;
  suspicionType: string;
  description: string;
  supportingEvidence: string[];
  createdAt: number;
  submittedAt?: number;
  submittedTo: 'KOFIU';      // Korea Financial Intelligence Unit
  status: 'DRAFT' | 'SUBMITTED' | 'ACKNOWLEDGED';
  blockchainHash?: string;
}

// Travel Rule compliance record
interface TravelRuleRecord {
  id: string;
  transactionId: string;
  amount: number;
  originator: {
    name: string;
    accountId: string;
    address?: string;
    dateOfBirth?: string;
    nationalId?: string;
  };
  beneficiary: {
    name: string;
    accountId: string;
    vaspId?: string;
  };
  originatorVASP: {
    name: string;
    leiCode?: string;
    country: string;
  };
  beneficiaryVASP?: {
    name: string;
    leiCode?: string;
    country: string;
  };
  timestamp: number;
  complianceStatus: 'PENDING' | 'COMPLIANT' | 'NON_COMPLIANT';
}

// ============================================
// [MOCK] In-memory storage
// ============================================
const transactionStore: MonitoredTransaction[] = [];
const alertStore = new Map<string, AMLAlert>();
const riskProfileStore = new Map<string, CustomerRiskProfile>();
const strStore = new Map<string, SuspiciousTransactionReport>();
const travelRuleStore = new Map<string, TravelRuleRecord>();

// Generate IDs
const generateAlertId = (): string => `ALT-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 8)}`;
const generateSTRId = (): string => `STR-${new Date().getFullYear()}-${Date.now().toString(36)}`;
const generateTravelRuleId = (): string => `TR-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`;

// [MOCK] Sanctions list (in production: integrate with real sanctions APIs)
const MOCK_SANCTIONS_LIST = new Set<string>([
  'SANCTIONED-USER-001',
  'SANCTIONED-MERCHANT-002',
]);

class AMLComplianceService {
  /**
   * [MOCK + REAL THRESHOLDS] Monitor transaction
   */
  async monitorTransaction(transaction: Omit<MonitoredTransaction, 'riskScore' | 'flags'>): Promise<{
    allowed: boolean;
    riskScore: number;
    alerts: AMLAlert[];
    flags: string[];
  }> {
    const flags: string[] = [];
    const alerts: AMLAlert[] = [];
    let riskScore = 0;

    // [REAL] Check CTR threshold
    if (transaction.amount >= AML_THRESHOLDS.ctrThreshold) {
      flags.push('CTR_THRESHOLD');
      riskScore += 30;
    }

    // Check sanctions list
    if (MOCK_SANCTIONS_LIST.has(transaction.senderId) || MOCK_SANCTIONS_LIST.has(transaction.recipientId)) {
      flags.push('SANCTIONS_HIT');
      riskScore += 100;

      const alert = await this.createAlert({
        alertType: 'SANCTIONS_HIT',
        severity: 'CRITICAL',
        transactionId: transaction.id,
        subjectId: MOCK_SANCTIONS_LIST.has(transaction.senderId) ? transaction.senderId : transaction.recipientId,
        subjectType: transaction.senderType,
        description: 'Transaction involves sanctioned party',
        riskScore: 100,
        relatedTransactions: [transaction.id],
      });
      alerts.push(alert);
    }

    // Check velocity (get recent transactions for sender)
    const recentTransactions = transactionStore.filter(
      t => t.senderId === transaction.senderId &&
           t.timestamp > Date.now() - 3600000 // Last hour
    );

    if (recentTransactions.length >= AML_THRESHOLDS.maxHourlyTransactions) {
      flags.push('VELOCITY_ANOMALY');
      riskScore += 25;

      const alert = await this.createAlert({
        alertType: 'VELOCITY_ANOMALY',
        severity: 'MEDIUM',
        transactionId: transaction.id,
        subjectId: transaction.senderId,
        subjectType: transaction.senderType,
        description: `Unusual transaction frequency: ${recentTransactions.length + 1} transactions in 1 hour`,
        riskScore: 50,
        relatedTransactions: recentTransactions.map(t => t.id),
      });
      alerts.push(alert);
    }

    // Check for structuring (multiple transactions just under threshold)
    const structuringCheck = transactionStore.filter(
      t => t.senderId === transaction.senderId &&
           t.timestamp > Date.now() - (AML_THRESHOLDS.strPatternDays * 24 * 60 * 60 * 1000) &&
           t.amount >= AML_THRESHOLDS.ctrThreshold * 0.7 &&
           t.amount < AML_THRESHOLDS.ctrThreshold
    );

    if (structuringCheck.length >= AML_THRESHOLDS.strPatternCount - 1) {
      flags.push('STRUCTURING_SUSPECTED');
      riskScore += 40;

      const alert = await this.createAlert({
        alertType: 'STRUCTURING',
        severity: 'HIGH',
        transactionId: transaction.id,
        subjectId: transaction.senderId,
        subjectType: transaction.senderType,
        description: 'Suspected structuring: multiple transactions just under CTR threshold',
        riskScore: 70,
        relatedTransactions: structuringCheck.map(t => t.id),
      });
      alerts.push(alert);
    }

    // Check customer risk profile
    const senderProfile = riskProfileStore.get(transaction.senderId);
    if (senderProfile) {
      if (senderProfile.riskLevel === 'HIGH' || senderProfile.riskLevel === 'CRITICAL') {
        flags.push('HIGH_RISK_SENDER');
        riskScore += 20;
      }

      // Check for unusual behavior (amount significantly higher than average)
      if (transaction.amount > senderProfile.transactionProfile.averageTransactionSize * 5) {
        flags.push('UNUSUAL_AMOUNT');
        riskScore += 15;
      }
    }

    // [REAL] Travel Rule check
    if (transaction.amount >= AML_THRESHOLDS.travelRuleThreshold) {
      flags.push('TRAVEL_RULE_REQUIRED');
    }

    // Store transaction
    const monitoredTx: MonitoredTransaction = {
      ...transaction,
      riskScore,
      flags,
    };
    transactionStore.push(monitoredTx);

    // Determine if transaction should be blocked
    const allowed = riskScore < 100 && !flags.includes('SANCTIONS_HIT');

    // Audit log
    await auditLogService.log({
      action: 'TRANSACTION_MONITORED',
      actorId: 'system',
      actorType: 'system',
      targetType: 'aml_monitoring',
      targetId: transaction.id,
      metadata: {
        riskScore,
        flags,
        alertCount: alerts.length,
        allowed,
      },
    });

    return { allowed, riskScore, alerts, flags };
  }

  /**
   * [MOCK] Create AML alert
   */
  private async createAlert(params: {
    alertType: AlertType;
    severity: RiskLevel;
    transactionId: string;
    subjectId: string;
    subjectType: 'INDIVIDUAL' | 'MERCHANT' | 'CORPORATE';
    description: string;
    riskScore: number;
    relatedTransactions: string[];
  }): Promise<AMLAlert> {
    const alert: AMLAlert = {
      id: generateAlertId(),
      alertType: params.alertType,
      severity: params.severity,
      transactionId: params.transactionId,
      subjectId: params.subjectId,
      subjectType: params.subjectType,
      description: params.description,
      riskScore: params.riskScore,
      createdAt: Date.now(),
      status: 'OPEN',
      relatedTransactions: params.relatedTransactions,
      evidence: [],
    };

    alertStore.set(alert.id, alert);

    // Update customer risk profile
    const profile = riskProfileStore.get(params.subjectId);
    if (profile) {
      profile.alerts.push(alert.id);
      profile.riskScore = Math.min(100, profile.riskScore + params.riskScore * 0.1);
      profile.riskLevel = this.getRiskLevelFromScore(profile.riskScore);
      riskProfileStore.set(params.subjectId, profile);
    }

    return alert;
  }

  /**
   * [MOCK] Create/update customer risk profile
   */
  async createRiskProfile(params: {
    customerId: string;
    customerType: 'INDIVIDUAL' | 'MERCHANT' | 'CORPORATE';
    initialRiskFactors?: RiskFactor[];
  }): Promise<CustomerRiskProfile> {
    const existing = riskProfileStore.get(params.customerId);
    if (existing) return existing;

    const baseRiskFactors: RiskFactor[] = params.initialRiskFactors || [];
    const riskScore = baseRiskFactors.reduce((sum, f) => sum + f.score * f.weight, 0);
    const riskLevel = this.getRiskLevelFromScore(riskScore);

    const profile: CustomerRiskProfile = {
      id: `CRP-${Date.now().toString(36)}`,
      customerId: params.customerId,
      customerType: params.customerType,
      riskLevel,
      riskScore,
      riskFactors: baseRiskFactors,
      kycStatus: 'PENDING',
      lastReviewDate: Date.now(),
      nextReviewDate: Date.now() + 365 * 24 * 60 * 60 * 1000, // Annual review
      transactionProfile: {
        averageMonthlyVolume: 0,
        averageTransactionSize: 0,
        typicalCounterparties: [],
        normalOperatingHours: { start: 9, end: 21 },
      },
      alerts: [],
      notes: [],
    };

    riskProfileStore.set(params.customerId, profile);
    return profile;
  }

  /**
   * Get risk level from score
   */
  private getRiskLevelFromScore(score: number): RiskLevel {
    if (score >= AML_THRESHOLDS.highRiskScore) return 'HIGH';
    if (score >= AML_THRESHOLDS.mediumRiskScore) return 'MEDIUM';
    return 'LOW';
  }

  /**
   * [MOCK] Generate Suspicious Transaction Report
   */
  async generateSTR(params: {
    subjectId: string;
    subjectType: 'INDIVIDUAL' | 'MERCHANT' | 'CORPORATE';
    alertIds: string[];
    suspicionType: string;
    description: string;
    createdBy: string;
  }): Promise<SuspiciousTransactionReport> {
    const alerts = params.alertIds
      .map(id => alertStore.get(id))
      .filter((a): a is AMLAlert => a !== undefined);

    const transactionIds = [...new Set(alerts.flatMap(a => a.relatedTransactions))];
    const totalAmount = transactionStore
      .filter(t => transactionIds.includes(t.id))
      .reduce((sum, t) => sum + t.amount, 0);

    const str: SuspiciousTransactionReport = {
      id: generateSTRId(),
      reportNumber: `KOR-STR-${new Date().getFullYear()}-${Date.now().toString().slice(-8)}`,
      subjectId: params.subjectId,
      subjectType: params.subjectType,
      alertIds: params.alertIds,
      transactionIds,
      totalAmount,
      suspicionType: params.suspicionType,
      description: params.description,
      supportingEvidence: alerts.flatMap(a => a.evidence),
      createdAt: Date.now(),
      submittedTo: 'KOFIU',
      status: 'DRAFT',
    };

    strStore.set(str.id, str);

    // Mark alerts as reported
    for (const alert of alerts) {
      alert.status = 'REPORTED';
      alertStore.set(alert.id, alert);
    }

    return str;
  }

  /**
   * [MOCK + BLOCKCHAIN] Submit STR to FIU
   */
  async submitSTR(strId: string): Promise<boolean> {
    const str = strStore.get(strId);
    if (!str || str.status !== 'DRAFT') return false;

    // Anchor to blockchain for audit trail
    const anchorResult = await blockchainAnchoringService.addTransaction(
      str.id,
      'str_submission',
      {
        reportNumber: str.reportNumber,
        subjectId: str.subjectId,
        totalAmount: str.totalAmount,
        submittedAt: Date.now(),
      }
    );

    str.status = 'SUBMITTED';
    str.submittedAt = Date.now();
    str.blockchainHash = anchorResult.hash;

    strStore.set(strId, str);

    await auditLogService.log({
      action: 'STR_SUBMITTED',
      actorId: 'system',
      actorType: 'system',
      targetType: 'suspicious_transaction_report',
      targetId: str.id,
      metadata: {
        reportNumber: str.reportNumber,
        blockchainHash: str.blockchainHash,
      },
    });

    return true;
  }

  /**
   * [MOCK] Create Travel Rule record
   */
  async createTravelRuleRecord(params: {
    transactionId: string;
    amount: number;
    originator: TravelRuleRecord['originator'];
    beneficiary: TravelRuleRecord['beneficiary'];
    originatorVASP: TravelRuleRecord['originatorVASP'];
    beneficiaryVASP?: TravelRuleRecord['beneficiaryVASP'];
  }): Promise<TravelRuleRecord> {
    const record: TravelRuleRecord = {
      id: generateTravelRuleId(),
      transactionId: params.transactionId,
      amount: params.amount,
      originator: params.originator,
      beneficiary: params.beneficiary,
      originatorVASP: params.originatorVASP,
      beneficiaryVASP: params.beneficiaryVASP,
      timestamp: Date.now(),
      complianceStatus: params.beneficiaryVASP ? 'COMPLIANT' : 'PENDING',
    };

    travelRuleStore.set(record.id, record);
    return record;
  }

  /**
   * Resolve alert
   */
  async resolveAlert(params: {
    alertId: string;
    decision: 'FALSE_POSITIVE' | 'SUSPICIOUS' | 'CLEARED' | 'REPORTED_TO_FIU';
    notes: string;
    resolvedBy: string;
  }): Promise<boolean> {
    const alert = alertStore.get(params.alertId);
    if (!alert || alert.status === 'CLOSED') return false;

    alert.status = 'CLOSED';
    alert.resolution = {
      decision: params.decision,
      notes: params.notes,
      resolvedAt: Date.now(),
      resolvedBy: params.resolvedBy,
    };

    alertStore.set(params.alertId, alert);
    return true;
  }

  /**
   * Get open alerts
   */
  getOpenAlerts(): AMLAlert[] {
    return Array.from(alertStore.values())
      .filter(a => a.status === 'OPEN' || a.status === 'UNDER_REVIEW')
      .sort((a, b) => b.createdAt - a.createdAt);
  }

  /**
   * Get customer risk profile
   */
  getRiskProfile(customerId: string): CustomerRiskProfile | null {
    return riskProfileStore.get(customerId) || null;
  }

  /**
   * Get AML thresholds
   */
  getThresholds(): typeof AML_THRESHOLDS {
    return { ...AML_THRESHOLDS };
  }

  /**
   * Get compliance statistics
   */
  getComplianceStats(): {
    totalTransactionsMonitored: number;
    alertsByType: Record<AlertType, number>;
    alertsByStatus: Record<string, number>;
    strSubmitted: number;
    highRiskCustomers: number;
  } {
    const alerts = Array.from(alertStore.values());
    const alertsByType: Record<AlertType, number> = {} as Record<AlertType, number>;
    const alertsByStatus: Record<string, number> = {};

    for (const alert of alerts) {
      alertsByType[alert.alertType] = (alertsByType[alert.alertType] || 0) + 1;
      alertsByStatus[alert.status] = (alertsByStatus[alert.status] || 0) + 1;
    }

    const highRiskCustomers = Array.from(riskProfileStore.values())
      .filter(p => p.riskLevel === 'HIGH' || p.riskLevel === 'CRITICAL')
      .length;

    const strSubmitted = Array.from(strStore.values())
      .filter(s => s.status === 'SUBMITTED' || s.status === 'ACKNOWLEDGED')
      .length;

    return {
      totalTransactionsMonitored: transactionStore.length,
      alertsByType,
      alertsByStatus,
      strSubmitted,
      highRiskCustomers,
    };
  }
}

// Export singleton
export const amlComplianceService = new AMLComplianceService();

// Export types
export type {
  MonitoredTransaction,
  AMLAlert,
  CustomerRiskProfile,
  SuspiciousTransactionReport,
  TravelRuleRecord,
  RiskLevel,
  AlertType,
};
