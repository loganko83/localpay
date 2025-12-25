/**
 * Merchant Credit Service
 *
 * SMB credit scoring based on local currency transaction data.
 * Provides alternative credit assessment for small merchants who
 * lack traditional credit history.
 *
 * Features:
 * - Transaction-based credit scoring
 * - Sales trend analysis
 * - Credit limit recommendations
 * - Integration with policy loans
 *
 * DATA SOURCE CLASSIFICATION:
 * - [MOCK] Merchant credit profiles, scores (in-memory)
 * - [REAL] Scoring algorithm weights (based on industry standards)
 * - [INTEGRATION READY] Credit bureaus, bank loan systems
 */

import { auditLogService } from './auditLog';

// ============================================
// [REAL] Credit scoring model configuration
// Based on alternative credit scoring methodologies
// ============================================
const SCORING_CONFIG = {
  // Score ranges (0-1000)
  scoreRanges: {
    EXCELLENT: { min: 850, max: 1000, label: 'Excellent Credit' },
    GOOD: { min: 700, max: 849, label: 'Good Credit' },
    FAIR: { min: 550, max: 699, label: 'Fair Credit' },
    POOR: { min: 400, max: 549, label: 'Poor Credit' },
    VERY_POOR: { min: 0, max: 399, label: 'Very Poor Credit' },
  },

  // Weight factors for scoring
  weights: {
    transactionVolume: 0.25,        // Total sales volume
    transactionFrequency: 0.20,     // Number of transactions
    customerRetention: 0.15,        // Repeat customers
    paymentConsistency: 0.15,       // Timely supplier payments
    businessAge: 0.10,              // How long on platform
    growthTrend: 0.10,              // Sales growth rate
    seasonalStability: 0.05,        // Consistency across seasons
  },

  // Loan limits by score
  loanLimitsByScore: {
    EXCELLENT: 50000000,            // 50M KRW
    GOOD: 30000000,                 // 30M KRW
    FAIR: 15000000,                 // 15M KRW
    POOR: 5000000,                  // 5M KRW
    VERY_POOR: 0,
  },

  // Interest rate adjustments (basis points)
  rateAdjustments: {
    EXCELLENT: -100,                // -1% from base rate
    GOOD: -50,                      // -0.5%
    FAIR: 0,                        // Base rate
    POOR: 100,                      // +1%
    VERY_POOR: 200,                 // +2%
  },

  baseInterestRate: 0.045,          // 4.5% base annual rate
};

// Credit grade
type CreditGrade = 'EXCELLENT' | 'GOOD' | 'FAIR' | 'POOR' | 'VERY_POOR';

// Merchant credit profile
interface MerchantCreditProfile {
  id: string;
  merchantId: string;
  merchantName: string;
  businessType: string;
  registeredAt: number;
  currentScore: number;
  currentGrade: CreditGrade;
  scoreHistory: ScoreHistoryEntry[];
  financialMetrics: FinancialMetrics;
  creditLimit: number;
  availableCredit: number;
  activeLoans: LoanRecord[];
  lastAssessedAt: number;
  nextAssessmentAt: number;
}

// Score history entry
interface ScoreHistoryEntry {
  timestamp: number;
  score: number;
  grade: CreditGrade;
  factors: Record<string, number>;
  changeReason?: string;
}

// Financial metrics from transaction data
interface FinancialMetrics {
  // Volume metrics
  monthlyAverageVolume: number;
  totalLifetimeVolume: number;
  monthlyTransactionCount: number;

  // Customer metrics
  uniqueCustomers: number;
  repeatCustomerRate: number;
  averageTicketSize: number;

  // Trend metrics
  monthOverMonthGrowth: number;
  yearOverYearGrowth: number;
  volatilityScore: number;

  // Payment metrics
  averageSettlementDays: number;
  paymentDefaultRate: number;

  // Platform metrics
  daysOnPlatform: number;
  localCurrencyRatio: number;     // % of sales in local currency
}

// Loan record
interface LoanRecord {
  id: string;
  merchantId: string;
  amount: number;
  interestRate: number;
  termMonths: number;
  monthlyPayment: number;
  startDate: number;
  endDate: number;
  remainingBalance: number;
  status: 'ACTIVE' | 'PAID_OFF' | 'DELINQUENT' | 'DEFAULT';
  paymentHistory: PaymentHistoryEntry[];
  loanType: 'WORKING_CAPITAL' | 'EQUIPMENT' | 'EXPANSION' | 'EMERGENCY';
}

// Payment history
interface PaymentHistoryEntry {
  dueDate: number;
  paidDate?: number;
  amount: number;
  status: 'PAID' | 'PENDING' | 'LATE' | 'MISSED';
  daysLate?: number;
}

// Credit assessment result
interface CreditAssessment {
  merchantId: string;
  assessedAt: number;
  score: number;
  previousScore: number;
  grade: CreditGrade;
  factors: {
    name: string;
    value: number;
    weight: number;
    contribution: number;
    rating: 'STRONG' | 'AVERAGE' | 'WEAK';
  }[];
  recommendedLimit: number;
  eligibleProducts: string[];
  recommendations: string[];
}

// Loan application
interface LoanApplication {
  id: string;
  merchantId: string;
  requestedAmount: number;
  loanType: LoanRecord['loanType'];
  purpose: string;
  termMonths: number;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'DISBURSED';
  appliedAt: number;
  decidedAt?: number;
  approvedAmount?: number;
  approvedRate?: number;
  rejectionReason?: string;
}

// ============================================
// [MOCK] In-memory storage
// ============================================
const creditProfileStore = new Map<string, MerchantCreditProfile>();
const loanApplicationStore = new Map<string, LoanApplication[]>();

// Generate IDs
const generateProfileId = (): string => `MCP-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`;
const generateLoanId = (): string => `LN-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 8)}`;
const generateAppId = (): string => `APP-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`;

// Determine grade from score
const getGradeFromScore = (score: number): CreditGrade => {
  const { scoreRanges } = SCORING_CONFIG;
  if (score >= scoreRanges.EXCELLENT.min) return 'EXCELLENT';
  if (score >= scoreRanges.GOOD.min) return 'GOOD';
  if (score >= scoreRanges.FAIR.min) return 'FAIR';
  if (score >= scoreRanges.POOR.min) return 'POOR';
  return 'VERY_POOR';
};

class MerchantCreditService {
  /**
   * [MOCK] Initialize credit profile for merchant
   */
  async initializeProfile(params: {
    merchantId: string;
    merchantName: string;
    businessType: string;
    registeredAt: number;
  }): Promise<MerchantCreditProfile> {
    const existing = creditProfileStore.get(params.merchantId);
    if (existing) return existing;

    // Initial assessment based on minimal data
    const initialScore = 500; // Start at "Fair" level
    const initialGrade = getGradeFromScore(initialScore);

    const profile: MerchantCreditProfile = {
      id: generateProfileId(),
      merchantId: params.merchantId,
      merchantName: params.merchantName,
      businessType: params.businessType,
      registeredAt: params.registeredAt,
      currentScore: initialScore,
      currentGrade: initialGrade,
      scoreHistory: [{
        timestamp: Date.now(),
        score: initialScore,
        grade: initialGrade,
        factors: {},
        changeReason: 'Initial profile creation',
      }],
      financialMetrics: {
        monthlyAverageVolume: 0,
        totalLifetimeVolume: 0,
        monthlyTransactionCount: 0,
        uniqueCustomers: 0,
        repeatCustomerRate: 0,
        averageTicketSize: 0,
        monthOverMonthGrowth: 0,
        yearOverYearGrowth: 0,
        volatilityScore: 0,
        averageSettlementDays: 0,
        paymentDefaultRate: 0,
        daysOnPlatform: 0,
        localCurrencyRatio: 0,
      },
      creditLimit: SCORING_CONFIG.loanLimitsByScore[initialGrade],
      availableCredit: SCORING_CONFIG.loanLimitsByScore[initialGrade],
      activeLoans: [],
      lastAssessedAt: Date.now(),
      nextAssessmentAt: Date.now() + 30 * 24 * 60 * 60 * 1000, // 30 days
    };

    creditProfileStore.set(params.merchantId, profile);

    await auditLogService.log({
      action: 'CREDENTIAL_ISSUED',
      actorId: 'system',
      actorType: 'system',
      targetType: 'merchant_credit_profile',
      targetId: profile.id,
      metadata: {
        merchantId: params.merchantId,
        initialScore,
        initialGrade,
      },
    });

    return profile;
  }

  /**
   * [MOCK + REAL FORMULA] Perform credit assessment
   */
  async assessCredit(merchantId: string, metrics: FinancialMetrics): Promise<CreditAssessment | null> {
    const profile = creditProfileStore.get(merchantId);
    if (!profile) return null;

    const previousScore = profile.currentScore;
    const { weights } = SCORING_CONFIG;

    // [REAL FORMULA] Calculate factor scores (0-100 scale)
    const factorScores = {
      transactionVolume: this.scoreVolume(metrics.monthlyAverageVolume),
      transactionFrequency: this.scoreFrequency(metrics.monthlyTransactionCount),
      customerRetention: this.scoreRetention(metrics.repeatCustomerRate),
      paymentConsistency: this.scorePaymentConsistency(metrics.paymentDefaultRate),
      businessAge: this.scoreBusinessAge(metrics.daysOnPlatform),
      growthTrend: this.scoreGrowth(metrics.monthOverMonthGrowth),
      seasonalStability: this.scoreStability(metrics.volatilityScore),
    };

    // Calculate weighted score (scale to 1000)
    let weightedSum = 0;
    const factors: CreditAssessment['factors'] = [];

    for (const [key, weight] of Object.entries(weights)) {
      const factorValue = factorScores[key as keyof typeof factorScores];
      const contribution = factorValue * weight;
      weightedSum += contribution;

      factors.push({
        name: this.getFactorDisplayName(key),
        value: factorValue,
        weight,
        contribution,
        rating: factorValue >= 70 ? 'STRONG' : factorValue >= 40 ? 'AVERAGE' : 'WEAK',
      });
    }

    const newScore = Math.round(weightedSum * 10); // Scale to 1000
    const newGrade = getGradeFromScore(newScore);

    // Update profile
    profile.currentScore = newScore;
    profile.currentGrade = newGrade;
    profile.financialMetrics = metrics;
    profile.creditLimit = SCORING_CONFIG.loanLimitsByScore[newGrade];

    // Calculate available credit (limit minus outstanding loans)
    const outstandingLoans = profile.activeLoans
      .filter(l => l.status === 'ACTIVE')
      .reduce((sum, l) => sum + l.remainingBalance, 0);
    profile.availableCredit = Math.max(0, profile.creditLimit - outstandingLoans);

    profile.scoreHistory.push({
      timestamp: Date.now(),
      score: newScore,
      grade: newGrade,
      factors: factorScores,
      changeReason: newScore > previousScore ? 'Credit improvement' : 'Periodic reassessment',
    });

    profile.lastAssessedAt = Date.now();
    profile.nextAssessmentAt = Date.now() + 30 * 24 * 60 * 60 * 1000;

    creditProfileStore.set(merchantId, profile);

    // Generate recommendations
    const recommendations = this.generateRecommendations(factors, newGrade);
    const eligibleProducts = this.getEligibleProducts(newGrade);

    return {
      merchantId,
      assessedAt: Date.now(),
      score: newScore,
      previousScore,
      grade: newGrade,
      factors,
      recommendedLimit: profile.creditLimit,
      eligibleProducts,
      recommendations,
    };
  }

  // Scoring helper functions (normalize to 0-100)
  private scoreVolume(monthlyVolume: number): number {
    // Score based on monthly volume brackets
    if (monthlyVolume >= 50000000) return 100; // 50M+
    if (monthlyVolume >= 20000000) return 80;
    if (monthlyVolume >= 10000000) return 60;
    if (monthlyVolume >= 5000000) return 40;
    if (monthlyVolume >= 1000000) return 20;
    return Math.min(20, Math.floor(monthlyVolume / 50000));
  }

  private scoreFrequency(monthlyCount: number): number {
    if (monthlyCount >= 500) return 100;
    if (monthlyCount >= 200) return 80;
    if (monthlyCount >= 100) return 60;
    if (monthlyCount >= 50) return 40;
    return Math.min(40, Math.floor(monthlyCount * 0.8));
  }

  private scoreRetention(repeatRate: number): number {
    return Math.min(100, Math.floor(repeatRate * 100));
  }

  private scorePaymentConsistency(defaultRate: number): number {
    return Math.max(0, 100 - Math.floor(defaultRate * 500));
  }

  private scoreBusinessAge(daysOnPlatform: number): number {
    if (daysOnPlatform >= 1095) return 100; // 3+ years
    if (daysOnPlatform >= 730) return 80;   // 2+ years
    if (daysOnPlatform >= 365) return 60;   // 1+ year
    if (daysOnPlatform >= 180) return 40;   // 6+ months
    return Math.min(40, Math.floor(daysOnPlatform / 4.5));
  }

  private scoreGrowth(momGrowth: number): number {
    if (momGrowth >= 0.2) return 100;   // 20%+ growth
    if (momGrowth >= 0.1) return 80;
    if (momGrowth >= 0) return 60;
    if (momGrowth >= -0.1) return 40;
    return 20;
  }

  private scoreStability(volatilityScore: number): number {
    return Math.max(0, 100 - Math.floor(volatilityScore * 100));
  }

  private getFactorDisplayName(key: string): string {
    const names: Record<string, string> = {
      transactionVolume: 'Sales Volume',
      transactionFrequency: 'Transaction Frequency',
      customerRetention: 'Customer Retention',
      paymentConsistency: 'Payment Consistency',
      businessAge: 'Business History',
      growthTrend: 'Growth Trend',
      seasonalStability: 'Revenue Stability',
    };
    return names[key] || key;
  }

  private generateRecommendations(
    factors: CreditAssessment['factors'],
    grade: CreditGrade
  ): string[] {
    const recommendations: string[] = [];

    const weakFactors = factors.filter(f => f.rating === 'WEAK');
    for (const factor of weakFactors) {
      switch (factor.name) {
        case 'Sales Volume':
          recommendations.push('Increase local currency acceptance to boost sales volume');
          break;
        case 'Customer Retention':
          recommendations.push('Join shared loyalty program to improve customer retention');
          break;
        case 'Growth Trend':
          recommendations.push('Consider promotional campaigns to drive growth');
          break;
      }
    }

    if (grade === 'FAIR' || grade === 'POOR') {
      recommendations.push('Build transaction history for 3+ months to improve score');
    }

    return recommendations;
  }

  private getEligibleProducts(grade: CreditGrade): string[] {
    const products: Record<CreditGrade, string[]> = {
      EXCELLENT: ['Working Capital Loan', 'Equipment Financing', 'Expansion Loan', 'Line of Credit', 'Emergency Fund'],
      GOOD: ['Working Capital Loan', 'Equipment Financing', 'Line of Credit'],
      FAIR: ['Working Capital Loan', 'Emergency Fund'],
      POOR: ['Micro Loan (Guaranteed)'],
      VERY_POOR: [],
    };
    return products[grade];
  }

  /**
   * [MOCK] Apply for loan
   */
  async applyForLoan(params: {
    merchantId: string;
    requestedAmount: number;
    loanType: LoanRecord['loanType'];
    purpose: string;
    termMonths: number;
  }): Promise<LoanApplication | null> {
    const profile = creditProfileStore.get(params.merchantId);
    if (!profile) return null;

    // Check eligibility
    if (params.requestedAmount > profile.availableCredit) {
      const application: LoanApplication = {
        id: generateAppId(),
        merchantId: params.merchantId,
        requestedAmount: params.requestedAmount,
        loanType: params.loanType,
        purpose: params.purpose,
        termMonths: params.termMonths,
        status: 'REJECTED',
        appliedAt: Date.now(),
        decidedAt: Date.now(),
        rejectionReason: 'Requested amount exceeds available credit limit',
      };

      const apps = loanApplicationStore.get(params.merchantId) || [];
      apps.push(application);
      loanApplicationStore.set(params.merchantId, apps);

      return application;
    }

    // Calculate interest rate
    const rateAdjustment = SCORING_CONFIG.rateAdjustments[profile.currentGrade];
    const interestRate = SCORING_CONFIG.baseInterestRate + (rateAdjustment / 10000);

    const application: LoanApplication = {
      id: generateAppId(),
      merchantId: params.merchantId,
      requestedAmount: params.requestedAmount,
      loanType: params.loanType,
      purpose: params.purpose,
      termMonths: params.termMonths,
      status: 'APPROVED', // Auto-approve for demo
      appliedAt: Date.now(),
      decidedAt: Date.now(),
      approvedAmount: params.requestedAmount,
      approvedRate: interestRate,
    };

    const apps = loanApplicationStore.get(params.merchantId) || [];
    apps.push(application);
    loanApplicationStore.set(params.merchantId, apps);

    await auditLogService.log({
      action: 'CREDENTIAL_ISSUED',
      actorId: params.merchantId,
      actorType: 'merchant',
      targetType: 'loan_application',
      targetId: application.id,
      metadata: {
        amount: params.requestedAmount,
        type: params.loanType,
        rate: interestRate,
      },
    });

    return application;
  }

  /**
   * [MOCK] Disburse approved loan
   */
  async disburseLoan(applicationId: string): Promise<LoanRecord | null> {
    // Find application
    let application: LoanApplication | undefined;
    let merchantId: string | undefined;

    for (const [mId, apps] of loanApplicationStore.entries()) {
      const found = apps.find(a => a.id === applicationId);
      if (found) {
        application = found;
        merchantId = mId;
        break;
      }
    }

    if (!application || !merchantId || application.status !== 'APPROVED') {
      return null;
    }

    const profile = creditProfileStore.get(merchantId);
    if (!profile) return null;

    // Calculate monthly payment
    const monthlyRate = (application.approvedRate || 0.045) / 12;
    const monthlyPayment = Math.ceil(
      (application.approvedAmount! * monthlyRate * Math.pow(1 + monthlyRate, application.termMonths)) /
      (Math.pow(1 + monthlyRate, application.termMonths) - 1)
    );

    const loan: LoanRecord = {
      id: generateLoanId(),
      merchantId,
      amount: application.approvedAmount!,
      interestRate: application.approvedRate!,
      termMonths: application.termMonths,
      monthlyPayment,
      startDate: Date.now(),
      endDate: Date.now() + application.termMonths * 30 * 24 * 60 * 60 * 1000,
      remainingBalance: application.approvedAmount!,
      status: 'ACTIVE',
      paymentHistory: [],
      loanType: application.loanType,
    };

    // Update profile
    profile.activeLoans.push(loan);
    profile.availableCredit -= loan.amount;

    // Update application status
    application.status = 'DISBURSED';

    creditProfileStore.set(merchantId, profile);

    return loan;
  }

  /**
   * Get credit profile
   */
  getProfile(merchantId: string): MerchantCreditProfile | null {
    return creditProfileStore.get(merchantId) || null;
  }

  /**
   * Get loan applications
   */
  getLoanApplications(merchantId: string): LoanApplication[] {
    return loanApplicationStore.get(merchantId) || [];
  }

  /**
   * Get scoring configuration
   */
  getScoringConfig(): typeof SCORING_CONFIG {
    return { ...SCORING_CONFIG };
  }
}

// Export singleton
export const merchantCreditService = new MerchantCreditService();

// Export types
export type {
  MerchantCreditProfile,
  CreditAssessment,
  LoanRecord,
  LoanApplication,
  FinancialMetrics,
  CreditGrade,
};
